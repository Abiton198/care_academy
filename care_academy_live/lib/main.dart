import 'package:flutter/material.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:flutter_webrtc/flutter_webrtc.dart';
import 'signaling.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp();
  runApp(const MaterialApp(debugShowCheckedModeBanner: false, home: AcademyLivePage()));
}

class AcademyLivePage extends StatefulWidget {
  const AcademyLivePage({super.key});
  @override
  State<AcademyLivePage> createState() => _AcademyLivePageState();
}

class _AcademyLivePageState extends State<AcademyLivePage> {
  Signaling signaling = Signaling();
  RTCVideoRenderer _localRenderer = RTCVideoRenderer();
  RTCVideoRenderer _remoteRenderer = RTCVideoRenderer();
  String? roomId;
  bool _isHandRaised = false;
  bool _isMuted = false;
  bool _isTeacher = false;
  final TextEditingController _msgController = TextEditingController();
  final TextEditingController _roomIdController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _localRenderer.initialize();
    _remoteRenderer.initialize();
    signaling.openUserMedia(_localRenderer, _remoteRenderer);
  }

  // Updated main.dart for Dashboard MVP
void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp();
  runApp(MaterialApp(
    initialRoute: '/',
    routes: {
      '/': (context) => const TeacherDashboard(),
      '/classroom': (context) => const AcademyLivePage(),
    },
  ));
}

  // --- TEACHER: Mute All Logic ---
  void _muteAllStudents() async {
    if (roomId == null) return;
    await FirebaseFirestore.instance.collection('rooms').doc(roomId).update({'isAllMuted': true});
    ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text("All students muted")));
  }

  // --- LISTENERS ---
  void _setupRoomListeners(String id) {
    // 1. Listen for Hand Raises
    FirebaseFirestore.instance.collection('rooms').doc(id).collection('participants')
        .where('isHandRaised', isEqualTo: true).snapshots().listen((snap) {
      for (var change in snap.docChanges) {
        if (change.type == DocumentChangeType.added) {
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text("✋ ${change.doc['name']} raised hand!"), backgroundColor: Colors.orange));
        }
      }
    });

    // 2. Listen for "Mute All" command from Teacher
    FirebaseFirestore.instance.collection('rooms').doc(id).snapshots().listen((snap) {
      var data = snap.data() as Map<String, dynamic>?;
      if (data?['isAllMuted'] == true && !_isTeacher) {
        setState(() { _isMuted = true; });
        signaling.toggleMic(true);
      }
    });
  }

// --- COPY ROOM ID TO CLIPBOARD ---
  void _copyRoomId() {
  Clipboard.setData(ClipboardData(text: roomId ?? ""));
  ScaffoldMessenger.of(context).showSnackBar(
    const SnackBar(content: Text("Room ID copied to clipboard!")),
  );
}

  void _sendMessage() async {
    if (_msgController.text.isEmpty || roomId == null) return;
    await FirebaseFirestore.instance.collection('rooms').doc(roomId).collection('chat').add({
      'text': _msgController.text,
      'sender': signaling.currentParticipantId,
      'name': _isTeacher ? 'Teacher' : 'Student',
      'time': FieldValue.serverTimestamp(),
    });
    _msgController.clear();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text("Care Academy Live"), backgroundColor: Colors.blueAccent),
      body: Row(
        children: [
          Expanded(
            flex: 3,
            child: Container(
              color: Colors.black,
              child: Stack(
                children: [
                  RTCVideoView(_remoteRenderer),
                  Positioned(right: 20, top: 20, width: 120, height: 160, child: RTCVideoView(_localRenderer, mirror: true)),
                  if (roomId == null) Center(child: _buildJoinUI()),
                  Positioned(bottom: 20, left: 0, right: 0, child: _buildControlBar()),
                ],
              ),
            ),
          ),
          Container(width: 320, color: Colors.white, child: _buildSidebar()),
        ],
      ),
    );
  }

  Widget _buildControlBar() {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        CircleAvatar(
          backgroundColor: _isMuted ? Colors.red : Colors.white24,
          child: IconButton(
            icon: Icon(_isMuted ? Icons.mic_off : Icons.mic, color: Colors.white),
            onPressed: () {
              setState(() => _isMuted = !_isMuted);
              signaling.toggleMic(_isMuted);
            },
          ),
        ),
        if (_isTeacher) const SizedBox(width: 20),
        if (_isTeacher) ElevatedButton(onPressed: _muteAllStudents, style: ElevatedButton.styleFrom(backgroundColor: Colors.red), child: const Text("MUTE ALL")),
      ],
    );
  }

  Widget _buildSidebar() {
    return DefaultTabController(
      length: 2,
      child: Column(
        children: [
          Padding(padding: const EdgeInsets.all(8.0), child: ElevatedButton(
            onPressed: _toggleHand, 
            style: ElevatedButton.styleFrom(backgroundColor: _isHandRaised ? Colors.orange : Colors.blue),
            child: Text(_isHandRaised ? "LOWER HAND" : "RAISE HAND"),
          )),
          const TabBar(labelColor: Colors.blue, tabs: [Tab(text: "Chat"), Tab(text: "Students")]),
          Expanded(child: TabBarView(children: [_buildChatView(), _buildParticipantList()])),
        ],
      ),
    );
  }

  Widget _buildChatView() {
    if (roomId == null) return const Center(child: Text("Join to chat"));
    return Column(
      children: [
        Expanded(
          child: StreamBuilder<QuerySnapshot>(
            stream: FirebaseFirestore.instance.collection('rooms').doc(roomId).collection('chat').orderBy('time', descending: true).snapshots(),
            builder: (context, snap) {
              if (!snap.hasData) return const Center(child: CircularProgressIndicator());
              return ListView.builder(
                reverse: true,
                itemCount: snap.data!.docs.length,
                itemBuilder: (context, i) {
                  var data = snap.data!.docs[i];
                  return ListTile(title: Text(data['name'], style: const TextStyle(fontSize: 10, color: Colors.grey)), subtitle: Text(data['text']));
                },
              );
            },
          ),
        ),
        Padding(
          padding: const EdgeInsets.all(8.0),
          child: TextField(controller: _msgController, decoration: InputDecoration(hintText: "Type...", suffixIcon: IconButton(icon: const Icon(Icons.send), onPressed: _sendMessage))),
        )
      ],
    );
  }

  Widget _buildParticipantList() {
    if (roomId == null) return const Center(child: Text("Join a room"));
    return StreamBuilder<QuerySnapshot>(
      stream: FirebaseFirestore.instance.collection('rooms').doc(roomId).collection('participants').snapshots(),
      builder: (context, snap) {
        if (!snap.hasData) return const CircularProgressIndicator();
        return ListView.builder(
          itemCount: snap.data!.docs.length,
          itemBuilder: (context, i) {
            var data = snap.data!.docs[i];
            return ListTile(
              leading: Icon(Icons.person, color: data['isHandRaised'] ? Colors.orange : Colors.grey),
              title: Text(data['name']),
              trailing: data['isHandRaised'] ? const Icon(Icons.front_hand, color: Colors.orange) : null,
            );
          },
        );
      },
    );
  }

  // --- UI: Join/Create Room ---
  Widget _buildJoinUI() {
    return Card(child: Padding(padding: const EdgeInsets.all(20), child: Column(mainAxisSize: MainAxisSize.min, children: [
      TextField(controller: _roomIdController, decoration: const InputDecoration(hintText: "Room ID")),
      ElevatedButton(onPressed: () async {
        await signaling.joinRoom(_roomIdController.text, _remoteRenderer);
        setState(() { roomId = _roomIdController.text; _isTeacher = false; });
        _setupRoomListeners(roomId!);
      }, child: const Text("Join Student")),
      TextButton(onPressed: () async {
        String id = await signaling.createRoom(_remoteRenderer);
        setState(() { roomId = id; _isTeacher = true; });
        _setupRoomListeners(roomId!);
      }, child: const Text("Create as Teacher")),
    ])));
  }

  void _toggleHand() async {
    if (roomId == null || signaling.currentParticipantId == null) return;
    setState(() => _isHandRaised = !_isHandRaised);
    await FirebaseFirestore.instance.collection('rooms').doc(roomId).collection('participants').doc(signaling.currentParticipantId).update({'isHandRaised': _isHandRaised});
  }
}