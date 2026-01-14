import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter_webrtc/flutter_webrtc.dart';

class Signaling {
  Map<String, dynamic> configuration = {
    'iceServers': [
      {'urls': ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302']}
    ]
  };

  RTCPeerConnection? peerConnection;
  MediaStream? localStream;
  MediaStream? remoteStream; // This needs to be initialized before use
  String? roomId;
  MediaRecorder? _mediaRecorder;

  // --- MEDIA SETUP ---
  Future<void> openUserMedia(
    RTCVideoRenderer localVideo,
    RTCVideoRenderer remoteVideo,
  ) async {
    try {
      var stream = await navigator.mediaDevices.getUserMedia({
        'video': true,
        'audio': true,
      });

      localVideo.srcObject = stream;
      localStream = stream;
      
      // IMPORTANT: Initialize the remote renderer
      remoteVideo.srcObject = await createLocalMediaStream('key'); 
    } catch (e) {
      print("Camera Error: $e");
    }
  }

  // --- RECORDING ---
  void startRecording(MediaStream stream) {
    _mediaRecorder = MediaRecorder();
    // Using startWeb for better compatibility with Flutter Web
    _mediaRecorder!.startWeb(stream, mimeType: 'video/webm');
    print("Recording started...");
  }

  Future<void> stopRecording() async {
    if (_mediaRecorder != null) {
      await _mediaRecorder!.stop();
      _mediaRecorder = null;
    }
  }

  // --- ROOM CREATION (TEACHER) ---
  Future<String> createRoom(RTCVideoRenderer remoteRenderer) async {
    FirebaseFirestore db = FirebaseFirestore.instance;
    DocumentReference roomRef = db.collection('rooms').doc();

    peerConnection = await createPeerConnection(configuration);
    setupIceGathering(roomRef, "localCandidates");

    // NEW: Initialize remoteStream so it's not null
    remoteStream = await createLocalMediaStream('remoteStream');

    localStream?.getTracks().forEach((track) {
      peerConnection?.addTrack(track, localStream!);
    });

    peerConnection?.onTrack = (RTCTrackEvent event) {
      event.streams[0].getTracks().forEach((track) {
        remoteStream?.addTrack(track);
      });
      remoteRenderer.srcObject = remoteStream;
    };

    RTCSessionDescription offer = await peerConnection!.createOffer();
    await peerConnection!.setLocalDescription(offer);
    await roomRef.set({'offer': offer.toMap()});

    roomId = roomRef.id;

    roomRef.snapshots().listen((snapshot) async {
      var data = snapshot.data() as Map<String, dynamic>?;
      if (peerConnection?.getRemoteDescription() == null && data?['answer'] != null) {
        var answer = RTCSessionDescription(data!['answer']['sdp'], data['answer']['type']);
        await peerConnection?.setRemoteDescription(answer);
      }
    });

    listenForIceCandidates(roomRef, "remoteCandidates");
    return roomRef.id;
  }

  // --- JOINING ROOM (STUDENT) ---
  Future<void> joinRoom(String id, RTCVideoRenderer remoteRenderer) async {
    FirebaseFirestore db = FirebaseFirestore.instance;
    DocumentReference roomRef = db.collection('rooms').doc(id);
    var roomSnapshot = await roomRef.get();

    if (roomSnapshot.exists) {
      peerConnection = await createPeerConnection(configuration);
      setupIceGathering(roomRef, "remoteCandidates");

      // NEW: Initialize remoteStream here as well
      remoteStream = await createLocalMediaStream('remoteStream');

      localStream?.getTracks().forEach((track) {
        peerConnection?.addTrack(track, localStream!);
      });

      peerConnection?.onTrack = (RTCTrackEvent event) {
        event.streams[0].getTracks().forEach((track) {
          remoteStream?.addTrack(track);
        });
        remoteRenderer.srcObject = remoteStream;
      };

      var data = roomSnapshot.data() as Map<String, dynamic>;
      var offer = data['offer'];
      await peerConnection?.setRemoteDescription(RTCSessionDescription(offer['sdp'], offer['type']));

      var answer = await peerConnection!.createAnswer();
      await peerConnection!.setLocalDescription(answer);
      await roomRef.update({'answer': answer.toMap()});

      listenForIceCandidates(roomRef, "localCandidates");
    }
  }

  // --- HELPERS ---
  void setupIceGathering(DocumentReference roomRef, String collectionName) {
    peerConnection?.onIceCandidate = (RTCIceCandidate candidate) {
      roomRef.collection(collectionName).add(candidate.toMap());
    };
  }

  void listenForIceCandidates(DocumentReference roomRef, String collectionName) {
    roomRef.collection(collectionName).snapshots().listen((snapshot) {
      for (var change in snapshot.docChanges) {
        if (change.type == DocumentChangeType.added) {
          var data = change.doc.data() as Map<String, dynamic>;
          peerConnection!.addCandidate(RTCIceCandidate(data['candidate'], data['sdpMid'], data['sdpMLineIndex']));
        }
      }
    });
  }

  Future<void> hangUp(RTCVideoRenderer localVideo) async {
    localVideo.srcObject?.getTracks().forEach((track) => track.stop());
    remoteStream?.getTracks().forEach((track) => track.stop());
    if (peerConnection != null) peerConnection!.close();
    if (roomId != null) {
      await FirebaseFirestore.instance.collection('rooms').doc(roomId).delete();
    }
  }
}