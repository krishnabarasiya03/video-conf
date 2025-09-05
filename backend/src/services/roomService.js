const { getRouter } = require('../config/mediasoup');

class RoomService {
  constructor() {
    // In-memory storage for room state
    // For production, consider using Redis for distributed systems
    this.rooms = new Map(); // roomId -> Room
    this.users = new Map(); // userId -> User
  }

  // Create or get room
  createRoom(roomId) {
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, {
        id: roomId,
        participants: new Map(), // userId -> participant data
        createdAt: new Date()
      });
    }
    return this.rooms.get(roomId);
  }

  // Get room
  getRoom(roomId) {
    return this.rooms.get(roomId);
  }

  // Add user to room
  addUserToRoom(roomId, userId, socketId, userInfo) {
    const room = this.createRoom(roomId);
    
    const participant = {
      userId,
      socketId,
      name: userInfo.name,
      role: userInfo.role,
      joinedAt: new Date(),
      transports: new Map(), // transportId -> transport
      producers: new Map(), // producerId -> producer
      consumers: new Map(), // consumerId -> consumer
      rtpCapabilities: null
    };

    room.participants.set(userId, participant);
    
    // Also store user to socket mapping
    this.users.set(socketId, {
      userId,
      roomId,
      ...userInfo
    });

    return participant;
  }

  // Remove user from room
  removeUserFromRoom(socketId) {
    const user = this.users.get(socketId);
    if (!user) return null;

    const room = this.getRoom(user.roomId);
    if (room) {
      const participant = room.participants.get(user.userId);
      if (participant) {
        // Close all transports, producers, and consumers
        this.cleanupParticipant(participant);
        room.participants.delete(user.userId);
      }

      // Remove empty rooms
      if (room.participants.size === 0) {
        this.rooms.delete(user.roomId);
      }
    }

    this.users.delete(socketId);
    return user;
  }

  // Get user by socket ID
  getUserBySocketId(socketId) {
    return this.users.get(socketId);
  }

  // Get participant in room
  getParticipant(roomId, userId) {
    const room = this.getRoom(roomId);
    return room ? room.participants.get(userId) : null;
  }

  // Get all participants in room
  getRoomParticipants(roomId) {
    const room = this.getRoom(roomId);
    return room ? Array.from(room.participants.values()) : [];
  }

  // Add transport to participant
  addTransport(roomId, userId, transport) {
    const participant = this.getParticipant(roomId, userId);
    if (participant) {
      participant.transports.set(transport.id, transport);
    }
  }

  // Get transport
  getTransport(roomId, userId, transportId) {
    const participant = this.getParticipant(roomId, userId);
    return participant ? participant.transports.get(transportId) : null;
  }

  // Add producer to participant
  addProducer(roomId, userId, producer) {
    const participant = this.getParticipant(roomId, userId);
    if (participant) {
      participant.producers.set(producer.id, producer);
    }
  }

  // Get producer
  getProducer(roomId, userId, producerId) {
    const participant = this.getParticipant(roomId, userId);
    return participant ? participant.producers.get(producerId) : null;
  }

  // Get all producers in room (except for the requesting user)
  getRoomProducers(roomId, excludeUserId = null) {
    const room = this.getRoom(roomId);
    if (!room) return [];

    const producers = [];
    for (const [userId, participant] of room.participants) {
      if (userId !== excludeUserId) {
        for (const producer of participant.producers.values()) {
          producers.push({
            id: producer.id,
            kind: producer.kind,
            userId,
            userName: participant.name,
            userRole: participant.role
          });
        }
      }
    }
    return producers;
  }

  // Add consumer to participant
  addConsumer(roomId, userId, consumer) {
    const participant = this.getParticipant(roomId, userId);
    if (participant) {
      participant.consumers.set(consumer.id, consumer);
    }
  }

  // Get consumer
  getConsumer(roomId, userId, consumerId) {
    const participant = this.getParticipant(roomId, userId);
    return participant ? participant.consumers.get(consumerId) : null;
  }

  // Set RTP capabilities for participant
  setRtpCapabilities(roomId, userId, rtpCapabilities) {
    const participant = this.getParticipant(roomId, userId);
    if (participant) {
      participant.rtpCapabilities = rtpCapabilities;
    }
  }

  // Cleanup participant resources
  cleanupParticipant(participant) {
    // Close all consumers
    for (const consumer of participant.consumers.values()) {
      try {
        consumer.close();
      } catch (error) {
        console.error('Error closing consumer:', error);
      }
    }
    participant.consumers.clear();

    // Close all producers
    for (const producer of participant.producers.values()) {
      try {
        producer.close();
      } catch (error) {
        console.error('Error closing producer:', error);
      }
    }
    participant.producers.clear();

    // Close all transports
    for (const transport of participant.transports.values()) {
      try {
        transport.close();
      } catch (error) {
        console.error('Error closing transport:', error);
      }
    }
    participant.transports.clear();
  }

  // Get room statistics
  getRoomStats(roomId) {
    const room = this.getRoom(roomId);
    if (!room) return null;

    return {
      roomId,
      participantCount: room.participants.size,
      participants: Array.from(room.participants.values()).map(p => ({
        userId: p.userId,
        name: p.name,
        role: p.role,
        joinedAt: p.joinedAt,
        transportCount: p.transports.size,
        producerCount: p.producers.size,
        consumerCount: p.consumers.size
      })),
      createdAt: room.createdAt
    };
  }

  // Get all rooms
  getAllRooms() {
    return Array.from(this.rooms.keys());
  }

  // Check if room exists
  roomExists(roomId) {
    return this.rooms.has(roomId);
  }
}

// Singleton instance
const roomService = new RoomService();

module.exports = roomService;