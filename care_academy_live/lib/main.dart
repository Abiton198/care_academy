import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_webrtc/flutter_webrtc.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'firebase_options.dart';
import 'signaling.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp(options: DefaultFirebaseOptions.currentPlatform);
  runApp(const MaterialApp(
    debugShowCheckedModeBanner: false,
    home: AcademyLivePage(),
  ));
}

class AcademyLivePage extends StatefulWidget {
  const AcademyLivePage({super.key});
  @override
  State<AcademyLivePage> createState() => _AcademyLivePageState();
}

class _AcademyLivePageState extends State<AcademyLivePage> {
  Signaling signaling = Signaling();
  final RTCVideoRenderer _localRenderer = RTCVideoRenderer();
  final RTCVideoRenderer _remoteRenderer = RTCVideoRenderer();
  
  String? roomId;
  bool isRecording = false;
  TextEditingController textController = TextEditingController();
  TextEditingController chatController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _localRenderer.initialize();
    _remoteRenderer.initialize();
    signaling.openUserMedia(_localRenderer, _remoteRenderer);
  }

  @override
  void dispose() {
    _localRenderer.dispose();
    _remoteRenderer.dispose();
    textController.dispose();
    chatController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF5F7FA),
      appBar: AppBar(
        title: const Text("Care Academy Live Lesson"),
        backgroundColor: Colors.blueAccent,
        actions: [
          if (isRecording)
            const Padding(
              padding: EdgeInsets.symmetric(horizontal: 15),
              child: Icon(Icons.circle, color: Colors.red),
            )
        ],
      ),
      body: Column(
        children: [
          Expanded(
            child: Row(
              children: [
                // 1. VIDEO AREA
                Expanded(
                  flex: 3,
                  child: Row(
                    children: [
                      Expanded(child: _videoCard("Teacher (Local)", _localRenderer)),
                      Expanded(child: _videoCard("Student (Remote)", _remoteRenderer)),
                    ],
                  ),
                ),
                // 2. CHAT SIDEBAR
                Container(
                  width: 300,
                  color: Colors.white,
                  child: Column(
                    children: [
                      const Padding(
                        padding: EdgeInsets.all(8.0),
                        child: Text("Live Chat", style: TextStyle(fontWeight: FontWeight.bold)),
                      ),
                      Expanded(child: _buildChatList()),
                      _buildChatInput(),
                    ],
                  ),
                ),
              ],
            ),
          ),
          _buildControlPanel(),
        ],
      ),
    );
  }

  Widget _buildChatList() {
    if (roomId == null) return const Center(child: Text("Join a room to chat"));
    return StreamBuilder<QuerySnapshot>(
      stream: FirebaseFirestore.instance
          .collection('rooms')
          .doc(roomId)
          .collection('chat')
          .orderBy('created', descending: true)
          .snapshots(),
      builder: (context, snapshot) {
        if (!snapshot.hasData) return const Center(child: CircularProgressIndicator());
        return ListView.builder(
          reverse: true,
          itemCount: snapshot.data!.docs.length,
          itemBuilder: (context, index) {
            var data = snapshot.data!.docs[index].data() as Map<String, dynamic>;
            return ListTile(
              title: Text(data['sender'] ?? 'User', style: const TextStyle(fontSize: 10, color: Colors.blue)),
              subtitle: Text(data['text'] ?? ''),
            );
          },
        );
      },
    );
  }

  Widget _buildChatInput() {
    return Container(
      padding: const EdgeInsets.all(8),
      color: Colors.grey[100],
      child: Row(
        children: [
          Expanded(
            child: TextField(
              controller: chatController,
              decoration: const InputDecoration(hintText: "Type message...", border: InputBorder.none),
            ),
          ),
          IconButton(
            icon: const Icon(Icons.send),
            onPressed: () {
              if (chatController.text.isNotEmpty && roomId != null) {
                FirebaseFirestore.instance.collection('rooms').doc(roomId).collection('chat').add({
                  'text': chatController.text,
                  'sender': 'Academy User',
                  'created': FieldValue.serverTimestamp(),
                });
                chatController.clear();
              }
            },
          )
        ],
      ),
    );
  }

  Widget _buildControlPanel() {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: const BoxDecoration(color: Colors.white),
      child: Column(
        children: [
          if (roomId != null)
            Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: SelectableText("Room ID: $roomId", style: const TextStyle(fontWeight: FontWeight.bold)),
            ),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
            children: [
              ElevatedButton.icon(
                onPressed: () async {
                  roomId = await signaling.createRoom(_remoteRenderer);
                  setState(() {});
                },
                icon: const Icon(Icons.add),
                label: const Text("Create"),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: TextField(
                  controller: textController,
                  decoration: const InputDecoration(hintText: "Enter ID", isDense: true),
                ),
              ),
              const SizedBox(width: 10),
              ElevatedButton(
                onPressed: () {
                  roomId = textController.text;
                  signaling.joinRoom(roomId!, _remoteRenderer);
                  setState(() {});
                },
                child: const Text("Join"),
              ),
              const SizedBox(width: 10),
              IconButton(
                icon: Icon(isRecording ? Icons.stop_circle : Icons.fiber_manual_record, color: Colors.red),
                onPressed: () async {
                  if (!isRecording) {
                    signaling.startRecording(signaling.localStream!);
                  } else {
                    await signaling.stopRecording();
                  }
                  setState(() => isRecording = !isRecording);
                },
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _videoCard(String label, RTCVideoRenderer renderer) {
    return Container(
      margin: const EdgeInsets.all(4),
      decoration: BoxDecoration(color: Colors.black, borderRadius: BorderRadius.circular(8)),
      child: RTCVideoView(renderer, mirror: label.contains("Local")),
    );
  }
}