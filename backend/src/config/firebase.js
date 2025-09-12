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
        // For development/testing without Firebase - use mock credentials
        console.log('No Firebase credentials found - using mock configuration for testing');
        serviceAccount = {
          type: 'service_account',
          project_id: 'mock-project-id',
          private_key_id: 'mock-private-key-id',
          private_key: '-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC8Q7HBdPT7XQpz\nmock-private-key-content\n-----END PRIVATE KEY-----\n',
          client_email: 'mock-service@mock-project.iam.gserviceaccount.com',
          client_id: '123456789',
          auth_uri: 'https://accounts.google.com/o/oauth2/auth',
          token_uri: 'https://oauth2.googleapis.com/token',
          auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
          client_x509_cert_url: 'https://www.googleapis.com/robot/v1/metadata/x509/mock-service%40mock-project.iam.gserviceaccount.com'
        };
        process.env.FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'mock-project-id';
      }

      if (!process.env.FIREBASE_PROJECT_ID) {
        process.env.FIREBASE_PROJECT_ID = 'mock-project-id';
      }
      
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: process.env.FIREBASE_PROJECT_ID
      });

      console.log('Firebase Admin SDK initialized successfully');
    }
  } catch (error) {
    console.error('Failed to initialize Firebase Admin SDK:', error.message);
    // For development, we'll continue without Firebase - live-courses API won't work but Socket.IO will
    console.log('Continuing without Firebase - some features may not work');
  }
};

// Get Firestore instance
const getFirestore = () => {
  try {
    // Initialize Firebase if not already done
    if (admin.apps.length === 0) {
      initializeFirebase();
    }
    return admin.firestore();
  } catch (error) {
    console.error('Firebase not properly initialized:', error.message);
    return null;
  }
};

// Get Auth instance
const getAuth = () => {
  // Initialize Firebase if not already done
  if (admin.apps.length === 0) {
    initializeFirebase();
  }
  return admin.auth();
};

// Verify Firebase ID token
const verifyIdToken = async (idToken) => {
  try {
    // Initialize Firebase if not already done
    if (admin.apps.length === 0) {
      initializeFirebase();
    }
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