const mediasoup = require('mediasoup');

// Global variables for mediasoup
let worker;
let router;

// Router codecs configuration
const routerCodecs = [
  {
    kind: 'audio',
    mimeType: 'audio/opus',
    clockRate: 48000,
    channels: 2
  },
  {
    kind: 'video',
    mimeType: 'video/H264',
    clockRate: 90000,
    parameters: {
      'packetization-mode': 1,
      'profile-level-id': '42e01f',
      'level-asymmetry-allowed': 1
    }
  },
  {
    kind: 'video',
    mimeType: 'video/VP8',
    clockRate: 90000
  }
];

// WebRTC transport configuration
const webRtcTransportOptions = {
  listenIps: [
    {
      ip: process.env.MEDIASOUP_LISTEN_IP || '0.0.0.0',
      announcedIp: process.env.MEDIASOUP_ANNOUNCED_IP || '127.0.0.1'
    }
  ],
  enableUdp: true,
  enableTcp: true,
  preferUdp: true,
  initialAvailableOutgoingBitrate: 1000000,
  maxIncomingBitrate: 1500000,
  maxSctpMessageSize: 262144,
  enableSctp: true,
  numSctpStreams: { OS: 1024, MIS: 1024 }
};

// Worker settings
const workerSettings = {
  logLevel: 'warn',
  logTags: [
    'info',
    'ice',
    'dtls',
    'rtp',
    'srtp',
    'rtcp'
  ],
  rtcMinPort: parseInt(process.env.MEDIASOUP_MIN_PORT) || 40000,
  rtcMaxPort: parseInt(process.env.MEDIASOUP_MAX_PORT) || 49999
};

// Initialize mediasoup worker and router
const initializeMediasoup = async () => {
  try {
    console.log('Initializing mediasoup worker...');
    
    // Create worker
    worker = await mediasoup.createWorker(workerSettings);
    
    worker.on('died', (error) => {
      console.error('Mediasoup worker died:', error);
      setTimeout(() => process.exit(1), 2000);
    });

    // Create router
    router = await worker.createRouter({ mediaCodecs: routerCodecs });
    
    console.log('Mediasoup worker and router initialized successfully');
    console.log(`Worker PID: ${worker.pid}`);
    console.log(`Router ID: ${router.id}`);
    
    return { worker, router };
  } catch (error) {
    console.error('Failed to initialize mediasoup:', error);
    process.exit(1);
  }
};

// Create WebRTC transport
const createWebRtcTransport = async () => {
  try {
    const transport = await router.createWebRtcTransport(webRtcTransportOptions);
    
    transport.on('dtlsstatechange', (dtlsState) => {
      if (dtlsState === 'closed') {
        transport.close();
      }
    });

    transport.on('close', () => {
      console.log('Transport closed');
    });

    return {
      transport,
      params: {
        id: transport.id,
        iceParameters: transport.iceParameters,
        iceCandidates: transport.iceCandidates,
        dtlsParameters: transport.dtlsParameters,
        sctpParameters: transport.sctpParameters
      }
    };
  } catch (error) {
    console.error('Error creating WebRTC transport:', error);
    throw error;
  }
};

// Get router RTP capabilities
const getRouterRtpCapabilities = () => {
  return router.rtpCapabilities;
};

// Close worker
const closeWorker = () => {
  if (worker) {
    worker.close();
  }
};

module.exports = {
  initializeMediasoup,
  createWebRtcTransport,
  getRouterRtpCapabilities,
  closeWorker,
  getWorker: () => worker,
  getRouter: () => router,
  routerCodecs,
  webRtcTransportOptions
};