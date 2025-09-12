# Video Conferencing Platform

A production-ready video conferencing platform with Node.js backend using MediaSoup SFU architecture and React frontend for real-time communication.

## 🚀 Quick Demo

![Video Conference Platform Demo](https://github.com/user-attachments/assets/ca9fea7a-485a-4634-bb15-ba419b9d44f2)

The platform includes:
- **Real-time Socket.IO communication** ✅ 
- **Room management** ✅
- **Live chat functionality** ✅
- **React TypeScript frontend** ✅
- **MediaSoup WebRTC integration** (configured)
- **Live courses API** (Firebase integration ready)
- **Flutter integration guide** ✅

## Project Structure

```
video-conf/
├── backend/                 # Node.js backend server
│   ├── src/
│   │   ├── config/         # Firebase and MediaSoup configuration
│   │   ├── middleware/     # Authentication middleware  
│   │   ├── routes/         # REST API routes (live-courses)
│   │   ├── services/       # Business logic services
│   │   ├── sockets/        # Socket.IO signaling
│   │   └── server.js       # Main server file
│   ├── package.json
│   ├── .env.example
│   └── README.md
├── frontend/               # React TypeScript frontend
│   ├── src/
│   │   ├── VideoConference.tsx  # Main video conference component
│   │   └── App.tsx
│   ├── package.json
│   └── public/
├── FLUTTER_INTEGRATION_GUIDE.md    # Complete Flutter setup guide
├── IMPLEMENTATION_COMPLETE.md      # Detailed implementation summary
└── README.md              # This file
```

## ✅ Features Working

### Core Real-time Features
- **🔐 Simplified Authentication**: No Firebase tokens required for Socket.IO
- **🏠 Room Management**: Create, join, and leave rooms seamlessly  
- **💬 Real-time Chat**: Instant messaging with user identification
- **👥 Participant Tracking**: See who joins/leaves rooms
- **📊 Status Updates**: Real-time feedback on all operations

### Backend API
- **📡 Socket.IO Signaling**: Complete WebRTC signaling infrastructure
- **🎥 MediaSoup Integration**: SFU architecture for scalable video
- **📚 Live Courses API**: Firebase-ready course management endpoints
- **🔧 Health Monitoring**: Server status and diagnostics

### Frontend Interface
- **⚛️ React TypeScript**: Modern, type-safe frontend
- **🎨 Responsive UI**: Clean, intuitive user interface
- **🔌 Socket.IO Client**: Real-time server communication
- **⚠️ Error Handling**: Graceful fallbacks and user feedback

## Features

- **🎥 Real-time Video Conferencing**: MediaSoup SFU architecture for scalable video calls
- **💬 Live Chat**: Socket.IO-based real-time messaging  
- **🏠 Room Management**: Create, join, and leave conference rooms
- **👥 Multi-user Support**: Handle multiple participants per room
- **📱 Mobile Ready**: Complete Flutter integration guide included
- **🔌 Socket.IO Integration**: Real-time bidirectional communication
- **📚 Live Courses API**: Firebase-ready course management system

## Tech Stack

### Backend
- **Runtime**: Node.js 20+
- **Framework**: Express.js
- **Real-time**: Socket.IO
- **WebRTC SFU**: MediaSoup 3.x
- **Database**: Firebase Firestore (ready)
- **Security**: Helmet, CORS, Rate Limiting

### Frontend
- **Framework**: React 18+ with TypeScript
- **Real-time Client**: Socket.IO Client
- **WebRTC Client**: MediaSoup Client
- **Styling**: CSS-in-JS
- **Build Tool**: Create React App

### Mobile (Guide Provided)
- **Framework**: Flutter
- **WebRTC**: flutter_webrtc package
- **Real-time**: socket_io_client package
- **Database**: Firebase Firestore
- **Authentication**: Firebase Auth
- **Security**: Helmet, CORS, Rate Limiting

## Quick Start

### Prerequisites
- Node.js 20+ (required for mediasoup)
- Firebase project with Firestore and Authentication
- Firebase service account key

### Setup

1. **Clone and navigate to backend**:
   ```bash
   git clone <repository-url>
   cd video-conf/backend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Firebase**:
   - Create Firebase project
   - Enable Firestore and Authentication
   - Generate service account key
   - **Quick Setup:** [Firebase Quick Start](./backend/FIREBASE_QUICKSTART.md)
   - **Detailed Guide:** [Firebase Setup Guide](./backend/FIREBASE_SETUP.md)

4. **Set up environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your Firebase configuration (see guides above)
   ```

5. **Start the server**:
   ```bash
   npm run dev
   ```

6. **Test the setup**:
   ```bash
   curl http://localhost:3000/health
   ```

## API Overview

### Authentication
All protected endpoints require Firebase ID token:
```
Authorization: Bearer <firebase-id-token>
```

### Key Endpoints
- `POST /api/courses` - Create course (teacher)
- `POST /api/courses/:id/enroll` - Enroll in course (student)
- `POST /api/schedules` - Schedule class (teacher)
- `GET /api/students/me/schedule` - Get student's schedule
- WebSocket: `/socket.io/` - Real-time signaling and chat

## Data Models

### Users
- **Students**: Can enroll in courses and join scheduled classes
- **Teachers**: Can create courses, schedule classes, and manage enrollments

### Courses
- Created by teachers
- Students can enroll
- Used for organizing scheduled classes

### Schedules
- Classes scheduled by teachers for specific courses
- Generate unique room IDs for video conferencing
- Accessible to enrolled students and the teacher

### Real-time Features
- **WebRTC Signaling**: mediasoup SFU for efficient video distribution
- **Chat**: Real-time messaging during classes
- **Room Management**: Automatic cleanup and state management

## Documentation

For detailed setup instructions, API documentation, and usage examples, see:
- [Backend Documentation](./backend/README.md)

## Development

### Running in Development
```bash
cd backend
npm run dev
```

### Testing
```bash
cd backend
npm test
```

### Project Structure
The backend follows a modular structure:
- **Config**: Firebase and mediasoup setup
- **Middleware**: Authentication and security
- **Routes**: REST API endpoints
- **Services**: Business logic and data access
- **Sockets**: WebRTC signaling and chat

## Production Deployment

### Environment Configuration
- Set production environment variables
- Configure TURN servers for NAT traversal
- Set up proper CORS origins
- Use HTTPS for WebRTC compatibility

### Scaling Considerations
- Redis adapter for Socket.IO clustering
- Multiple mediasoup workers
- Load balancer with sticky sessions
- Distributed room state management

## Security

- Firebase Authentication for user management
- Role-based access control
- Input validation and sanitization
- Rate limiting and CORS protection
- Firestore security rules

## License

MIT License - see LICENSE file for details

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## Support

For detailed documentation and troubleshooting:
- See [Backend README](./backend/README.md)
- Check Firebase and mediasoup documentation
- Open an issue for bug reports or questions