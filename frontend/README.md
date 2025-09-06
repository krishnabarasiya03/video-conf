# Video Conferencing Platform Frontend

A React TypeScript frontend for the video conferencing platform with Firebase authentication and Material-UI components.

## Features

- **🔐 Firebase Authentication**: User registration and login with role selection (student/teacher)
- **📚 Course Management**: Students can browse and enroll in courses, teachers can create courses
- **📅 Class Scheduling**: Teachers can schedule classes with date, time, and duration
- **🎥 Meeting Rooms**: Video conferencing interface with camera, microphone, and screen sharing controls
- **💬 Real-time Chat**: Chat functionality during video meetings
- **📊 Dashboards**: Role-based dashboards for students and teachers
- **🎨 Modern UI**: Material-UI components with responsive design

## Tech Stack

- **React 18** with TypeScript
- **Material-UI (MUI) v5** for UI components
- **Firebase SDK** for authentication and Firestore
- **Socket.IO Client** for real-time communication
- **React Router** for navigation
- **Axios** for API calls

## Setup

### Prerequisites

- Node.js 14+
- Firebase project with Authentication and Firestore enabled
- Backend server running (see ../backend/README.md)

### Installation

1. Install dependencies:
```bash
npm install
```

2. Copy environment configuration:
```bash
cp .env.example .env
```

3. Update `.env` with your Firebase configuration:
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

### Development

Start the development server:
```bash
npm start
```

The app will open at [http://localhost:3000](http://localhost:3000)

### Build

Create a production build:
```bash
npm run build
```

## Project Structure

```
src/
├── components/          # Reusable UI components
│   └── ProtectedRoute.tsx
├── config/             # Configuration files
│   └── firebase.ts     # Firebase configuration
├── hooks/              # Custom React hooks
│   └── useAuth.tsx     # Authentication context and hooks
├── pages/              # Page components
│   ├── Login.tsx       # Login page
│   ├── Register.tsx    # Registration page
│   ├── StudentDashboard.tsx  # Student dashboard
│   ├── TeacherDashboard.tsx  # Teacher dashboard
│   └── MeetingRoom.tsx       # Video meeting interface
├── services/           # API and external services
│   └── api.ts         # Backend API service
├── types/             # TypeScript type definitions
│   └── index.ts       # Application types
└── utils/             # Utility functions
```

## Usage

### Registration

1. Navigate to `/register`
2. Fill in name, email, password, and select role (student/teacher)
3. Submit to create account and automatically sign in

### Student Workflow

1. **Dashboard**: View enrolled courses and upcoming classes
2. **Enroll in Courses**: Click "Enroll in Course" to see available courses
3. **Join Classes**: Click "Join" on upcoming classes to enter meeting room

### Teacher Workflow

1. **Dashboard**: View created courses and scheduled classes
2. **Create Courses**: Click "Create Course" to add new courses
3. **Schedule Classes**: Click "Add Class" on courses to schedule sessions
4. **Start Classes**: Click "Start Class" to begin teaching sessions

### Meeting Room

- **Video Controls**: Toggle camera and microphone
- **Screen Sharing**: Share screen with participants
- **Chat**: Send messages to all participants
- **Leave**: Exit the meeting room

## Available Scripts

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

### `npm test`

Launches the test runner in the interactive watch mode.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

## API Integration

The frontend integrates with the backend API for:

- User authentication and profile management
- Course creation and enrollment
- Class scheduling and room access
- Real-time video conferencing and chat

## Firebase Configuration

The app uses Firebase for:

- **Authentication**: User registration and login
- **Firestore**: User profiles and role management
- **Real-time Features**: Through Socket.IO integration

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `REACT_APP_FIREBASE_API_KEY` | Firebase API key | Required |
| `REACT_APP_FIREBASE_AUTH_DOMAIN` | Firebase auth domain | Required |
| `REACT_APP_FIREBASE_PROJECT_ID` | Firebase project ID | Required |
| `REACT_APP_FIREBASE_STORAGE_BUCKET` | Firebase storage bucket | Required |
| `REACT_APP_FIREBASE_MESSAGING_SENDER_ID` | Firebase messaging sender ID | Required |
| `REACT_APP_FIREBASE_APP_ID` | Firebase app ID | Required |
| `REACT_APP_API_BASE_URL` | Backend API URL | `http://localhost:3000` |
| `REACT_APP_SOCKET_URL` | Socket.IO server URL | `http://localhost:3000` |

## Deployment

### Build for Production

```bash
npm run build
```

### Deploy to Hosting

The built files in the `build/` directory can be deployed to any static hosting service:

- **Firebase Hosting**
- **Netlify**
- **Vercel**
- **AWS S3 + CloudFront**

### Environment Configuration

For production deployment:

1. Update environment variables for production Firebase project
2. Update API URLs to production backend
3. Configure CORS on backend to allow frontend domain

## Development Notes

- The app uses TypeScript for type safety
- Material-UI components provide consistent styling
- React Context manages authentication state
- Axios interceptors handle authentication tokens
- Socket.IO manages real-time communication

## Contributing

1. Follow the existing code structure and patterns
2. Use TypeScript for all new components
3. Add proper error handling and loading states
4. Test components before submitting
5. Update documentation for new features