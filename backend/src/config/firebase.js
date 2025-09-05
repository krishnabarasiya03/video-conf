const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin SDK
const initializeFirebase = () => {
  try {
    if (admin.apps.length === 0) {
      const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
      
      if (!serviceAccountPath) {
        throw new Error('GOOGLE_APPLICATION_CREDENTIALS environment variable is not set');
      }

      const serviceAccount = require(path.resolve(serviceAccountPath));
      
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: process.env.FIREBASE_PROJECT_ID
      });

      console.log('Firebase Admin SDK initialized successfully');
    }
  } catch (error) {
    console.error('Failed to initialize Firebase Admin SDK:', error.message);
    process.exit(1);
  }
};

// Get Firestore instance
const getFirestore = () => {
  return admin.firestore();
};

// Get Auth instance
const getAuth = () => {
  return admin.auth();
};

// Verify Firebase ID token
const verifyIdToken = async (idToken) => {
  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    return decodedToken;
  } catch (error) {
    throw new Error('Invalid Firebase ID token');
  }
};

module.exports = {
  initializeFirebase,
  getFirestore,
  getAuth,
  verifyIdToken,
  admin
};