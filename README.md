# Video Conferencing Platform

A production-ready video conferencing platform with Node.js backend using mediasoup SFU architecture, React TypeScript frontend, and Firebase for authentication and data management.

## Project Structure

```
video-conf/
├── backend/                 # Node.js backend with mediasoup SFU
│   ├── src/
│   │   ├── config/         # Firebase and mediasoup configuration
│   │   ├── middleware/     # Authentication middleware
│   │   ├── routes/         # API routes (courses, schedules, etc.)
│   │   ├── services/       # Business logic services
│   │   └── sockets/        # Socket.IO signaling for WebRTC
│   └── README.md
├── frontend/               # React TypeScript frontend
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Login, dashboards, meeting room
│   │   ├── hooks/          # Authentication hooks
│   │   ├── services/       # API integration
│   │   └── types/          # TypeScript definitions
│   └── README.md
└── README.md
```

## Features

### 🔐 Authentication & User Management
- **Firebase Authentication**: Secure user registration and login
- **Role-based Access**: Students and teachers with different permissions
- **User Profiles**: Name, email, and role management

### 📚 Course Management
- **Teacher Features**: Create and manage courses
- **Student Features**: Browse and enroll in available courses
- **Course Information**: Name, description, and enrollment tracking

### 📅 Class Scheduling
- **Teacher Scheduling**: Create classes with date, time, and duration
- **Automatic Room Generation**: Unique room IDs for each scheduled class
- **Student Access**: View and join scheduled classes

### 🎥 Video Conferencing
- **SFU Architecture**: Scalable video distribution using mediasoup
- **WebRTC Integration**: Real-time video and audio communication
- **Media Controls**: Camera, microphone, and screen sharing
- **Room Management**: Automatic cleanup and state management

### 💬 Real-time Features
- **Chat System**: In-meeting text messaging
- **Socket.IO Integration**: Real-time events and notifications
- **Participant Management**: Join/leave notifications

### 📊 Dashboards
- **Student Dashboard**: Enrolled courses, upcoming classes, statistics
- **Teacher Dashboard**: Created courses, scheduled classes, management tools

## Tech Stack

### Backend
- **Runtime**: Node.js 20+
- **Framework**: Express.js
- **Real-time**: Socket.IO
- **WebRTC SFU**: mediasoup 3.x
- **Database**: Firebase Firestore
- **Authentication**: Firebase Auth
- **Security**: Helmet, CORS, Rate Limiting

### Frontend
- **Framework**: React 18 with TypeScript
- **UI Library**: Material-UI (MUI) v5
- **State Management**: React Context
- **Routing**: React Router
- **HTTP Client**: Axios
- **Real-time**: Socket.IO Client

## Quick Start

### Prerequisites
- Node.js 20+ (required for mediasoup)
- Firebase project with Firestore and Authentication
- Firebase service account key

### Setup

1. **Clone the repository:**
```bash
git clone <repository-url>
cd video-conf
```

2. **Set up Firebase project:**
   - Create a Firebase project at https://console.firebase.google.com
   - Enable Authentication (Email/Password)
   - Enable Firestore Database
   - Download service account key

3. **Backend Setup:**
```bash
cd backend
npm install
cp .env.example .env
# Update .env with your Firebase credentials
npm run dev
```

4. **Frontend Setup:**
```bash
cd frontend
npm install
cp .env.example .env
# Update .env with your Firebase web app config
npm start
```

### Environment Configuration

#### Backend (.env)
```env
PORT=3000
NODE_ENV=development

# Firebase Configuration
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
FIREBASE_CLIENT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com

# mediasoup Configuration
MEDIASOUP_LISTEN_IP=0.0.0.0
MEDIASOUP_ANNOUNCED_IP=127.0.0.1
MEDIASOUP_MIN_PORT=40000
MEDIASOUP_MAX_PORT=49999

# CORS Configuration
CORS_ORIGINS=http://localhost:3000
```

#### Frontend (.env)
```env
REACT_APP_FIREBASE_API_KEY=your-firebase-api-key
REACT_APP_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your-project-id
REACT_APP_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
REACT_APP_FIREBASE_APP_ID=your-app-id

REACT_APP_API_BASE_URL=http://localhost:3000
REACT_APP_SOCKET_URL=http://localhost:3000
```

## API Overview

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/me` - Get user profile

### Courses
- `GET /api/courses` - List courses
- `POST /api/courses` - Create course (teachers only)
- `PUT /api/courses/:id` - Update course
- `DELETE /api/courses/:id` - Delete course

### Enrollments
- `POST /api/enrollments/:courseId/enroll` - Enroll in course (students only)
- `GET /api/enrollments` - Get user enrollments
- `GET /api/enrollments/:courseId` - Get course enrollments (teachers only)

### Schedules
- `GET /api/schedules` - List schedules
- `POST /api/schedules` - Create schedule (teachers only)
- `GET /api/schedules/:roomId` - Get schedule by room ID

### Students
- `GET /api/students/me/dashboard` - Student dashboard data
- `GET /api/students/me/schedule` - Student schedule

## Data Models

### Users
```json
{
  "uid": "firebase-user-id",
  "name": "John Doe",
  "email": "john@example.com",
  "role": "student|teacher",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

### Courses
```json
{
  "id": "course-id",
  "name": "Introduction to Programming",
  "description": "Learn the basics of programming",
  "createdBy": "teacher-uid",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

### Schedules
```json
{
  "id": "schedule-id",
  "courseId": "course-id",
  "teacherId": "teacher-id",
  "date": "2024-01-01",
  "time": "14:30",
  "durationMinutes": 60,
  "courseName": "Course Name",
  "roomId": "uuid-room-id",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

### Enrollments
```json
{
  "id": "enrollment-id",
  "studentId": "student-uid",
  "courseId": "course-id",
  "enrolledAt": "2024-01-01T00:00:00.000Z"
}
```

## Usage Flow

### For Students

1. **Register/Login**: Create account with student role
2. **Browse Courses**: View available courses on dashboard
3. **Enroll**: Click "Enroll in Course" to join courses
4. **Attend Classes**: Join scheduled classes via "Join" button
5. **Video Meeting**: Participate in video calls with controls

### For Teachers

1. **Register/Login**: Create account with teacher role
2. **Create Courses**: Add new courses with name and description
3. **Schedule Classes**: Set date, time, and duration for classes
4. **Start Classes**: Begin video meetings for scheduled sessions
5. **Manage Students**: View enrolled students and participants

## Documentation

For detailed setup instructions, API documentation, and usage examples:
- [Backend Documentation](./backend/README.md)
- [Frontend Documentation](./frontend/README.md)

## Development

### Running Tests

Backend:
```bash
cd backend
npm test
```

Frontend:
```bash
cd frontend
npm test
```

### Building for Production

Backend:
```bash
cd backend
npm start
```

Frontend:
```bash
cd frontend
npm run build
```

## Production Deployment

### Environment Configuration

For production deployment, update environment variables:
- Use production Firebase project credentials
- Set proper CORS origins for frontend domain
- Configure announced IP for mediasoup
- Use HTTPS for WebRTC compatibility

### Scaling Considerations

- **Socket.IO**: Use Redis adapter for multiple server instances
- **Room State**: Consider Redis for distributed room state
- **Load Balancing**: Use sticky sessions for Socket.IO
- **Media Servers**: Deploy multiple mediasoup workers

## Security

1. **Firebase Rules**: Implement proper Firestore security rules
2. **Rate Limiting**: Configure appropriate rate limits
3. **CORS**: Restrict origins to frontend domains
4. **HTTPS**: Use HTTPS in production for WebRTC
5. **Token Validation**: All Firebase tokens validated server-side
6. **Input Validation**: All API inputs validated and sanitized

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
- Check Firebase and mediasoup documentation
- Review backend and frontend README files
- Open an issue for bug reports or questions

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