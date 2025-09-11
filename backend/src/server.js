require('dotenv').config();

const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Import configurations and middleware
const { initializeFirebase } = require('./config/firebase');
const { initializeMediasoup, closeWorker } = require('./config/mediasoup');

// Import routes - All API routes removed as per requirements

// Import Socket.IO setup
const setupSignaling = require('./sockets/signaling');

const app = express();
const server = createServer(app);

// Initialize Socket.IO with CORS
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : ['http://localhost:3000'],
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['websocket', 'polling']
});

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      connectSrc: ["'self'", "wss:", "ws:"],
    },
  },
}));

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = process.env.CORS_ORIGINS ? 
      process.env.CORS_ORIGINS.split(',') : 
      ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:8080'];
    
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
};

app.use(cors(corsOptions));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests',
    message: 'Too many requests from this IP, please try again later.'
  }
});

app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

// Public endpoint to get router RTP capabilities
app.get('/api/rtpCapabilities', (req, res) => {
  try {
    const { getRouterRtpCapabilities } = require('./config/mediasoup');
    res.json({
      success: true,
      rtpCapabilities: getRouterRtpCapabilities()
    });
  } catch (error) {
    console.error('Error getting RTP capabilities:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get RTP capabilities'
    });
  }
});

// Public endpoint to get student data from Firebase (no authentication required)
app.get('/api/students', async (req, res) => {
  try {
    const { getFirestore } = require('./config/firebase');
    const db = getFirestore();
    
    // Query users collection for students
    const studentsSnapshot = await db.collection('users')
      .where('role', '==', 'student')
      .get();
    
    if (studentsSnapshot.empty) {
      return res.json({
        success: true,
        data: {
          students: [],
          count: 0
        },
        message: 'No students found'
      });
    }
    
    const students = [];
    studentsSnapshot.forEach(doc => {
      const studentData = doc.data();
      students.push({
        id: doc.id,
        name: studentData.name || 'Unknown',
        email: studentData.email || '',
        role: studentData.role,
        createdAt: studentData.createdAt || null,
        updatedAt: studentData.updatedAt || null,
        // Add any other relevant student fields
        profile: {
          avatar: studentData.avatar || null,
          bio: studentData.bio || '',
          phone: studentData.phone || ''
        }
      });
    });
    
    res.json({
      success: true,
      data: {
        students: students,
        count: students.length
      }
    });
    
  } catch (error) {
    console.error('Error fetching student data:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to fetch student data from Firebase'
    });
  }
});

// API routes - All removed as per requirements
// Only keeping mediasoup RTP capabilities endpoint for video conferencing

// Protected route to get user profile - Removed as per requirements

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Video Conferencing Platform Backend',
    version: '1.0.0',
    status: 'Running',
    endpoints: {
      health: '/health',
      rtpCapabilities: '/api/rtpCapabilities',
      students: '/api/students'
    },
    websocket: {
      path: '/socket.io/',
      auth: 'Firebase ID token required'
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({
      error: 'CORS Error',
      message: 'Origin not allowed'
    });
  }
  
  res.status(err.status || 500).json({
    error: err.name || 'Internal Server Error',
    message: err.message || 'An unexpected error occurred',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.originalUrl} not found`
  });
});

// Initialize services and start server
async function startServer() {
  try {
    console.log('Starting Video Conferencing Platform Backend...');
    
    // Initialize Firebase
    console.log('Initializing Firebase...');
    initializeFirebase();
    
    // Initialize mediasoup
    console.log('Initializing mediasoup...');
    await initializeMediasoup();
    
    // Setup Socket.IO signaling
    console.log('Setting up Socket.IO signaling...');
    setupSignaling(io);
    
    // Start the server
    const PORT = process.env.PORT || 3000;
    server.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`Health check: http://localhost:${PORT}/health`);
      console.log(`API documentation: http://localhost:${PORT}/`);
    });
    
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down gracefully...');
  
  server.close(() => {
    console.log('HTTP server closed');
    
    // Close mediasoup worker
    closeWorker();
    
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  
  server.close(() => {
    console.log('HTTP server closed');
    
    // Close mediasoup worker
    closeWorker();
    
    process.exit(0);
  });
});

// Start the server
startServer();

module.exports = { app, server, io };