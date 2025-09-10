const request = require('supertest');
const { app } = require('../src/server');

// Mock Firebase for testing
jest.mock('../src/config/firebase', () => ({
  initializeFirebase: jest.fn(),
  getFirestore: jest.fn(() => ({
    collection: jest.fn(() => ({
      doc: jest.fn(() => ({
        get: jest.fn(() => Promise.resolve({ exists: false })),
        set: jest.fn(() => Promise.resolve()),
        update: jest.fn(() => Promise.resolve()),
        delete: jest.fn(() => Promise.resolve())
      })),
      add: jest.fn(() => Promise.resolve({ id: 'test-id' })),
      where: jest.fn(() => ({
        get: jest.fn(() => Promise.resolve({ empty: true, docs: [] }))
      }))
    }))
  })),
  verifyIdToken: jest.fn(() => Promise.resolve({ uid: 'test-uid', email: 'test@example.com' }))
}));

// Mock mediasoup for testing
jest.mock('../src/config/mediasoup', () => ({
  initializeMediasoup: jest.fn(() => Promise.resolve()),
  getRouterRtpCapabilities: jest.fn(() => ({ codecs: [] })),
  createWebRtcTransport: jest.fn(() => Promise.resolve({
    transport: { id: 'test-transport' },
    params: { id: 'test-transport' }
  })),
  closeWorker: jest.fn()
}));

describe('Backend API Tests', () => {
  describe('Health Check', () => {
    it('should return health status', async () => {
      const response = await request(app).get('/health');
      
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('OK');
      expect(response.body).toHaveProperty('timestamp');
    });
  });

  describe('Root Endpoint', () => {
    it('should return API information', async () => {
      const response = await request(app).get('/');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('endpoints');
      expect(response.body).toHaveProperty('websocket');
    });
  });

  describe('RTP Capabilities', () => {
    it('should return router RTP capabilities', async () => {
      const response = await request(app).get('/api/rtpCapabilities');
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body).toHaveProperty('rtpCapabilities');
    });
  });

  describe('Authentication Required Endpoints - All removed', () => {
    it('should return 404 for removed API endpoints', async () => {
      // Test that removed endpoints now return 404
      const endpoints = ['/api/me', '/api/courses', '/api/schedules', '/api/students', '/api/enrollments'];
      
      for (const endpoint of endpoints) {
        const response = await request(app).get(endpoint);
        expect(response.status).toBe(404);
        expect(response.body.error).toBe('Not Found');
      }
    });
  });

  describe('404 Handler', () => {
    it('should handle non-existent routes', async () => {
      const response = await request(app).get('/non-existent-route');
      
      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Not Found');
    });
  });
});

// Test the room service
describe('Room Service', () => {
  const roomService = require('../src/services/roomService');

  beforeEach(() => {
    // Clear rooms before each test
    roomService.rooms.clear();
    roomService.users.clear();
  });

  it('should create a room', () => {
    const roomId = 'test-room';
    const room = roomService.createRoom(roomId);
    
    expect(room).toBeDefined();
    expect(room.id).toBe(roomId);
    expect(room.participants.size).toBe(0);
  });

  it('should add user to room', () => {
    const roomId = 'test-room';
    const userId = 'test-user';
    const socketId = 'test-socket';
    const userInfo = { name: 'Test User', role: 'student' };

    const participant = roomService.addUserToRoom(roomId, userId, socketId, userInfo);
    
    expect(participant).toBeDefined();
    expect(participant.userId).toBe(userId);
    expect(participant.name).toBe(userInfo.name);
    expect(participant.role).toBe(userInfo.role);
  });

  it('should remove user from room', () => {
    const roomId = 'test-room';
    const userId = 'test-user';
    const socketId = 'test-socket';
    const userInfo = { name: 'Test User', role: 'student' };

    // Add user first
    roomService.addUserToRoom(roomId, userId, socketId, userInfo);
    
    // Then remove
    const removedUser = roomService.removeUserFromRoom(socketId);
    
    expect(removedUser).toBeDefined();
    expect(removedUser.userId).toBe(userId);
    
    // Room should be empty and removed
    const room = roomService.getRoom(roomId);
    expect(room).toBeUndefined();
  });

  it('should get room participants', () => {
    const roomId = 'test-room';
    const userId1 = 'user1';
    const userId2 = 'user2';
    const socketId1 = 'socket1';
    const socketId2 = 'socket2';

    roomService.addUserToRoom(roomId, userId1, socketId1, { name: 'User 1', role: 'student' });
    roomService.addUserToRoom(roomId, userId2, socketId2, { name: 'User 2', role: 'teacher' });

    const participants = roomService.getRoomParticipants(roomId);
    
    expect(participants).toHaveLength(2);
    expect(participants.find(p => p.userId === userId1)).toBeDefined();
    expect(participants.find(p => p.userId === userId2)).toBeDefined();
  });
});

// Test the schedule service - Removed as per requirements