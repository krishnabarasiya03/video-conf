import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Button,
  TextField,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Chip,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  Mic as MicIcon,
  MicOff as MicOffIcon,
  Videocam as VideocamIcon,
  VideocamOff as VideocamOffIcon,
  ScreenShare as ScreenShareIcon,
  StopScreenShare as StopScreenShareIcon,
  ExitToApp as ExitIcon,
  Send as SendIcon,
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import io, { Socket } from 'socket.io-client';
import { useAuth } from '../hooks/useAuth';
import { apiService } from '../services/api';

interface ChatMessage {
  id: string;
  user: string;
  message: string;
  timestamp: Date;
}

interface Participant {
  id: string;
  name: string;
  role: string;
}

export default function MeetingRoom() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { user, getAuthToken } = useAuth();
  
  const [socket, setSocket] = useState<Socket | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [participants] = useState<Participant[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [scheduleInfo, setScheduleInfo] = useState<any>(null);
  
  const localVideoRef = useRef<HTMLVideoElement>(null);

  const cleanup = useCallback(() => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    if (socket) {
      socket.disconnect();
    }
  }, [localStream, socket]);

  const initializeMeeting = useCallback(async () => {
    try {
      // Get schedule information
      const scheduleResponse = await apiService.getScheduleByRoom(roomId!);
      setScheduleInfo(scheduleResponse.data.data.schedule);
      
      // Get user media
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      setLocalStream(stream);
      
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      
      // Initialize socket connection
      const token = await getAuthToken();
      const socketUrl = process.env.REACT_APP_SOCKET_URL || 'http://localhost:3000';
      
      const newSocket = io(socketUrl, {
        auth: { token },
      });
      
      setSocket(newSocket);
      
      // Join room
      newSocket.emit('joinRoom', { roomId }, (response: any) => {
        if (response.success) {
          setLoading(false);
        } else {
          setError('Failed to join meeting room');
          setLoading(false);
        }
      });
      
      // Listen for socket events
      newSocket.on('userJoined', (data: any) => {
        console.log('User joined:', data);
        // Handle new participant
      });
      
      newSocket.on('userLeft', (data: any) => {
        console.log('User left:', data);
        // Handle participant leaving
      });
      
      newSocket.on('chat:message', (data: any) => {
        setChatMessages(prev => [...prev, {
          id: Date.now().toString(),
          user: data.user,
          message: data.text,
          timestamp: new Date(),
        }]);
      });
      
    } catch (error: any) {
      console.error('Meeting initialization error:', error);
      setError('Failed to initialize meeting');
      setLoading(false);
    }
  }, [roomId, getAuthToken]);

  useEffect(() => {
    if (roomId) {
      initializeMeeting();
    }
    
    return () => {
      cleanup();
    };
  }, [roomId, initializeMeeting, cleanup]);

  const toggleMic = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = isMicMuted;
        setIsMicMuted(!isMicMuted);
      }
    }
  };

  const toggleCamera = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = isCameraOff;
        setIsCameraOff(!isCameraOff);
      }
    }
  };

  const toggleScreenShare = async () => {
    try {
      if (!isScreenSharing) {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true,
        });
        
        // Replace video track with screen share
        if (localStream && localVideoRef.current) {
          const videoTrack = screenStream.getVideoTracks()[0];
          // In a real implementation, you'd replace the track in peer connections
          localVideoRef.current.srcObject = screenStream;
          setIsScreenSharing(true);
          
          videoTrack.onended = () => {
            setIsScreenSharing(false);
            if (localVideoRef.current && localStream) {
              localVideoRef.current.srcObject = localStream;
            }
          };
        }
      } else {
        // Stop screen sharing
        if (localVideoRef.current && localStream) {
          localVideoRef.current.srcObject = localStream;
          setIsScreenSharing(false);
        }
      }
    } catch (error) {
      console.error('Screen share error:', error);
    }
  };

  const sendChatMessage = () => {
    if (chatInput.trim() && socket) {
      socket.emit('chat:message', { text: chatInput.trim() }, (response: any) => {
        if (response.success) {
          setChatInput('');
        }
      });
    }
  };

  const leaveMeeting = () => {
    cleanup();
    navigate(user?.role === 'student' ? '/student/dashboard' : '/teacher/dashboard');
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
        <Typography variant="h6" sx={{ ml: 2 }}>
          Joining meeting...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center" minHeight="100vh">
        <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
        <Button variant="contained" onClick={() => navigate('/')}>
          Go Back
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box sx={{ bgcolor: 'primary.main', color: 'white', p: 2 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">
            {scheduleInfo?.courseName || 'Meeting Room'}
          </Typography>
          <Box>
            <Chip 
              label={`${participants.length + 1} participants`} 
              variant="outlined" 
              sx={{ color: 'white', borderColor: 'white', mr: 2 }}
            />
            <Button 
              variant="outlined" 
              sx={{ color: 'white', borderColor: 'white' }}
              onClick={leaveMeeting}
              startIcon={<ExitIcon />}
            >
              Leave
            </Button>
          </Box>
        </Box>
      </Box>

      {/* Main content */}
      <Box sx={{ flex: 1, display: 'flex' }}>
        {/* Video area */}
        <Box sx={{ flex: 1, p: 2 }}>
          <Grid container spacing={2} sx={{ height: '100%' }}>
            {/* Local video */}
            <Grid item xs={12} md={6}>
              <Paper sx={{ height: '100%', position: 'relative', bgcolor: 'black' }}>
                <video
                  ref={localVideoRef}
                  autoPlay
                  muted
                  playsInline
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                />
                <Box
                  sx={{
                    position: 'absolute',
                    bottom: 8,
                    left: 8,
                    bgcolor: 'rgba(0,0,0,0.7)',
                    color: 'white',
                    px: 1,
                    py: 0.5,
                    borderRadius: 1,
                  }}
                >
                  {user?.name} (You)
                </Box>
              </Paper>
            </Grid>
            
            {/* Remote videos would go here */}
            {participants.map((participant) => (
              <Grid item xs={12} md={6} key={participant.id}>
                <Paper sx={{ height: '100%', position: 'relative', bgcolor: 'black' }}>
                  <Box
                    sx={{
                      width: '100%',
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                    }}
                  >
                    {participant.name}
                  </Box>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Box>

        {/* Chat sidebar */}
        <Box sx={{ width: 300, borderLeft: 1, borderColor: 'divider', display: 'flex', flexDirection: 'column' }}>
          <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
            <Typography variant="h6">Chat</Typography>
          </Box>
          
          <Box sx={{ flex: 1, overflow: 'auto', p: 1 }}>
            <List dense>
              {chatMessages.map((message) => (
                <ListItem key={message.id}>
                  <ListItemText
                    primary={message.message}
                    secondary={`${message.user} - ${message.timestamp.toLocaleTimeString()}`}
                  />
                </ListItem>
              ))}
            </List>
          </Box>
          
          <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
            <Box display="flex">
              <TextField
                fullWidth
                size="small"
                placeholder="Type a message..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendChatMessage()}
              />
              <IconButton onClick={sendChatMessage} disabled={!chatInput.trim()}>
                <SendIcon />
              </IconButton>
            </Box>
          </Box>
        </Box>
      </Box>

      {/* Controls */}
      <Box sx={{ bgcolor: 'grey.100', p: 2 }}>
        <Box display="flex" justifyContent="center" gap={2}>
          <IconButton
            onClick={toggleMic}
            color={isMicMuted ? 'error' : 'default'}
            sx={{ bgcolor: 'white' }}
          >
            {isMicMuted ? <MicOffIcon /> : <MicIcon />}
          </IconButton>
          
          <IconButton
            onClick={toggleCamera}
            color={isCameraOff ? 'error' : 'default'}
            sx={{ bgcolor: 'white' }}
          >
            {isCameraOff ? <VideocamOffIcon /> : <VideocamIcon />}
          </IconButton>
          
          <IconButton
            onClick={toggleScreenShare}
            color={isScreenSharing ? 'primary' : 'default'}
            sx={{ bgcolor: 'white' }}
          >
            {isScreenSharing ? <StopScreenShareIcon /> : <ScreenShareIcon />}
          </IconButton>
        </Box>
      </Box>
    </Box>
  );
}