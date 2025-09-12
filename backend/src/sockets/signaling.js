const { getRouter, createWebRtcTransport, getRouterRtpCapabilities } = require('../config/mediasoup');
const roomService = require('../services/roomService');
// Firebase imports removed for simplified setup - no authentication required

const setupSignaling = (io) => {
  // Simplified Socket.IO setup without authentication for testing
  // Users can provide basic info in handshake auth
  io.use(async (socket, next) => {
    try {
      const { name, role, userId } = socket.handshake.auth;
      
      // Use provided user info or defaults for testing
      socket.user = {
        uid: userId || `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        email: `${name || 'testuser'}@example.com`,
        name: name || 'Test User',
        role: role || 'student'
      };

      next();
    } catch (error) {
      console.error('Socket setup error:', error);
      next(new Error('Socket setup failed'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.user.name} (${socket.user.role}) - Socket ID: ${socket.id}`);

    // Handle room creation (simplified - any user can create rooms for testing)
    socket.on('createRoom', async (data, callback) => {
      try {
        const { roomId } = data;

        // Simplified room creation - any user can create rooms
        // Create room in room service
        roomService.createRoom(roomId);
        
        // Join socket room
        socket.join(roomId);
        
        // Add user to room
        roomService.addUserToRoom(roomId, socket.user.uid, socket.id, socket.user);

        console.log(`User ${socket.user.name} created room: ${roomId}`);

        callback({ 
          success: true,
          roomId,
          rtpCapabilities: getRouterRtpCapabilities()
        });

        // Notify others in room
        socket.to(roomId).emit('userJoined', {
          userId: socket.user.uid,
          name: socket.user.name,
          role: socket.user.role
        });

      } catch (error) {
        console.error('Error creating room:', error);
        callback({ error: 'Failed to create room' });
      }
    });

    // Handle joining room
    socket.on('joinRoom', async (data, callback) => {
      try {
        const { roomId } = data;

        // Check if room exists
        if (!roomService.roomExists(roomId)) {
          return callback({ error: 'Room does not exist' });
        }

        // Join socket room
        socket.join(roomId);
        
        // Add user to room
        roomService.addUserToRoom(roomId, socket.user.uid, socket.id, socket.user);

        console.log(`User ${socket.user.name} joined room: ${roomId}`);

        // Get existing producers to consume
        const existingProducers = roomService.getRoomProducers(roomId, socket.user.uid);

        callback({ 
          success: true,
          roomId,
          rtpCapabilities: getRouterRtpCapabilities(),
          existingProducers
        });

        // Notify others in room
        socket.to(roomId).emit('userJoined', {
          userId: socket.user.uid,
          name: socket.user.name,
          role: socket.user.role
        });

      } catch (error) {
        console.error('Error joining room:', error);
        callback({ error: 'Failed to join room' });
      }
    });

    // Handle WebRTC transport creation
    socket.on('createWebRtcTransport', async (data, callback) => {
      try {
        const user = roomService.getUserBySocketId(socket.id);
        if (!user) {
          return callback({ error: 'User not found in any room' });
        }

        const { transport, params } = await createWebRtcTransport();
        
        // Store transport in room service
        roomService.addTransport(user.roomId, user.userId, transport);

        callback({ 
          success: true,
          params
        });

      } catch (error) {
        console.error('Error creating WebRTC transport:', error);
        callback({ error: 'Failed to create WebRTC transport' });
      }
    });

    // Handle transport connection
    socket.on('connectTransport', async (data, callback) => {
      try {
        const { transportId, dtlsParameters } = data;
        const user = roomService.getUserBySocketId(socket.id);
        
        if (!user) {
          return callback({ error: 'User not found in any room' });
        }

        const transport = roomService.getTransport(user.roomId, user.userId, transportId);
        if (!transport) {
          return callback({ error: 'Transport not found' });
        }

        await transport.connect({ dtlsParameters });

        callback({ success: true });

      } catch (error) {
        console.error('Error connecting transport:', error);
        callback({ error: 'Failed to connect transport' });
      }
    });

    // Handle producer creation
    socket.on('produce', async (data, callback) => {
      try {
        const { transportId, kind, rtpParameters, appData } = data;
        const user = roomService.getUserBySocketId(socket.id);
        
        if (!user) {
          return callback({ error: 'User not found in any room' });
        }

        const transport = roomService.getTransport(user.roomId, user.userId, transportId);
        if (!transport) {
          return callback({ error: 'Transport not found' });
        }

        const producer = await transport.produce({
          kind,
          rtpParameters,
          appData: { ...appData, userId: user.userId, userName: user.name }
        });

        // Store producer in room service
        roomService.addProducer(user.roomId, user.userId, producer);

        console.log(`Producer created: ${producer.id} (${kind}) by ${user.name}`);

        callback({ 
          success: true,
          id: producer.id
        });

        // Notify other users about new producer
        socket.to(user.roomId).emit('newProducer', {
          userId: user.userId,
          userName: user.name,
          userRole: user.role,
          producerId: producer.id,
          kind
        });

      } catch (error) {
        console.error('Error creating producer:', error);
        callback({ error: 'Failed to create producer' });
      }
    });

    // Handle consumer creation
    socket.on('consume', async (data, callback) => {
      try {
        const { transportId, producerId, rtpCapabilities } = data;
        const user = roomService.getUserBySocketId(socket.id);
        
        if (!user) {
          return callback({ error: 'User not found in any room' });
        }

        const transport = roomService.getTransport(user.roomId, user.userId, transportId);
        if (!transport) {
          return callback({ error: 'Transport not found' });
        }

        const router = getRouter();
        
        // Check if router can consume
        if (!router.canConsume({ producerId, rtpCapabilities })) {
          return callback({ error: 'Cannot consume this producer' });
        }

        const consumer = await transport.consume({
          producerId,
          rtpCapabilities,
          paused: true // Start paused
        });

        // Store consumer in room service
        roomService.addConsumer(user.roomId, user.userId, consumer);

        console.log(`Consumer created: ${consumer.id} for producer ${producerId}`);

        callback({
          success: true,
          id: consumer.id,
          kind: consumer.kind,
          rtpParameters: consumer.rtpParameters,
          producerPaused: consumer.producerPaused
        });

      } catch (error) {
        console.error('Error creating consumer:', error);
        callback({ error: 'Failed to create consumer' });
      }
    });

    // Handle consumer resume
    socket.on('resumeConsumer', async (data, callback) => {
      try {
        const { consumerId } = data;
        const user = roomService.getUserBySocketId(socket.id);
        
        if (!user) {
          return callback({ error: 'User not found in any room' });
        }

        const consumer = roomService.getConsumer(user.roomId, user.userId, consumerId);
        if (!consumer) {
          return callback({ error: 'Consumer not found' });
        }

        await consumer.resume();

        callback({ success: true });

      } catch (error) {
        console.error('Error resuming consumer:', error);
        callback({ error: 'Failed to resume consumer' });
      }
    });

    // Handle get producers request
    socket.on('getProducers', (callback) => {
      try {
        const user = roomService.getUserBySocketId(socket.id);
        if (!user) {
          return callback({ error: 'User not found in any room' });
        }

        const producers = roomService.getRoomProducers(user.roomId, user.userId);

        callback({
          success: true,
          producers
        });

      } catch (error) {
        console.error('Error getting producers:', error);
        callback({ error: 'Failed to get producers' });
      }
    });

    // Handle RTP capabilities setting
    socket.on('setRtpCapabilities', (data, callback) => {
      try {
        const { rtpCapabilities } = data;
        const user = roomService.getUserBySocketId(socket.id);
        
        if (!user) {
          return callback({ error: 'User not found in any room' });
        }

        roomService.setRtpCapabilities(user.roomId, user.userId, rtpCapabilities);

        callback({ success: true });

      } catch (error) {
        console.error('Error setting RTP capabilities:', error);
        callback({ error: 'Failed to set RTP capabilities' });
      }
    });

    // Handle chat messages
    socket.on('chat:message', async (data, callback) => {
      try {
        const { text } = data;
        const user = roomService.getUserBySocketId(socket.id);
        
        if (!user) {
          return callback({ error: 'User not found in any room' });
        }

        if (!text || text.trim().length === 0) {
          return callback({ error: 'Message text is required' });
        }

        const message = {
          id: Date.now().toString(),
          userId: user.userId,
          name: user.name,
          role: user.role,
          text: text.trim(),
          timestamp: new Date().toISOString()
        };

        // Simple chat message without persistence
        // Broadcast message to room
        io.to(user.roomId).emit('chat:message', message);

        callback({ success: true, message });

      } catch (error) {
        console.error('Error handling chat message:', error);
        callback({ error: 'Failed to send message' });
      }
    });

    // Handle leaving room
    socket.on('leaveRoom', (callback) => {
      try {
        const user = roomService.removeUserFromRoom(socket.id);
        
        if (user) {
          socket.leave(user.roomId);
          
          console.log(`User ${user.name} left room: ${user.roomId}`);

          // Notify others in room
          socket.to(user.roomId).emit('userLeft', {
            userId: user.userId,
            name: user.name,
            role: user.role
          });

          if (callback) callback({ success: true });
        }

      } catch (error) {
        console.error('Error leaving room:', error);
        if (callback) callback({ error: 'Failed to leave room' });
      }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      try {
        const user = roomService.removeUserFromRoom(socket.id);
        
        if (user) {
          console.log(`User ${user.name} disconnected from room: ${user.roomId}`);

          // Notify others in room
          socket.to(user.roomId).emit('userLeft', {
            userId: user.userId,
            name: user.name,
            role: user.role
          });
        }

      } catch (error) {
        console.error('Error handling disconnect:', error);
      }
    });
  });

  console.log('Socket.IO signaling setup completed');
};

module.exports = setupSignaling;