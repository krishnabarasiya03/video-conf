# Flutter Integration Guide for Video Conference Platform

This guide explains how to integrate Flutter apps with the Video Conference Platform using Socket.IO and WebRTC.

## Prerequisites

- Flutter SDK installed
- Basic knowledge of Dart programming
- Understanding of WebRTC concepts

## Dependencies

Add the following dependencies to your `pubspec.yaml`:

```yaml
dependencies:
  flutter:
    sdk: flutter
  socket_io_client: ^2.0.3+1
  flutter_webrtc: ^0.9.48
  permission_handler: ^11.3.0
  uuid: ^4.3.3
  http: ^1.2.0
  
dev_dependencies:
  flutter_test:
    sdk: flutter
```

## Flutter Implementation

### 1. Permission Setup

#### Android (android/app/src/main/AndroidManifest.xml)
```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
<uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />
```

#### iOS (ios/Runner/Info.plist)
```xml
<key>NSCameraUsageDescription</key>
<string>This app needs camera access for video calls</string>
<key>NSMicrophoneUsageDescription</key>
<string>This app needs microphone access for video calls</string>
```

### 2. Basic WebRTC Service

Create `lib/services/webrtc_service.dart`:

```dart
import 'dart:async';
import 'package:flutter_webrtc/flutter_webrtc.dart';
import 'package:socket_io_client/socket_io_client.dart' as IO;
import 'package:http/http.dart' as http;
import 'dart:convert';

class WebRTCService {
  static const String SERVER_URL = 'http://your-server-url:3000';
  
  IO.Socket? socket;
  RTCPeerConnection? peerConnection;
  Map<String, RTCPeerConnection> peerConnections = {};
  MediaStream? localStream;
  List<RTCVideoRenderer> remoteRenderers = [];
  RTCVideoRenderer localRenderer = RTCVideoRenderer();
  
  // Callbacks
  Function(MediaStream)? onLocalStream;
  Function(MediaStream, String)? onRemoteStream;
  Function(String)? onStatusUpdate;

  Future<void> initialize({
    required String name,
    required String userId,
    String role = 'student',
  }) async {
    await localRenderer.initialize();
    
    // Connect to Socket.IO
    socket = IO.io(SERVER_URL, IO.OptionBuilder()
        .setTransports(['websocket'])
        .setAuth({
          'name': name,
          'userId': userId,
          'role': role,
        })
        .build());
        
    socket?.on('connect', (_) {
      onStatusUpdate?.call('Connected to server');
    });
    
    socket?.on('disconnect', (_) {
      onStatusUpdate?.call('Disconnected from server');
    });
    
    socket?.on('userJoined', (data) {
      onStatusUpdate?.call('${data['name']} joined');
    });
    
    socket?.on('userLeft', (data) {
      onStatusUpdate?.call('${data['name']} left');
      _removeRemotePeer(data['userId']);
    });
    
    socket?.connect();
  }

  Future<void> createRoom(String roomId) async {
    final completer = Completer<bool>();
    
    socket?.emit('createRoom', {'roomId': roomId}, (response) {
      if (response['success']) {
        onStatusUpdate?.call('Room created: $roomId');
        completer.complete(true);
      } else {
        onStatusUpdate?.call('Error: ${response['error']}');
        completer.complete(false);
      }
    });
    
    return completer.future;
  }

  Future<void> joinRoom(String roomId) async {
    final completer = Completer<bool>();
    
    socket?.emit('joinRoom', {'roomId': roomId}, (response) {
      if (response['success']) {
        onStatusUpdate?.call('Joined room: $roomId');
        completer.complete(true);
      } else {
        onStatusUpdate?.call('Error: ${response['error']}');
        completer.complete(false);
      }
    });
    
    return completer.future;
  }

  Future<void> startLocalVideo() async {
    try {
      final mediaConstraints = <String, dynamic>{
        'audio': true,
        'video': {
          'width': 640,
          'height': 480,
          'facingMode': 'user',
        }
      };
      
      localStream = await navigator.mediaDevices.getUserMedia(mediaConstraints);
      localRenderer.srcObject = localStream;
      onLocalStream?.call(localStream!);
      
      onStatusUpdate?.call('Local video started');
    } catch (e) {
      onStatusUpdate?.call('Error starting video: $e');
    }
  }

  Future<void> createPeerConnection(String peerId) async {
    try {
      final configuration = <String, dynamic>{
        'iceServers': [
          {'urls': 'stun:stun.l.google.com:19302'},
        ]
      };
      
      peerConnection = await createPeerConnection(configuration);
      
      // Add local stream
      if (localStream != null) {
        await peerConnection!.addStream(localStream!);
      }
      
      // Handle remote stream
      peerConnection!.onAddStream = (MediaStream stream) {
        final renderer = RTCVideoRenderer();
        renderer.initialize().then((_) {
          renderer.srcObject = stream;
          remoteRenderers.add(renderer);
          onRemoteStream?.call(stream, peerId);
        });
      };
      
      // Handle ICE candidates
      peerConnection!.onIceCandidate = (RTCIceCandidate candidate) {
        socket?.emit('iceCandidate', {
          'to': peerId,
          'candidate': candidate.toMap(),
        });
      };
      
      peerConnections[peerId] = peerConnection!;
    } catch (e) {
      onStatusUpdate?.call('Error creating peer connection: $e');
    }
  }

  void _removeRemotePeer(String peerId) {
    peerConnections[peerId]?.close();
    peerConnections.remove(peerId);
    
    // Remove associated renderer
    remoteRenderers.removeWhere((renderer) {
      renderer.dispose();
      return true; // Remove all for simplicity
    });
  }

  void sendMessage(String message) {
    socket?.emit('chat:message', {'text': message}, (response) {
      if (!response['success']) {
        onStatusUpdate?.call('Failed to send message');
      }
    });
  }

  Future<void> leaveRoom() async {
    socket?.emit('leaveRoom', null, (_) {
      onStatusUpdate?.call('Left room');
    });
    
    // Clean up connections
    for (var connection in peerConnections.values) {
      await connection.close();
    }
    peerConnections.clear();
    
    // Clean up renderers
    for (var renderer in remoteRenderers) {
      await renderer.dispose();
    }
    remoteRenderers.clear();
    
    // Stop local stream
    localStream?.getTracks().forEach((track) {
      track.stop();
    });
    localStream = null;
  }

  void dispose() {
    socket?.disconnect();
    socket?.dispose();
    localRenderer.dispose();
    leaveRoom();
  }
}
```

### 3. Main Video Conference Screen

Create `lib/screens/video_conference_screen.dart`:

```dart
import 'package:flutter/material.dart';
import 'package:flutter_webrtc/flutter_webrtc.dart';
import '../services/webrtc_service.dart';
import 'package:permission_handler/permission_handler.dart';

class VideoConferenceScreen extends StatefulWidget {
  @override
  _VideoConferenceScreenState createState() => _VideoConferenceScreenState();
}

class _VideoConferenceScreenState extends State<VideoConferenceScreen> {
  final WebRTCService _webrtcService = WebRTCService();
  final TextEditingController _nameController = TextEditingController();
  final TextEditingController _userIdController = TextEditingController();
  final TextEditingController _roomIdController = TextEditingController();
  final TextEditingController _messageController = TextEditingController();
  
  bool _connected = false;
  bool _inRoom = false;
  String _status = 'Not connected';
  List<String> _messages = [];
  String _selectedRole = 'student';

  @override
  void initState() {
    super.initState();
    _requestPermissions();
    _setupWebRTCCallbacks();
  }

  Future<void> _requestPermissions() async {
    await [
      Permission.camera,
      Permission.microphone,
    ].request();
  }

  void _setupWebRTCCallbacks() {
    _webrtcService.onStatusUpdate = (status) {
      setState(() {
        _status = status;
        if (status.contains('Connected')) _connected = true;
        if (status.contains('Disconnected')) _connected = false;
      });
    };

    _webrtcService.onLocalStream = (stream) {
      setState(() {}); // Trigger rebuild to show local video
    };

    _webrtcService.onRemoteStream = (stream, peerId) {
      setState(() {}); // Trigger rebuild to show remote video
    };
  }

  Future<void> _connect() async {
    if (_nameController.text.isEmpty || _userIdController.text.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Please enter name and user ID')),
      );
      return;
    }

    await _webrtcService.initialize(
      name: _nameController.text,
      userId: _userIdController.text,
      role: _selectedRole,
    );
  }

  Future<void> _createRoom() async {
    if (_roomIdController.text.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Please enter room ID')),
      );
      return;
    }

    final success = await _webrtcService.createRoom(_roomIdController.text);
    if (success) {
      setState(() {
        _inRoom = true;
      });
    }
  }

  Future<void> _joinRoom() async {
    if (_roomIdController.text.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Please enter room ID')),
      );
      return;
    }

    final success = await _webrtcService.joinRoom(_roomIdController.text);
    if (success) {
      setState(() {
        _inRoom = true;
      });
    }
  }

  Future<void> _startVideo() async {
    await _webrtcService.startLocalVideo();
  }

  void _sendMessage() {
    if (_messageController.text.isNotEmpty) {
      _webrtcService.sendMessage(_messageController.text);
      _messageController.clear();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Video Conference'),
      ),
      body: SingleChildScrollView(
        padding: EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // User Setup Section
            Card(
              child: Padding(
                padding: EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('User Setup', style: Theme.of(context).textTheme.headlineSmall),
                    SizedBox(height: 16),
                    TextField(
                      controller: _nameController,
                      decoration: InputDecoration(labelText: 'Name'),
                    ),
                    SizedBox(height: 8),
                    TextField(
                      controller: _userIdController,
                      decoration: InputDecoration(labelText: 'User ID'),
                    ),
                    SizedBox(height: 8),
                    DropdownButtonFormField<String>(
                      value: _selectedRole,
                      items: [
                        DropdownMenuItem(value: 'student', child: Text('Student')),
                        DropdownMenuItem(value: 'teacher', child: Text('Teacher')),
                      ],
                      onChanged: (value) {
                        setState(() {
                          _selectedRole = value!;
                        });
                      },
                      decoration: InputDecoration(labelText: 'Role'),
                    ),
                    SizedBox(height: 16),
                    ElevatedButton(
                      onPressed: _connected ? null : _connect,
                      child: Text('Connect to Server'),
                    ),
                  ],
                ),
              ),
            ),
            
            SizedBox(height: 16),
            
            // Room Management Section
            if (_connected)
              Card(
                child: Padding(
                  padding: EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Room Management', style: Theme.of(context).textTheme.headlineSmall),
                      SizedBox(height: 16),
                      TextField(
                        controller: _roomIdController,
                        decoration: InputDecoration(labelText: 'Room ID'),
                      ),
                      SizedBox(height: 16),
                      Row(
                        children: [
                          ElevatedButton(
                            onPressed: _inRoom ? null : _createRoom,
                            child: Text('Create Room'),
                          ),
                          SizedBox(width: 8),
                          ElevatedButton(
                            onPressed: _inRoom ? null : _joinRoom,
                            child: Text('Join Room'),
                          ),
                          SizedBox(width: 8),
                          if (_inRoom)
                            ElevatedButton(
                              onPressed: () {
                                _webrtcService.leaveRoom();
                                setState(() {
                                  _inRoom = false;
                                });
                              },
                              child: Text('Leave Room'),
                            ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            
            SizedBox(height: 16),
            
            // Video Section
            if (_inRoom)
              Card(
                child: Padding(
                  padding: EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Video Conference', style: Theme.of(context).textTheme.headlineSmall),
                      SizedBox(height: 16),
                      ElevatedButton(
                        onPressed: _startVideo,
                        child: Text('Start Video & Audio'),
                      ),
                      SizedBox(height: 16),
                      
                      // Local Video
                      Text('Local Video'),
                      Container(
                        width: 320,
                        height: 240,
                        decoration: BoxDecoration(border: Border.all()),
                        child: RTCVideoView(_webrtcService.localRenderer),
                      ),
                      
                      SizedBox(height: 16),
                      
                      // Remote Videos
                      Text('Remote Videos'),
                      Container(
                        height: 240,
                        child: ListView.builder(
                          scrollDirection: Axis.horizontal,
                          itemCount: _webrtcService.remoteRenderers.length,
                          itemBuilder: (context, index) {
                            return Container(
                              width: 320,
                              height: 240,
                              margin: EdgeInsets.only(right: 8),
                              decoration: BoxDecoration(border: Border.all()),
                              child: RTCVideoView(_webrtcService.remoteRenderers[index]),
                            );
                          },
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            
            SizedBox(height: 16),
            
            // Chat Section
            if (_inRoom)
              Card(
                child: Padding(
                  padding: EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Chat', style: Theme.of(context).textTheme.headlineSmall),
                      SizedBox(height: 16),
                      Container(
                        height: 200,
                        decoration: BoxDecoration(border: Border.all()),
                        child: ListView.builder(
                          itemCount: _messages.length,
                          itemBuilder: (context, index) {
                            return Padding(
                              padding: EdgeInsets.all(8),
                              child: Text(_messages[index]),
                            );
                          },
                        ),
                      ),
                      SizedBox(height: 8),
                      Row(
                        children: [
                          Expanded(
                            child: TextField(
                              controller: _messageController,
                              decoration: InputDecoration(hintText: 'Type a message...'),
                              onSubmitted: (_) => _sendMessage(),
                            ),
                          ),
                          SizedBox(width: 8),
                          ElevatedButton(
                            onPressed: _sendMessage,
                            child: Text('Send'),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            
            SizedBox(height: 16),
            
            // Status Section
            Card(
              child: Padding(
                padding: EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Status', style: Theme.of(context).textTheme.headlineSmall),
                    SizedBox(height: 8),
                    Text(_status),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  @override
  void dispose() {
    _webrtcService.dispose();
    _nameController.dispose();
    _userIdController.dispose();
    _roomIdController.dispose();
    _messageController.dispose();
    super.dispose();
  }
}
```

### 4. Live Courses Integration

Create `lib/services/live_courses_service.dart`:

```dart
import 'dart:convert';
import 'package:http/http.dart' as http;

class LiveCoursesService {
  static const String BASE_URL = 'http://your-server-url:3000/api';

  static Future<List<Map<String, dynamic>>> getLiveCourses({
    int limit = 50,
    int offset = 0,
    String status = 'active',
  }) async {
    final response = await http.get(
      Uri.parse('$BASE_URL/live-courses?limit=$limit&offset=$offset&status=$status'),
      headers: {'Content-Type': 'application/json'},
    );

    if (response.statusCode == 200) {
      final data = json.decode(response.body);
      return List<Map<String, dynamic>>.from(data['data']['courses']);
    } else {
      throw Exception('Failed to load live courses');
    }
  }

  static Future<Map<String, dynamic>> getCourse(String courseId) async {
    final response = await http.get(
      Uri.parse('$BASE_URL/live-courses/$courseId'),
      headers: {'Content-Type': 'application/json'},
    );

    if (response.statusCode == 200) {
      final data = json.decode(response.body);
      return data['data'];
    } else {
      throw Exception('Failed to load course');
    }
  }

  static Future<Map<String, dynamic>> joinCourse(
    String courseId,
    String userId,
    String name,
    String email,
  ) async {
    final response = await http.put(
      Uri.parse('$BASE_URL/live-courses/$courseId/join'),
      headers: {'Content-Type': 'application/json'},
      body: json.encode({
        'userId': userId,
        'name': name,
        'email': email,
      }),
    );

    if (response.statusCode == 200) {
      final data = json.decode(response.body);
      return data['data'];
    } else {
      throw Exception('Failed to join course');
    }
  }

  static Future<void> createCourse({
    required String title,
    required String description,
    required String instructorName,
    required String instructorId,
    required String scheduledTime,
    int duration = 60,
    int maxParticipants = 50,
    String category = 'general',
    List<String> tags = const [],
  }) async {
    final response = await http.post(
      Uri.parse('$BASE_URL/live-courses'),
      headers: {'Content-Type': 'application/json'},
      body: json.encode({
        'title': title,
        'description': description,
        'instructorName': instructorName,
        'instructorId': instructorId,
        'scheduledTime': scheduledTime,
        'duration': duration,
        'maxParticipants': maxParticipants,
        'category': category,
        'tags': tags,
      }),
    );

    if (response.statusCode != 201) {
      throw Exception('Failed to create course');
    }
  }
}
```

## Setup Instructions

### 1. Server Configuration

Make sure your server is running with the correct CORS settings to allow Flutter web/mobile access:

```javascript
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:8080', // Flutter web dev server
      'http://10.0.2.2:3000',  // Android emulator
    ];
    
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
};
```

### 2. Flutter Project Setup

1. Create a new Flutter project:
   ```bash
   flutter create video_conference_app
   cd video_conference_app
   ```

2. Add dependencies to `pubspec.yaml`

3. Copy the service and screen files

4. Update `lib/main.dart`:
   ```dart
   import 'package:flutter/material.dart';
   import 'screens/video_conference_screen.dart';

   void main() {
     runApp(MyApp());
   }

   class MyApp extends StatelessWidget {
     @override
     Widget build(BuildContext context) {
       return MaterialApp(
         title: 'Video Conference',
         theme: ThemeData(primarySwatch: Colors.blue),
         home: VideoConferenceScreen(),
       );
     }
   }
   ```

### 3. Testing

1. Start your backend server:
   ```bash
   cd backend
   npm run dev
   ```

2. Run the Flutter app:
   ```bash
   flutter run
   ```

3. For web testing:
   ```bash
   flutter run -d web-server --web-port 8080
   ```

## Important Notes

- Replace `your-server-url` with your actual server URL
- For production, use HTTPS for WebRTC compatibility
- Test on physical devices for best WebRTC performance
- Configure proper TURN servers for NAT traversal in production

## Troubleshooting

### Common Issues:

1. **WebRTC not working on web**: Enable camera/microphone permissions in browser
2. **Connection issues**: Check CORS settings and server URL
3. **Audio/Video not working**: Verify permissions are granted
4. **Build errors**: Ensure all dependencies are properly added

### Debug Steps:

1. Check browser console for errors (web)
2. Use `flutter logs` for mobile debugging
3. Verify server logs for connection issues
4. Test with multiple devices/browsers

This guide provides a complete foundation for integrating Flutter apps with your video conferencing platform. Customize as needed for your specific requirements.