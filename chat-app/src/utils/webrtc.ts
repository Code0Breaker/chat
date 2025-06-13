// WebRTC Utility Functions

export interface MediaDevices {
  cameras: MediaDeviceInfo[];
  microphones: MediaDeviceInfo[];
  speakers: MediaDeviceInfo[];
}

export interface CallQualityStats {
  bitrate: number;
  packetsLost: number;
  packetsReceived: number;
  roundTripTime: number;
  jitter: number;
  quality: 'good' | 'fair' | 'poor';
}

// Device Management
export const getAvailableDevices = async (): Promise<MediaDevices> => {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    
    return {
      cameras: devices.filter(device => device.kind === 'videoinput'),
      microphones: devices.filter(device => device.kind === 'audioinput'),
      speakers: devices.filter(device => device.kind === 'audiooutput')
    };
  } catch (error) {
    console.error('Error getting available devices:', error);
    return { cameras: [], microphones: [], speakers: [] };
  }
};

export const checkDevicePermissions = async (): Promise<{
  camera: boolean;
  microphone: boolean;
  screen: boolean;
}> => {
  const permissions = {
    camera: false,
    microphone: false,
    screen: false
  };

  try {
    // Check camera permission
    const cameraPermission = await navigator.permissions.query({ name: 'camera' as PermissionName });
    permissions.camera = cameraPermission.state === 'granted';
  } catch (error) {
    console.warn('Camera permission check failed:', error);
  }

  try {
    // Check microphone permission
    const micPermission = await navigator.permissions.query({ name: 'microphone' as PermissionName });
    permissions.microphone = micPermission.state === 'granted';
  } catch (error) {
    console.warn('Microphone permission check failed:', error);
  }

  try {
    // Screen sharing permission is typically requested on-demand
    permissions.screen = 'getDisplayMedia' in navigator.mediaDevices;
  } catch (error) {
    console.warn('Screen share capability check failed:', error);
  }

  return permissions;
};

export const requestMediaPermissions = async (
  video: boolean = true,
  audio: boolean = true
): Promise<MediaStream | null> => {
  try {
    const constraints: MediaStreamConstraints = {};
    
    if (video) {
      constraints.video = {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        frameRate: { ideal: 30 }
      };
    }
    
    if (audio) {
      constraints.audio = {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      };
    }

    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    return stream;
  } catch (error) {
    console.error('Error requesting media permissions:', error);
    return null;
  }
};

// Stream Management
export const switchCamera = async (
  currentStream: MediaStream,
  deviceId: string
): Promise<MediaStream | null> => {
  try {
    // Stop current video tracks
    currentStream.getVideoTracks().forEach(track => track.stop());
    
    // Get new video stream
    const newVideoStream = await navigator.mediaDevices.getUserMedia({
      video: { deviceId: { exact: deviceId } },
      audio: false
    });
    
    // Replace video tracks
    const newVideoTrack = newVideoStream.getVideoTracks()[0];
    const audioTracks = currentStream.getAudioTracks();
    
    const newStream = new MediaStream();
    newStream.addTrack(newVideoTrack);
    audioTracks.forEach(track => newStream.addTrack(track));
    
    return newStream;
  } catch (error) {
    console.error('Error switching camera:', error);
    return null;
  }
};

export const switchMicrophone = async (
  currentStream: MediaStream,
  deviceId: string
): Promise<MediaStream | null> => {
  try {
    // Stop current audio tracks
    currentStream.getAudioTracks().forEach(track => track.stop());
    
    // Get new audio stream
    const newAudioStream = await navigator.mediaDevices.getUserMedia({
      video: false,
      audio: { deviceId: { exact: deviceId } }
    });
    
    // Replace audio tracks
    const newAudioTrack = newAudioStream.getAudioTracks()[0];
    const videoTracks = currentStream.getVideoTracks();
    
    const newStream = new MediaStream();
    newStream.addTrack(newAudioTrack);
    videoTracks.forEach(track => newStream.addTrack(track));
    
    return newStream;
  } catch (error) {
    console.error('Error switching microphone:', error);
    return null;
  }
};

// Call Quality Monitoring
export const monitorCallQuality = (
  peerConnection: RTCPeerConnection,
  callback: (stats: CallQualityStats) => void
) => {
  const interval = setInterval(async () => {
    try {
      const stats = await peerConnection.getStats();
      const callStats = analyzeRTCStats(stats);
      callback(callStats);
    } catch (error) {
      console.error('Error monitoring call quality:', error);
    }
  }, 2000); // Check every 2 seconds

  return () => clearInterval(interval);
};

const analyzeRTCStats = (stats: RTCStatsReport): CallQualityStats => {
  let bitrate = 0;
  let packetsLost = 0;
  let packetsReceived = 0;
  let roundTripTime = 0;
  let jitter = 0;

  stats.forEach((report) => {
    if (report.type === 'inbound-rtp' && report.mediaType === 'video') {
      bitrate = report.bytesReceived * 8 / (report.timestamp / 1000) / 1000; // kbps
      packetsLost = report.packetsLost || 0;
      packetsReceived = report.packetsReceived || 0;
      jitter = report.jitter || 0;
    }
    
    if (report.type === 'remote-inbound-rtp') {
      roundTripTime = report.roundTripTime || 0;
    }
  });

  // Determine quality based on metrics
  let quality: 'good' | 'fair' | 'poor' = 'good';
  
  if (packetsLost > 0.05 * packetsReceived || roundTripTime > 0.3 || bitrate < 500) {
    quality = 'poor';
  } else if (packetsLost > 0.02 * packetsReceived || roundTripTime > 0.15 || bitrate < 1000) {
    quality = 'fair';
  }

  return {
    bitrate: Math.round(bitrate),
    packetsLost,
    packetsReceived,
    roundTripTime: Math.round(roundTripTime * 1000), // Convert to ms
    jitter: Math.round(jitter * 1000), // Convert to ms
    quality
  };
};

// Screen Sharing
export const startScreenShare = async (): Promise<MediaStream | null> => {
  try {
    const screenStream = await navigator.mediaDevices.getDisplayMedia({
      video: {
        width: { ideal: 1920 },
        height: { ideal: 1080 },
        frameRate: { ideal: 30 }
      },
      audio: true
    });
    
    return screenStream;
  } catch (error) {
    console.error('Error starting screen share:', error);
    return null;
  }
};

export const stopScreenShare = (stream: MediaStream) => {
  stream.getTracks().forEach(track => {
    track.stop();
  });
};

// Audio/Video Controls
export const toggleTrack = (stream: MediaStream, trackType: 'audio' | 'video'): boolean => {
  const tracks = trackType === 'audio' ? stream.getAudioTracks() : stream.getVideoTracks();
  
  if (tracks.length > 0) {
    const isEnabled = tracks[0].enabled;
    tracks.forEach(track => {
      track.enabled = !isEnabled;
    });
    return !isEnabled; // Return new state
  }
  
  return false;
};

// Browser Compatibility
export const checkWebRTCSupport = (): {
  isSupported: boolean;
  features: {
    getUserMedia: boolean;
    getDisplayMedia: boolean;
    RTCPeerConnection: boolean;
    mediaRecorder: boolean;
  };
} => {
  const features = {
    getUserMedia: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
    getDisplayMedia: !!(navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia),
    RTCPeerConnection: !!(window.RTCPeerConnection),
    mediaRecorder: !!(window.MediaRecorder)
  };

  const isSupported = Object.values(features).every(feature => feature);

  return { isSupported, features };
};

// Error Handling
export const getErrorMessage = (error: any): string => {
  if (error.name === 'NotAllowedError') {
    return 'Camera and microphone access denied. Please allow permissions.';
  } else if (error.name === 'NotFoundError') {
    return 'No camera or microphone found.';
  } else if (error.name === 'NotReadableError') {
    return 'Camera or microphone is already in use by another application.';
  } else if (error.name === 'OverconstrainedError') {
    return 'Camera or microphone constraints cannot be satisfied.';
  } else if (error.name === 'SecurityError') {
    return 'Media access is not allowed on insecure origins.';
  } else {
    return 'An unknown error occurred while accessing media devices.';
  }
};

// Format utilities
export const formatCallDuration = (milliseconds: number): string => {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

export const formatBitrate = (bitrate: number): string => {
  if (bitrate >= 1000) {
    return `${(bitrate / 1000).toFixed(1)} Mbps`;
  }
  return `${bitrate} kbps`;
};

export const formatTimestamp = (date: Date): string => {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}; 