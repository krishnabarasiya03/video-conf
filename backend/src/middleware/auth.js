const { verifyIdToken, getFirestore } = require('../config/firebase');

// Middleware to verify Firebase ID token
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'Unauthorized', 
        message: 'Missing or invalid authorization header' 
      });
    }

    const idToken = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    // Verify the Firebase ID token
    const decodedToken = await verifyIdToken(idToken);
    
    // Get user profile from Firestore
    const db = getFirestore();
    const userDoc = await db.collection('users').doc(decodedToken.uid).get();
    
    if (!userDoc.exists) {
      return res.status(404).json({ 
        error: 'User not found', 
        message: 'User profile not found in database' 
      });
    }

    const userData = userDoc.data();
    
    // Attach user info to request
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      role: userData.role,
      name: userData.name,
      ...userData
    };

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(401).json({ 
      error: 'Unauthorized', 
      message: 'Invalid or expired token' 
    });
  }
};

// Middleware to check if user has specific role
const requireRole = (requiredRole) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Unauthorized', 
        message: 'Authentication required' 
      });
    }

    if (req.user.role !== requiredRole) {
      return res.status(403).json({ 
        error: 'Forbidden', 
        message: `Access denied. Required role: ${requiredRole}` 
      });
    }

    next();
  };
};

// Middleware to check if user is either student or teacher
const requireStudentOrTeacher = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ 
      error: 'Unauthorized', 
      message: 'Authentication required' 
    });
  }

  if (!['student', 'teacher'].includes(req.user.role)) {
    return res.status(403).json({ 
      error: 'Forbidden', 
      message: 'Access denied. Must be student or teacher' 
    });
  }

  next();
};

// Optional authentication middleware (doesn't fail if no token)
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const idToken = authHeader.substring(7);
      const decodedToken = await verifyIdToken(idToken);
      
      const db = getFirestore();
      const userDoc = await db.collection('users').doc(decodedToken.uid).get();
      
      if (userDoc.exists) {
        const userData = userDoc.data();
        req.user = {
          uid: decodedToken.uid,
          email: decodedToken.email,
          role: userData.role,
          name: userData.name,
          ...userData
        };
      }
    }
    
    next();
  } catch (error) {
    // Continue without authentication if token is invalid
    next();
  }
};

module.exports = {
  authenticateToken,
  requireRole,
  requireStudentOrTeacher,
  optionalAuth
};