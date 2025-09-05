# Video Conferencing Platform

A production-ready video conferencing platform with Node.js backend using mediasoup SFU architecture and Firebase for authentication and data management.

## Project Structure

```
video-conf/
├── backend/           # Node.js backend server
│   ├── src/
│   │   ├── config/    # Firebase and mediasoup configuration
│   │   ├── middleware/ # Authentication middleware
│   │   ├── routes/    # REST API routes
│   │   ├── services/  # Business logic services
│   │   ├── sockets/   # Socket.IO signaling
│   │   └── server.js  # Main server file
│   ├── package.json
│   ├── .env.example
│   └── README.md      # Backend documentation
└── README.md          # This file
```

## Features

- **🔐 Firebase Authentication**: Secure user authentication and authorization
- **📚 Course Management**: Teachers can create and manage courses
- **🎓 Student Enrollment**: Students can enroll in courses
- **📅 Class Scheduling**: Teachers can schedule classes with automatic room generation
- **🎥 WebRTC Video Conferencing**: SFU architecture using mediasoup for scalable video calls
- **💬 Real-time Chat**: Socket.IO-based chat functionality
- **🔒 Role-based Access Control**: Student and teacher roles with appropriate permissions
- **📊 API-driven**: RESTful API for all operations

## Tech Stack

### Backend
- **Runtime**: Node.js 20+
- **Framework**: Express.js
- **Real-time**: Socket.IO
- **WebRTC SFU**: mediasoup 3.x
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
   - **See [Firebase Setup Guide](./backend/FIREBASE_SETUP.md) for detailed instructions**

4. **Set up environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your Firebase configuration (see Firebase Setup Guide)
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