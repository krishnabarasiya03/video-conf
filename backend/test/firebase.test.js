const path = require('path');

// Set minimal environment variables for testing
process.env.NODE_ENV = 'test';
process.env.FIREBASE_PROJECT_ID = 'test-project';
process.env.FIREBASE_PRIVATE_KEY = '-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC5+sample+key+data\n-----END PRIVATE KEY-----';
process.env.FIREBASE_CLIENT_EMAIL = 'test@test-project.iam.gserviceaccount.com';

// Mock firebase-admin before requiring any modules that use it
const mockApps = [];
const mockApp = {
  projectId: 'test-project'
};

const mockFirestore = jest.fn(() => ({
  collection: jest.fn(() => ({
    doc: jest.fn(() => ({
      get: jest.fn(() => Promise.resolve({ exists: false })),
      set: jest.fn(() => Promise.resolve()),
      update: jest.fn(() => Promise.resolve()),
      delete: jest.fn(() => Promise.resolve())
    }))
  }))
}));

const mockAuth = jest.fn(() => ({
  verifyIdToken: jest.fn(() => Promise.resolve({ uid: 'test-uid', email: 'test@example.com' }))
}));

const mockInitializeApp = jest.fn(() => {
  mockApps.push(mockApp);
  return mockApp;
});

jest.mock('firebase-admin', () => ({
  get apps() {
    return mockApps;
  },
  initializeApp: mockInitializeApp,
  credential: {
    cert: jest.fn(() => ({}))
  },
  firestore: mockFirestore,
  auth: mockAuth
}));

describe('Firebase Configuration', () => {
  let firebase;

  beforeEach(() => {
    // Clear any existing apps
    mockApps.length = 0;
    mockInitializeApp.mockClear();
    mockFirestore.mockClear();
    mockAuth.mockClear();
    
    // Clear the module cache to get fresh instance
    delete require.cache[require.resolve('../src/config/firebase')];
    firebase = require('../src/config/firebase');
  });

  describe('Lazy Initialization', () => {
    it('should initialize Firebase when getFirestore is called', () => {
      // Initially no apps should be initialized
      expect(mockApps.length).toBe(0);
      
      // Call getFirestore - this should trigger initialization
      const db = firebase.getFirestore();
      
      // Firebase should now be initialized
      expect(mockApps.length).toBe(1);
      expect(mockInitializeApp).toHaveBeenCalled();
      expect(db).toBeDefined();
    });

    it('should initialize Firebase when getAuth is called', () => {
      // Initially no apps should be initialized
      expect(mockApps.length).toBe(0);
      
      // Call getAuth - this should trigger initialization
      const auth = firebase.getAuth();
      
      // Firebase should now be initialized
      expect(mockApps.length).toBe(1);
      expect(mockInitializeApp).toHaveBeenCalled();
      expect(auth).toBeDefined();
    });

    it('should initialize Firebase when verifyIdToken is called', async () => {
      // Initially no apps should be initialized
      expect(mockApps.length).toBe(0);
      
      // Call verifyIdToken - this should trigger initialization
      const result = await firebase.verifyIdToken('test-token');
      
      // Firebase should now be initialized
      expect(mockApps.length).toBe(1);
      expect(mockInitializeApp).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result.uid).toBe('test-uid');
    });

    it('should not initialize Firebase multiple times', () => {
      // Call multiple Firebase functions
      firebase.getFirestore();
      firebase.getAuth();
      
      // Firebase should only be initialized once
      expect(mockApps.length).toBe(1);
      expect(mockInitializeApp).toHaveBeenCalledTimes(1);
    });
  });

  describe('Explicit Initialization', () => {
    it('should allow explicit initialization via initializeFirebase', () => {
      // Explicitly initialize
      firebase.initializeFirebase();
      
      // Firebase should be initialized
      expect(mockApps.length).toBe(1);
      expect(mockInitializeApp).toHaveBeenCalled();
      
      // Subsequent calls should not reinitialize
      firebase.initializeFirebase();
      expect(mockApps.length).toBe(1);
      expect(mockInitializeApp).toHaveBeenCalledTimes(1);
    });
  });
});