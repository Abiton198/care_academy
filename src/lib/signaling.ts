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

    // FIX 1: Prevent flickering. If stream already exists, just re-attach and return.
    if (this.localStream) {
      localVideo.srcObject = this.localStream;
      if (this.remoteStream) remoteVideo.srcObject = this.remoteStream;
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      this.localStream = stream;
      localVideo.srcObject = stream;
      
      this.remoteStream = new MediaStream();
      remoteVideo.srcObject = this.remoteStream;
    } catch (err) {
      console.error("User media access denied:", err);
      throw err;
    }
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
// Inside the listener that picks up the Student's answer
if (data.answer && this.peerConnection) {
  // Check the signaling state before applying the description
  if (this.peerConnection.signalingState === "have-local-offer") {
    const remoteDesc = new RTCSessionDescription(data.answer);
    await this.peerConnection.setRemoteDescription(remoteDesc);
    console.log("Remote description set successfully!");
  } else {
    console.warn(
      "Skipping setRemoteDescription: Connection is already in state", 
      this.peerConnection.signalingState
    );
  }
}

    // Listen for Student's ICE candidates (calleeCandidates)
    this.listenForRemoteCandidates(roomRef, "calleeCandidates");
  })}

/* ===========================================================
     JOINING ROOM (STUDENT)
   =========================================================== */
async joinRoom(roomId: string, userId: string, userName: string): Promise<void> {
  
  // 1. Safety Guard: Check if parameters exist
  if (!roomId || !userId) {
    console.error("Cannot join room: Missing roomId or userId");
    return;
  }

  const roomRef = doc(db, 'rooms', roomId);
  const roomSnapshot = await getDoc(roomRef);

  if (!roomSnapshot.exists()) {
    console.error("Room does not exist in Firestore");
    return;
  }
    
  const data = roomSnapshot.data();
  if (!data.offer) {
    console.error("No offer found in room. Teacher might not be live yet.");
    return;
  }

  // Set the internal roomId property
  this.roomId = roomId;

  // 2. Initialize PeerConnection
 // inside signaling.ts -> joinRoom()

// 1. Initialize the PeerConnection FIRST
this.peerConnection = new RTCPeerConnection(this.configuration);

// 2. Setup listeners and tracks immediately after initialization
this.setupIceGathering(roomRef, "calleeCandidates");

this.localStream?.getTracks().forEach(track => {
  this.peerConnection?.addTrack(track, this.localStream!);
});

// 3. NOW you can safely check the signalingState
if (this.peerConnection.signalingState === "stable") {
  await this.peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
  const answer = await this.peerConnection.createAnswer();
  await this.peerConnection.setLocalDescription(answer);
  
  await updateDoc(roomRef, { 
    answer: { sdp: answer.sdp, type: answer.type } 
  });
}
  // Handle incoming Teacher video/audio
  this.peerConnection.ontrack = (event) => {
    console.log("Receiving Teacher's stream...");
    event.streams[0].getTracks().forEach(track => {
      this.remoteStream?.addTrack(track);
    });
  };

  // 4. Register Student Participant in Firestore (Online List)
  const pRef = doc(db, "rooms", roomId, "participants", userId);
  await setDoc(pRef, {
    name: userName,
    role: 'student',
    joinedAt: serverTimestamp(),
    isHandRaised: false
  });

  // 5. WebRTC Handshake (Set Remote Offer -> Create Local Answer)
  if (this.peerConnection.signalingState === "stable") {
    // Set the Teacher's offer as the remote description
    await this.peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
    
    // Create our answer
    const answer = await this.peerConnection.createAnswer();
    
    // Set our answer as the local description
    await this.peerConnection.setLocalDescription(answer);

    // Save the answer to Firestore for the Teacher to pick up
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
    console.log("Signaling: Starting hangUp cleanup...");

    // 1. Stop all hardware tracks (Turn off camera light)
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        track.stop();
        console.log(`Stopped ${track.kind} track`);
      });
      this.localStream = null;
    }

    // 2. Clear remote stream tracks
    if (this.remoteStream) {
      this.remoteStream.getTracks().forEach(track => track.stop());
      this.remoteStream = null;
    }
    
    // 3. Close and nullify the Peer Connection
    if (this.peerConnection) {
      this.peerConnection.ontrack = null;
      this.peerConnection.onicecandidate = null;
      this.peerConnection.close();
      this.peerConnection = null;
    }

    this.roomId = null;
    console.log("Signaling: Cleanup complete.");
  }
}