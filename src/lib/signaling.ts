import { db } from "./firebaseConfig";
import { 
  collection, doc, setDoc, onSnapshot, updateDoc, getDoc, addDoc, serverTimestamp, deleteDoc 
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

  // --- MUTE CONTROLS ---
  toggleMic(isMuted: boolean) {
    this.localStream?.getAudioTracks().forEach(track => track.enabled = !isMuted);
  }

  toggleVideo(isVideoOff: boolean) {
    this.localStream?.getVideoTracks().forEach(track => track.enabled = !isVideoOff);
  }

  // --- MEDIA SETUP ---
async openUserMedia(localVideo: HTMLVideoElement, remoteVideo: HTMLVideoElement) {
  // Add this safety check:
  if (!localVideo || !remoteVideo) {
    throw new Error("Cannot open media: Video elements are null.");
  }

  const stream = await navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true,
  });

  this.localStream = stream;
  localVideo.srcObject = stream; // This is where line 32 was failing
  this.remoteStream = new MediaStream();
  remoteVideo.srcObject = this.remoteStream;
}



  // --- ROOM CREATION (TEACHER) ---
  async createRoom(roomId: string): Promise<void> {
    const roomRef = doc(db, 'rooms', roomId);
    this.roomId = roomId;

    this.peerConnection = new RTCPeerConnection(this.configuration);
    this.setupIceGathering(roomRef, "localCandidates");

    this.localStream?.getTracks().forEach(track => {
      this.peerConnection?.addTrack(track, this.localStream!);
    });

    this.peerConnection.ontrack = (event) => {
      event.streams[0].getTracks().forEach(track => {
        this.remoteStream?.addTrack(track);
      });
    };

    // Teacher Participant Registration
    const pRef = doc(collection(roomRef, 'participants'));
    this.currentParticipantId = pRef.id;
    await setDoc(pRef, {
      name: 'Teacher (Host)',
      isHandRaised: false,
      joinedAt: serverTimestamp(),
      role: 'teacher',
      isMuted: false,
    });

    const offer = await this.peerConnection.createOffer();
    await this.peerConnection.setLocalDescription(offer);

    await setDoc(roomRef, {
      offer: { sdp: offer.sdp, type: offer.type },
      isAllMuted: false
    });

    onSnapshot(roomRef, async (snapshot) => {
      const data = snapshot.data();
      if (!this.peerConnection?.currentRemoteDescription && data?.answer) {
        const answer = new RTCSessionDescription(data.answer);
        await this.peerConnection?.setRemoteDescription(answer);
      }
    });

    this.listenForIceCandidates(roomRef, "remoteCandidates");
  }

  
//  --- CHAT FUNCTIONALITY ---
async sendMessage(roomId: string, senderName: string, text: string) {
  const chatRef = collection(doc(db, 'rooms', roomId), 'chat');
  await addDoc(chatRef, {
    senderName,
    text,
    timestamp: serverTimestamp(),
  });
}

// --- SCREEN SHARING FUNCTIONALITY ---
async startScreenShare(videoElement: HTMLVideoElement) {
  try {
    const screenStream = await navigator.mediaDevices.getDisplayMedia({
      video: true,
      audio: true
    });
    
    // Replace the video track in the existing PeerConnection
    const videoTrack = screenStream.getVideoTracks()[0];
    const sender = this.peerConnection?.getSenders().find(s => s.track?.kind === 'video');
    
    if (sender) {
      sender.replaceTrack(videoTrack);
    }
    
    videoElement.srcObject = screenStream;

    // Handle user clicking "Stop Sharing" on the browser popup
    videoTrack.onended = () => {
      this.stopScreenShare(videoElement);
    };
  } catch (err) {
    console.error("Screen share failed", err);
  }
}

  // --- JOINING ROOM (STUDENT) ---
  async joinRoom(id: string): Promise<void> {
    const roomRef = doc(db, 'rooms', id);
    const roomSnapshot = await getDoc(roomRef);

    if (roomSnapshot.exists()) {
      this.roomId = id;
      this.peerConnection = new RTCPeerConnection(this.configuration);
      this.setupIceGathering(roomRef, "remoteCandidates");

      this.localStream?.getTracks().forEach(track => {
        this.peerConnection?.addTrack(track, this.localStream!);
      });

      this.peerConnection.ontrack = (event) => {
        event.streams[0].getTracks().forEach(track => {
          this.remoteStream?.addTrack(track);
        });
      };

      const pRef = doc(collection(roomRef, 'participants'));
      this.currentParticipantId = pRef.id;
      await setDoc(pRef, {
        name: `Student ${this.currentParticipantId.substring(0, 4)}`,
        isHandRaised: false,
        joinedAt: serverTimestamp(),
        role: 'student',
        isMuted: false,
      });

      const data = roomSnapshot.data();
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));

      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);

      await updateDoc(roomRef, { answer: { sdp: answer.sdp, type: answer.type } });
      this.listenForIceCandidates(roomRef, "localCandidates");
    }
  }

  private setupIceGathering(roomRef: any, collectionName: string) {
    this.peerConnection!.onicecandidate = (event) => {
      if (event.candidate) {
        addDoc(collection(roomRef, collectionName), event.candidate.toJSON());
      }
    };
  }

  private listenForIceCandidates(roomRef: any, collectionName: string) {
    onSnapshot(collection(roomRef, collectionName), (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
          const data = change.doc.data();
          this.peerConnection?.addCandidate(new RTCIceCandidate(data));
        }
      });
    });
  }

  // --- HANG UP / CLEAN UP ---
  async hangUp() {
  // 1. Stop all tracks in the local stream (turns off the physical camera/mic)
  if (this.localStream) {
    this.localStream.getTracks().forEach(track => {
      track.stop();
      console.log(`${track.kind} track stopped`);
    });
    this.localStream = null;
  }

  // 2. Close the Peer Connection
  if (this.peerConnection) {
    this.peerConnection.close();
    this.peerConnection = null;
  }
}}