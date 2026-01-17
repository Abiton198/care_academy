import { db } from "./firebaseConfig";
import { 
  collection, doc, setDoc, onSnapshot, updateDoc, getDoc, addDoc, serverTimestamp 
} from "firebase/firestore";

export class Signaling {
  private configuration = {
    iceServers: [
      { urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'] }
    ]
  };

  peerConnection: RTCPeerConnection | null = null;
  localStream: MediaStream | null = null;
  remoteStream: MediaStream | null = null;
  roomId: string | null = null;
  currentParticipantId: string | null = null;

  /* ===========================================================
     MEDIA CONTROLS
     =========================================================== */

  toggleMic(isMuted: boolean) {
    this.localStream?.getAudioTracks().forEach(track => track.enabled = !isMuted);
  }

  toggleVideo(isVideoOff: boolean) {
    this.localStream?.getVideoTracks().forEach(track => track.enabled = !isVideoOff);
  }

  async openUserMedia(localVideo: HTMLVideoElement, remoteVideo: HTMLVideoElement) {
    if (!localVideo || !remoteVideo) {
      throw new Error("Cannot open media: Video elements are null.");
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });

    this.localStream = stream;
    localVideo.srcObject = stream;
    this.remoteStream = new MediaStream();
    remoteVideo.srcObject = this.remoteStream;
  }

  /* ===========================================================
     ROOM CREATION (TEACHER)
     =========================================================== */

  async createRoom(roomId: string, initialData: any = {}) {
    const roomRef = doc(db, 'rooms', roomId);
    this.roomId = roomId;

    // 1. Initialize room document (Timer, Status, etc.)
    await setDoc(roomRef, {
      ...initialData,
      createdAt: serverTimestamp(),
      status: 'live'
    }, { merge: true });

    this.peerConnection = new RTCPeerConnection(this.configuration);
    
    // setupIceGathering saves candidates we generate to Firestore
    this.setupIceGathering(roomRef, "callerCandidates");

    // Push local tracks to peer connection
    this.localStream?.getTracks().forEach(track => {
      this.peerConnection?.addTrack(track, this.localStream!);
    });

    // Handle incoming remote tracks from student
    this.peerConnection.ontrack = (event) => {
      event.streams[0].getTracks().forEach(track => {
        this.remoteStream?.addTrack(track);
      });
    };

    // Register Teacher in participants sub-collection
    const pRef = doc(collection(roomRef, 'participants'));
    this.currentParticipantId = pRef.id;
    await setDoc(pRef, {
      name: initialData.teacherName || 'Teacher',
      role: 'teacher',
      joinedAt: serverTimestamp(),
    });

    // Create SDP Offer
    const offer = await this.peerConnection.createOffer();
    await this.peerConnection.setLocalDescription(offer);

    await updateDoc(roomRef, {
      offer: { sdp: offer.sdp, type: offer.type }
    });

    // Listen for Student's Answer
onSnapshot(roomRef, async (snapshot) => {
  const data = snapshot.data();
  if (!data) return;

  // FIX: Only set remote description if we are in 'have-local-offer' state
  // and the data contains an answer we haven't processed yet.
  if (
    this.peerConnection?.signalingState === "have-local-offer" && 
    data.answer
  ) {
    try {
      const answer = new RTCSessionDescription(data.answer);
      await this.peerConnection.setRemoteDescription(answer);
      console.log("Teacher: Remote description (answer) set successfully.");
    } catch (err) {
      console.error("Teacher: Failed to set remote description:", err);
    }
  }
});

    // Listen for Student's ICE candidates (calleeCandidates)
    this.listenForRemoteCandidates(roomRef, "calleeCandidates");
  }

  
/* ===========================================================
     JOINING ROOM (STUDENT)
     =========================================================== */
  async joinRoom(id: string): Promise<void> {
    const roomRef = doc(db, 'rooms', id);
    const roomSnapshot = await getDoc(roomRef);

    // 1. Safety Checks
    if (!roomSnapshot.exists()) {
        console.error("Room does not exist");
        return;
    }
    
    const data = roomSnapshot.data();
    if (!data.offer) {
        console.error("No offer found in room");
        return;
    }

    this.roomId = id;

    // 2. Initialize PeerConnection FIRST
    this.peerConnection = new RTCPeerConnection(this.configuration);
    
    // 3. Setup ICE & Tracks (Do this before setting descriptions)
    this.setupIceGathering(roomRef, "calleeCandidates");

    this.localStream?.getTracks().forEach(track => {
      this.peerConnection?.addTrack(track, this.localStream!);
    });

    this.peerConnection.ontrack = (event) => {
      event.streams[0].getTracks().forEach(track => {
        this.remoteStream?.addTrack(track);
      });
    };

    // 4. Register Student Participant
    const pRef = doc(collection(roomRef, 'participants'));
    this.currentParticipantId = pRef.id;
    await setDoc(pRef, {
      name: 'Student',
      role: 'student',
      joinedAt: serverTimestamp(),
    });

    // 5. WebRTC Handshake (Offer -> Answer)
    // We check for 'stable' because that is the default state of a new connection
    if (this.peerConnection.signalingState === "stable") {
      // Set the Teacher's offer as the remote description
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
      
      // Create our answer
      const answer = await this.peerConnection.createAnswer();
      
      // Set our answer as the local description
      await this.peerConnection.setLocalDescription(answer);

      // Save the answer to Firestore for the Teacher to find
      await updateDoc(roomRef, { 
        answer: { sdp: answer.sdp, type: answer.type } 
      });
    }

    // 6. Start listening for Teacher's ICE candidates
    this.listenForRemoteCandidates(roomRef, "callerCandidates");
  }


  /* ===========================================================
     WEBRTC UTILITIES (ICE)
     =========================================================== */

  private setupIceGathering(roomRef: any, collectionName: string) {
    if (!this.peerConnection) return;
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        const candidatesCollection = collection(roomRef, collectionName);
        addDoc(candidatesCollection, event.candidate.toJSON());
      }
    };
  }

  private listenForRemoteCandidates(roomRef: any, collectionName: string) {
    const candidatesCollection = collection(roomRef, collectionName);
    onSnapshot(candidatesCollection, (snapshot) => {
      snapshot.docChanges().forEach(async (change) => {
        if (change.type === 'added') {
          const data = change.doc.data();
          // PeerConnection must be initialized and have a RemoteDescription before adding candidates
          if (this.peerConnection && this.peerConnection.remoteDescription) {
            try {
              await this.peerConnection.addIceCandidate(new RTCIceCandidate(data));
            } catch (e) {
              console.error("Error adding ice candidate", e);
            }
          }
        }
      });
    });
  }

  /* ===========================================================
     EXTRAS: CHAT, SCREENSHARE, TIMER
     =========================================================== */

  async sendMessage(roomId: string, senderName: string, text: string) {
    const chatRef = collection(doc(db, 'rooms', roomId), 'chat');
    await addDoc(chatRef, {
      senderName,
      text,
      timestamp: serverTimestamp(),
    });
  }

  async startScreenShare(videoElement: HTMLVideoElement) {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const videoTrack = screenStream.getVideoTracks()[0];
      const sender = this.peerConnection?.getSenders().find(s => s.track?.kind === 'video');
      
      if (sender) sender.replaceTrack(videoTrack);
      videoElement.srcObject = screenStream;

      videoTrack.onended = () => this.stopScreenShare(videoElement);
    } catch (err) {
      console.error("Screen share failed", err);
    }
  }

  async stopScreenShare(videoElement: HTMLVideoElement) {
    const videoTrack = this.localStream?.getVideoTracks()[0];
    const sender = this.peerConnection?.getSenders().find(s => s.track?.kind === 'video');
    if (sender && videoTrack) sender.replaceTrack(videoTrack);
    videoElement.srcObject = this.localStream;
  }

  async extendRoomTimer(roomId: string, extraMinutes: number, currentEndAt: number) {
    const newEndAt = currentEndAt + extraMinutes * 60000;
    const roomRef = doc(db, "rooms", roomId);
    await updateDoc(roomRef, { endAt: newEndAt });
  }

  /* ===========================================================
     CLEANUP
     =========================================================== */

  async hangUp() {
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }
    
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }
    this.roomId = null;
  }
}