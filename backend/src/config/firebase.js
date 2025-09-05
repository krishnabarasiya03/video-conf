const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin SDK
const initializeFirebase = () => {
  try {
    if (admin.apps.length === 0) {
      let serviceAccount;
      
      // Method 1: Use individual environment variables (recommended)
      if (process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
        console.log('Using Firebase credentials from environment variables');
        serviceAccount = {
          type: process.env.FIREBASE_TYPE || 'service_account',
          project_id: process.env.FIREBASE_PROJECT_ID,
          private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
          private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'), // Handle newlines
          client_email: process.env.FIREBASE_CLIENT_EMAIL,
          client_id: process.env.FIREBASE_CLIENT_ID,
          auth_uri: process.env.FIREBASE_AUTH_URI || 'https://accounts.google.com/o/oauth2/auth',
          token_uri: process.env.FIREBASE_TOKEN_URI || 'https://oauth2.googleapis.com/token',
          auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL || 'https://www.googleapis.com/oauth2/v1/certs',
          client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL
        };
      }
      // Method 2: Use JSON file (legacy method for backward compatibility)
      else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        console.log('Using Firebase credentials from JSON file');
        const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
        serviceAccount = require(path.resolve(serviceAccountPath));
      }
      else {
        throw new Error('Firebase credentials not found. Please set either:\n' +
          '1. Individual Firebase environment variables (FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL, etc.), or\n' +
          '2. GOOGLE_APPLICATION_CREDENTIALS path to service account JSON file');
      }

      if (!process.env.FIREBASE_PROJECT_ID) {
        throw new Error('FIREBASE_PROJECT_ID environment variable is required');
      }
      
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