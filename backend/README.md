# Video Conferencing Platform Backend

A production-ready Node.js backend for a video conferencing platform using mediasoup (SFU architecture) and Socket.IO for real-time communication. This backend provides authentication via Firebase, course management, scheduling, and WebRTC-based video conferencing capabilities.

## Features

- **🔐 Firebase Authentication**: Secure user authentication using Firebase ID tokens
- **📚 Course Management**: Create, update, delete courses (teachers)
- **🎓 Student Enrollment**: Students can enroll in courses
- **📅 Class Scheduling**: Teachers can schedule classes with automatic room generation
- **🎥 WebRTC Video Conferencing**: SFU (Selective Forwarding Unit) architecture using mediasoup
- **💬 Real-time Chat**: Socket.IO-based chat functionality
- **🔒 Role-based Access Control**: Student and teacher roles with appropriate permissions
- **📊 Dashboard Data**: Student dashboard with enrollment and schedule information

## Tech Stack

- **Runtime**: Node.js 20+
- **Framework**: Express.js
- **Real-time Communication**: Socket.IO
- **WebRTC SFU**: mediasoup 3.x
- **Database**: Firebase Firestore
- **Authentication**: Firebase Auth
- **Security**: Helmet, CORS, Rate Limiting

## Prerequisites

- Node.js 20+ (required for mediasoup 3.x)
- Firebase project with Firestore and Authentication enabled
- Firebase service account key

## Installation

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd video-conf/backend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up Firebase**:
   - Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)
   - Enable Firestore Database
   - Enable Authentication (Email/Password provider)
   - Generate a service account key:
     - Go to Project Settings > Service Accounts
     - Click "Generate new private key"
     - Download the JSON file

4. **Configure environment variables**:
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` with your Firebase configuration. You have two options:

   **Option 1: Environment Variables (Recommended)**
   
   Open the downloaded service account JSON file and copy the values to your `.env`:
   ```env
   PORT=3000
   NODE_ENV=development
   
   # Firebase Configuration
   FIREBASE_PROJECT_ID=your-firebase-project-id
   FIREBASE_PRIVATE_KEY_ID=your-private-key-id
   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nyour-private-key-content\n-----END PRIVATE KEY-----"
   FIREBASE_CLIENT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com
   FIREBASE_CLIENT_ID=your-client-id
   FIREBASE_CLIENT_X509_CERT_URL=https://www.googleapis.com/robot/v1/metadata/x509/your-service-account%40your-project.iam.gserviceaccount.com
   
   # mediasoup Configuration
   MEDIASOUP_LISTEN_IP=0.0.0.0
   MEDIASOUP_ANNOUNCED_IP=127.0.0.1
   MEDIASOUP_MIN_PORT=40000
   MEDIASOUP_MAX_PORT=49999
   
   # CORS Configuration
   CORS_ORIGINS=http://localhost:3000,http://localhost:5173
   ```

   **Option 2: JSON File (Legacy)**
   
   Save the JSON file as `serviceAccountKey.json` in the backend directory and use:
   ```env
   # Firebase Configuration
   FIREBASE_PROJECT_ID=your-firebase-project-id
   GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json
   ```

   **Important Notes:**
   - Option 1 is recommended for production deployments and cloud platforms
   - Option 2 is simpler for local development
   - The private key in Option 1 should include the full content with `\n` for line breaks
   - Keep your credentials secure and never commit them to version control

   **📋 For detailed Firebase setup instructions, see [FIREBASE_SETUP.md](./FIREBASE_SETUP.md)**
   **⚡ For quick setup, see [FIREBASE_QUICKSTART.md](./FIREBASE_QUICKSTART.md)**

5. **Set up Firestore Security Rules** (recommended):
   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       // Users can read/write their own profile
       match /users/{userId} {
         allow read, write: if request.auth != null && request.auth.uid == userId;
       }
       
       // Courses can be read by authenticated users, written by teachers
       match /courses/{courseId} {
         allow read: if request.auth != null;
         allow write: if request.auth != null && 
           get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'teacher';
       }
       
       // Enrollments can be managed by students and teachers
       match /enrollments/{enrollmentId} {
         allow read, write: if request.auth != null;
       }
       
       // Schedules can be read by authenticated users, written by teachers
       match /schedules/{scheduleId} {
         allow read: if request.auth != null;
         allow write: if request.auth != null && 
           get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'teacher';
           
         // Chat messages in schedules
         match /messages/{messageId} {
           allow read, write: if request.auth != null;
         }
       }
     }
   }
   ```

6. **Start the server**:
   ```bash
   # Development
   npm run dev
   
   # Production
   npm start
   ```

## API Documentation

### Authentication

All protected endpoints require a Firebase ID token in the Authorization header:
```
Authorization: Bearer <firebase-id-token>
```

### REST API Endpoints

#### Health Check
- `GET /health` - Server health status

#### User Profile
- `GET /api/me` - Get current user profile

#### Courses
- `POST /api/courses` - Create course (teacher only)
- `GET /api/courses` - List courses
- `GET /api/courses/:id` - Get specific course
- `PUT /api/courses/:id` - Update course (teacher only)
- `DELETE /api/courses/:id` - Delete course (teacher only)

#### Enrollments
- `POST /api/courses/:courseId/enroll` - Enroll in course (student only)
- `GET /api/enrollments` - List enrollments
- `GET /api/enrollments/my-courses` - Get student's enrolled courses
- `DELETE /api/enrollments/:id` - Unenroll from course

#### Schedules
- `POST /api/schedules` - Create schedule (teacher only)
- `GET /api/schedules` - List schedules
- `GET /api/schedules/:roomId` - Get schedule by room ID
- `PUT /api/schedules/:id` - Update schedule (teacher only)
- `DELETE /api/schedules/:id` - Delete schedule (teacher only)

#### Students
- `GET /api/students/me/schedule` - Get student's scheduled classes
- `GET /api/students/me/profile` - Get student profile
- `GET /api/students/me/dashboard` - Get student dashboard data

#### Teacher Access to Student Data
- `GET /api/students` - Get all students data with pagination (teacher access)
- `GET /api/students/:id` - Get specific student data by ID (teacher access)

### WebRTC & Socket.IO Events

#### Connection
```javascript
const socket = io('http://localhost:3000', {
  auth: {
    token: 'firebase-id-token'
  }
});
```

#### Room Management
- `createRoom` - Create a room (teacher only)
- `joinRoom` - Join a room
- `leaveRoom` - Leave a room

#### WebRTC Signaling
- `createWebRtcTransport` - Create transport for sending/receiving media
- `connectTransport` - Connect transport with DTLS parameters
- `produce` - Start producing audio/video
- `consume` - Start consuming audio/video from another user
- `resumeConsumer` - Resume paused consumer
- `getProducers` - Get list of available producers

#### Chat
- `chat:message` - Send chat message
- Event: `chat:message` - Receive chat message

#### Room Events
- Event: `userJoined` - User joined room
- Event: `userLeft` - User left room
- Event: `newProducer` - New media producer available

## Data Models

### Users Collection
```javascript
{
  id: "user-id",
  role: "student" | "teacher",
  name: "User Name",
  email: "user@example.com",
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z"
}
```

### Courses Collection
```javascript
{
  id: "course-id",
  name: "Course Name",
  description: "Course Description",
  createdBy: "teacher-id",
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z"
}
```

### Enrollments Collection
```javascript
{
  id: "enrollment-id",
  studentId: "student-id",
  courseId: "course-id",
  enrolledAt: "2024-01-01T00:00:00.000Z"
}
```

### Schedules Collection
```javascript
{
  id: "schedule-id",
  courseId: "course-id",
  teacherId: "teacher-id",
  date: "2024-01-01",
  time: "14:30",
  durationMinutes: 60,
  courseName: "Course Name",
  roomId: "uuid-room-id",
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z"
}
```

## Usage Examples

### Creating a User Profile

Users must be created in Firebase Authentication first, then their profile stored in Firestore:

```javascript
// After Firebase Auth signup, create user profile
const userProfile = {
  role: "student", // or "teacher"
  name: "John Doe",
  email: "john@example.com",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

await db.collection('users').doc(userId).set(userProfile);
```

### Creating a Course (Teacher)

```javascript
const response = await fetch('/api/courses', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${firebaseIdToken}`
  },
  body: JSON.stringify({
    name: 'Introduction to Web Development',
    description: 'Learn HTML, CSS, and JavaScript fundamentals'
  })
});
```

### Enrolling in a Course (Student)

```javascript
const response = await fetch(`/api/courses/${courseId}/enroll`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${firebaseIdToken}`
  }
});
```

### Scheduling a Class (Teacher)

```javascript
const response = await fetch('/api/schedules', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${firebaseIdToken}`
  },
  body: JSON.stringify({
    courseId: 'course-id',
    date: '2024-01-15',
    time: '14:30',
    durationMinutes: 90
  })
});
```

### Getting Student Schedule

```javascript
const response = await fetch('/api/students/me/schedule?upcoming=true', {
  headers: {
    'Authorization': `Bearer ${firebaseIdToken}`
  }
});
```

### WebRTC Client Integration

```javascript
const socket = io('http://localhost:3000', {
  auth: { token: firebaseIdToken }
});

// Join room
socket.emit('joinRoom', { roomId }, (response) => {
  if (response.success) {
    // Set up WebRTC with router capabilities
    const rtpCapabilities = response.rtpCapabilities;
    // Initialize mediasoup device...
  }
});

// Handle new producers
socket.on('newProducer', async ({ producerId, userId, kind }) => {
  // Create consumer for new producer
  socket.emit('consume', {
    transportId: recvTransport.id,
    producerId,
    rtpCapabilities: device.rtpCapabilities
  }, (response) => {
    if (response.success) {
      // Create consumer on receive transport
      // consumer = await recvTransport.consume({...response});
    }
  });
});

// Send chat message
socket.emit('chat:message', { text: 'Hello everyone!' }, (response) => {
  if (response.success) {
    console.log('Message sent successfully');
  }
});
```

## Production Deployment

### Environment Configuration

For production deployment, update your `.env`:

```env
NODE_ENV=production
PORT=3000
MEDIASOUP_ANNOUNCED_IP=your-public-ip-or-domain
CORS_ORIGINS=https://yourfrontend.com,https://app.yoursite.com
```

### TURN Server Configuration

For production use behind NAT/firewalls, configure TURN servers:

```javascript
// In mediasoup client configuration
const iceServers = [
  {
    urls: 'stun:stun.l.google.com:19302'
  },
  {
    urls: 'turn:your-turn-server.com:3478',
    username: 'username',
    credential: 'password'
  }
];
```

### Scaling Considerations

- **Socket.IO Scaling**: Use Redis adapter for multiple server instances
- **Room State**: Consider Redis for distributed room state management
- **Load Balancing**: Use sticky sessions for Socket.IO connections
- **Media Servers**: Deploy multiple mediasoup workers for horizontal scaling

### Docker Deployment

```dockerfile
FROM node:20-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3000
CMD ["npm", "start"]
```

## Security Considerations

1. **Firebase Rules**: Implement proper Firestore security rules
2. **Rate Limiting**: Configure appropriate rate limits for your use case
3. **CORS**: Restrict origins to your frontend domains
4. **HTTPS**: Use HTTPS in production for WebRTC compatibility
5. **Token Validation**: All Firebase ID tokens are validated server-side
6. **Input Validation**: All API inputs are validated and sanitized

## Testing

```bash
# Run tests (if implemented)
npm test

# Test specific endpoints
curl -X GET http://localhost:3000/health
```

## Troubleshooting

### Common Issues

1. **mediasoup Worker Creation Failed**:
   - Ensure Node.js 20+ is installed
   - Check that ports 40000-49999 are available
   - Verify system resources (CPU, memory)

2. **Firebase Authentication Errors**:
   - Verify service account key path
   - Check Firebase project ID in environment variables
   - Ensure Firestore and Authentication are enabled

3. **WebRTC Connection Issues**:
   - Configure TURN servers for production
   - Check firewall settings for UDP ports
   - Verify announced IP is accessible from clients

4. **Socket.IO Connection Failed**:
   - Check CORS configuration
   - Verify Firebase ID token is valid
   - Ensure user profile exists in Firestore

### Logs

Enable debug logging:
```env
LOG_LEVEL=debug
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For issues and questions:
1. Check the troubleshooting section
2. Review Firebase and mediasoup documentation
3. Open an issue in the repository