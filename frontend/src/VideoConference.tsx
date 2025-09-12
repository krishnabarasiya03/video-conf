import React, { useState, useEffect, useRef, useCallback } from 'react';
import io, { Socket } from 'socket.io-client';
import { Device } from 'mediasoup-client';
import { Transport, Producer, Consumer } from 'mediasoup-client/lib/types';

interface User {
  name: string;
  role: 'teacher' | 'student';
  userId: string;
}

interface Message {
  id: string;
  userId: string;
  name: string;
  role: string;
  text: string;
  timestamp: string;
}

const VideoConference: React.FC = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [device, setDevice] = useState<Device | null>(null);
  const [user, setUser] = useState<User>({ name: '', role: 'student', userId: '' });
  const [roomId, setRoomId] = useState('');
  const [connected, setConnected] = useState(false);
  const [inRoom, setInRoom] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageText, setMessageText] = useState('');
  const [participants, setParticipants] = useState<{[key: string]: any}>({});
  const [status, setStatus] = useState('');

  // MediaSoup references
  const sendTransport = useRef<Transport | null>(null);
  const recvTransport = useRef<Transport | null>(null);
  const producers = useRef<{[key: string]: Producer}>({});
  const consumers = useRef<{[key: string]: Consumer}>({});

  // Media references
  const localVideoRef = useRef<HTMLVideoElement>(null);

  const updateStatus = useCallback((message: string) => {
    console.log(message);
    setStatus(message);
  }, []);

  const connectSocket = useCallback(() => {
    if (!user.name || !user.userId) {
      alert('Please enter your name and user ID');
      return;
    }

    const socketInstance = io('http://localhost:3000', {
      auth: {
        name: user.name,
        role: user.role,
        userId: user.userId
      }
    });

    socketInstance.on('connect', () => {
      updateStatus('Connected to server');
      setConnected(true);
    });

    socketInstance.on('disconnect', () => {
      updateStatus('Disconnected from server');
      setConnected(false);
      setInRoom(false);
    });

    socketInstance.on('userJoined', (data) => {
      updateStatus(`${data.name} joined the room`);
      setParticipants(prev => ({ ...prev, [data.userId]: data }));
    });

    socketInstance.on('userLeft', (data) => {
      updateStatus(`${data.name} left the room`);
      setParticipants(prev => {
        const newParticipants = { ...prev };
        delete newParticipants[data.userId];
        return newParticipants;
      });
    });

    socketInstance.on('newProducer', async (data) => {
      updateStatus(`New producer available: ${data.kind} from ${data.userName}`);
      await consumeProducer(data.producerId);
    });

    socketInstance.on('chat:message', (message) => {
      setMessages(prev => [...prev, message]);
    });

    setSocket(socketInstance);
  }, [user, updateStatus]);

  const initializeDevice = useCallback(async () => {
    try {
      updateStatus('Initializing MediaSoup device...');
      
      // Get RTP capabilities from server
      const response = await fetch('http://localhost:3000/api/rtpCapabilities');
      const { rtpCapabilities } = await response.json();
      
      // Import Device dynamically to avoid constructor issues
      const { Device } = await import('mediasoup-client');
      const deviceInstance = new Device();
      await deviceInstance.load({ routerRtpCapabilities: rtpCapabilities });
      
      setDevice(deviceInstance);
      updateStatus('MediaSoup device initialized');
      
      return deviceInstance;
    } catch (error) {
      console.error('Error initializing device:', error);
      updateStatus('Error initializing device - will continue without MediaSoup');
      // Continue without device for Socket.IO testing
      return null;
    }
  }, [updateStatus]);

  const createRoom = useCallback(async () => {
    if (!socket || !roomId) return;

    try {
      updateStatus('Creating room...');
      
      socket.emit('createRoom', { roomId }, (response: any) => {
        if (response.success) {
          updateStatus(`Room created: ${roomId}`);
          setInRoom(true);
          // Only initialize transports if device is available
          if (device) {
            initializeTransports();
          } else {
            updateStatus('Room created - MediaSoup not available, Socket.IO chat only');
          }
        } else {
          updateStatus(`Error creating room: ${response.error}`);
        }
      });
    } catch (error) {
      console.error('Error creating room:', error);
      updateStatus('Error creating room');
    }
  }, [socket, device, roomId, updateStatus]);

  const joinRoom = useCallback(async () => {
    if (!socket || !roomId) return;

    try {
      updateStatus('Joining room...');
      
      socket.emit('joinRoom', { roomId }, (response: any) => {
        if (response.success) {
          updateStatus(`Joined room: ${roomId}`);
          setInRoom(true);
          // Only initialize transports if device is available
          if (device) {
            initializeTransports();
          } else {
            updateStatus('Joined room - MediaSoup not available, Socket.IO chat only');
          }
        } else {
          updateStatus(`Error joining room: ${response.error}`);
        }
      });
    } catch (error) {
      console.error('Error joining room:', error);
      updateStatus('Error joining room');
    }
  }, [socket, device, roomId, updateStatus]);

  const initializeTransports = useCallback(async () => {
    if (!socket || !device) return;

    try {
      updateStatus('Creating transports...');

      // Create send transport
      socket.emit('createWebRtcTransport', {}, async (response: any) => {
        if (response.success) {
          const transport = device.createSendTransport(response.params);
          
          transport.on('connect', async ({ dtlsParameters }, callback, errback) => {
            try {
              socket.emit('connectTransport', {
                transportId: transport.id,
                dtlsParameters
              }, (result: any) => {
                if (result.success) {
                  callback();
                } else {
                  errback(new Error(result.error));
                }
              });
            } catch (error) {
              errback(error as Error);
            }
          });

          transport.on('produce', async ({ kind, rtpParameters, appData }, callback, errback) => {
            try {
              socket.emit('produce', {
                transportId: transport.id,
                kind,
                rtpParameters,
                appData
              }, (result: any) => {
                if (result.success) {
                  callback({ id: result.id });
                } else {
                  errback(new Error(result.error));
                }
              });
            } catch (error) {
              errback(error as Error);
            }
          });

          sendTransport.current = transport;
          updateStatus('Send transport created');
        }
      });

      // Create recv transport
      socket.emit('createWebRtcTransport', {}, async (response: any) => {
        if (response.success) {
          const transport = device.createRecvTransport(response.params);
          
          transport.on('connect', async ({ dtlsParameters }, callback, errback) => {
            try {
              socket.emit('connectTransport', {
                transportId: transport.id,
                dtlsParameters
              }, (result: any) => {
                if (result.success) {
                  callback();
                } else {
                  errback(new Error(result.error));
                }
              });
            } catch (error) {
              errback(error as Error);
            }
          });

          recvTransport.current = transport;
          updateStatus('Receive transport created');
        }
      });

    } catch (error) {
      console.error('Error initializing transports:', error);
      updateStatus('Error initializing transports');
    }
  }, [socket, device, updateStatus]);

  const startVideo = useCallback(async () => {
    if (!sendTransport.current) return;

    try {
      updateStatus('Starting video...');
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
        audio: true
      });

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Produce video
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        const videoProducer = await sendTransport.current.produce({
          track: videoTrack,
          encodings: [{ maxBitrate: 100000 }],
          codecOptions: {
            videoGoogleStartBitrate: 1000
          }
        });

        producers.current['video'] = videoProducer;
        updateStatus('Video producer created');
      }

      // Produce audio
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        const audioProducer = await sendTransport.current.produce({
          track: audioTrack
        });

        producers.current['audio'] = audioProducer;
        updateStatus('Audio producer created');
      }

    } catch (error) {
      console.error('Error starting video:', error);
      updateStatus('Error starting video');
    }
  }, [updateStatus]);

  const consumeProducer = useCallback(async (producerId: string) => {
    if (!recvTransport.current || !device || !socket) return;

    try {
      socket.emit('consume', {
        transportId: recvTransport.current.id,
        producerId,
        rtpCapabilities: device.rtpCapabilities
      }, async (response: any) => {
        if (response.success) {
          const consumer = await recvTransport.current!.consume({
            id: response.id,
            producerId,
            kind: response.kind,
            rtpParameters: response.rtpParameters
          });

          consumers.current[consumer.id] = consumer;

          // Resume consumer
          socket.emit('resumeConsumer', { consumerId: consumer.id }, (result: any) => {
            if (result.success) {
              updateStatus(`Consumer resumed: ${consumer.kind}`);
              
              // Display remote video
              if (consumer.kind === 'video') {
                const stream = new MediaStream([consumer.track]);
                const videoElement = document.createElement('video');
                videoElement.srcObject = stream;
                videoElement.autoplay = true;
                videoElement.playsInline = true;
                videoElement.style.width = '320px';
                videoElement.style.height = '240px';
                videoElement.style.border = '1px solid #ccc';
                videoElement.style.margin = '10px';
                
                const remoteVideosContainer = document.getElementById('remoteVideos');
                if (remoteVideosContainer) {
                  remoteVideosContainer.appendChild(videoElement);
                }
              }
            }
          });
        }
      });
    } catch (error) {
      console.error('Error consuming producer:', error);
    }
  }, [device, socket, updateStatus]);

  const sendMessage = useCallback(() => {
    if (!socket || !messageText.trim()) return;

    socket.emit('chat:message', { text: messageText }, (response: any) => {
      if (response.success) {
        setMessageText('');
      }
    });
  }, [socket, messageText]);

  const leaveRoom = useCallback(() => {
    if (!socket) return;

    socket.emit('leaveRoom', () => {
      setInRoom(false);
      setMessages([]);
      setParticipants({});
      
      // Stop local media
      if (localVideoRef.current?.srcObject) {
        const stream = localVideoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
        localVideoRef.current.srcObject = null;
      }

      // Clear remote videos
      const remoteVideosContainer = document.getElementById('remoteVideos');
      if (remoteVideosContainer) {
        remoteVideosContainer.innerHTML = '';
      }

      updateStatus('Left room');
    });
  }, [socket, updateStatus]);

  useEffect(() => {
    // Initialize device on component mount but don't block if it fails
    initializeDevice().catch(() => {
      updateStatus('MediaSoup device initialization failed - continuing with Socket.IO only');
    });
    
    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>Video Conference Test Platform</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <h3>User Setup</h3>
        <div style={{ marginBottom: '10px' }}>
          <label>Name: </label>
          <input
            type="text"
            value={user.name}
            onChange={(e) => setUser(prev => ({ ...prev, name: e.target.value }))}
            placeholder="Enter your name"
          />
        </div>
        <div style={{ marginBottom: '10px' }}>
          <label>User ID: </label>
          <input
            type="text"
            value={user.userId}
            onChange={(e) => setUser(prev => ({ ...prev, userId: e.target.value }))}
            placeholder="Enter user ID"
          />
        </div>
        <div style={{ marginBottom: '10px' }}>
          <label>Role: </label>
          <select
            value={user.role}
            onChange={(e) => setUser(prev => ({ ...prev, role: e.target.value as 'teacher' | 'student' }))}
          >
            <option value="student">Student</option>
            <option value="teacher">Teacher</option>
          </select>
        </div>
        <button onClick={connectSocket} disabled={connected}>
          Connect to Server
        </button>
      </div>

      {connected && (
        <div style={{ marginBottom: '20px' }}>
          <h3>Room Management</h3>
          <div style={{ marginBottom: '10px' }}>
            <label>Room ID: </label>
            <input
              type="text"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              placeholder="Enter room ID"
            />
          </div>
          <button onClick={createRoom} disabled={inRoom} style={{ marginRight: '10px' }}>
            Create Room
          </button>
          <button onClick={joinRoom} disabled={inRoom} style={{ marginRight: '10px' }}>
            Join Room
          </button>
          {inRoom && (
            <button onClick={leaveRoom}>Leave Room</button>
          )}
        </div>
      )}

      {inRoom && (
        <>
          <div style={{ marginBottom: '20px' }}>
            <h3>Video Conference</h3>
            <button onClick={startVideo} style={{ marginBottom: '10px' }}>
              Start Video & Audio
            </button>
            <div style={{ display: 'flex', flexWrap: 'wrap', marginBottom: '10px' }}>
              <div>
                <h4>Local Video</h4>
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  style={{
                    width: '320px',
                    height: '240px',
                    border: '1px solid #ccc',
                    backgroundColor: '#000'
                  }}
                />
              </div>
            </div>
            <div>
              <h4>Remote Videos</h4>
              <div id="remoteVideos" style={{ display: 'flex', flexWrap: 'wrap' }}>
                {/* Remote videos will be added here dynamically */}
              </div>
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <h3>Participants</h3>
            <ul>
              {Object.values(participants).map((participant: any) => (
                <li key={participant.userId}>
                  {participant.name} ({participant.role})
                </li>
              ))}
            </ul>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <h3>Chat</h3>
            <div
              style={{
                border: '1px solid #ccc',
                height: '200px',
                overflowY: 'auto',
                padding: '10px',
                marginBottom: '10px'
              }}
            >
              {messages.map((message) => (
                <div key={message.id} style={{ marginBottom: '5px' }}>
                  <strong>{message.name} ({message.role}):</strong> {message.text}
                </div>
              ))}
            </div>
            <div>
              <input
                type="text"
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="Type a message..."
                style={{ width: '300px', marginRight: '10px' }}
              />
              <button onClick={sendMessage}>Send</button>
            </div>
          </div>
        </>
      )}

      <div style={{ marginTop: '20px', padding: '10px', backgroundColor: '#f0f0f0' }}>
        <h3>Status</h3>
        <div>{status}</div>
      </div>
    </div>
  );
};

export default VideoConference;