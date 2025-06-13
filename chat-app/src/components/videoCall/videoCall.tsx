import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import Peer from 'simple-peer/simplepeer.min.js';
import { socket } from '../../socket'
import './VideoCall.css'
import { 
  getAvailableDevices, 
  requestMediaPermissions, 
  monitorCallQuality,
  startScreenShare,
  getErrorMessage,
  checkWebRTCSupport,
  switchCamera,
  switchMicrophone,
  MediaDevices,
  CallQualityStats
} from '../../utils/webrtc'
import { useStore } from '../../store/store';

const APP_VERSION = '1.0.0';

interface VideoCallProps {
  setOpenVideoCall: (state: boolean) => void;
  openVideoCall: boolean;
  id: string;
}

interface CallerData {
  name: string;
  id: string;
  roomId: string;
}

interface CallState {
  isConnected: boolean;
  isConnecting: boolean;
  callDuration: number;
  networkQuality: 'good' | 'fair' | 'poor';
  reconnecting: boolean;
  qualityStats: CallQualityStats | null;
}

interface ConnectionStats {
  bitrate: number;
  packetsLost: number;
  latency: number;
}

export const VideoCall = ({ setOpenVideoCall, openVideoCall, id }: VideoCallProps) => {
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null)
  const [callAccepted, setCallAccepted] = useState(false)
  const [callerSignal, setCallerSignal] = useState<any>(null)
  const [callState, setCallState] = useState<CallState>({
    isConnected: false,
    isConnecting: false,
    callDuration: 0,
    networkQuality: 'good',
    reconnecting: false,
    qualityStats: null
  })
  const [isAudioMuted, setIsAudioMuted] = useState(false)
  const [isVideoMuted, setIsVideoMuted] = useState(false)
  const [isScreenSharing, setIsScreenSharing] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [devicePermissionDenied, setDevicePermissionDenied] = useState(false)
  const [availableDevices, setAvailableDevices] = useState<MediaDevices>({ cameras: [], microphones: [], speakers: [] })
  const [selectedCamera, setSelectedCamera] = useState<string>('')
  const [selectedMicrophone, setSelectedMicrophone] = useState<string>('')
  const [connectionRetries, setConnectionRetries] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isPictureInPicture, setIsPictureInPicture] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  
  const connectionRef = useRef<any>(null)
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const callTimerRef = useRef<NodeJS.Timeout | null>(null)
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const qualityMonitorRef = useRef<(() => void) | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const videoContainerRef = useRef<HTMLDivElement>(null)
  
  const iceServers = useMemo(() => [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun.services.mozilla.com' },
    { urls: 'stun:stun.stunprotocol.org:3478' },
    { urls: 'stun:stun.ekiga.net' },
    { urls: 'stun:stun.ideasip.com' },
    { urls: 'stun:stun.rixtelecom.se' },
    { urls: 'stun:stun.schlund.de' },
    { urls: 'stun:stunserver.org' },
    { urls: 'stun:stun.softjoys.com' },
    { urls: 'stun:stun.voiparound.com' },
    { urls: 'stun:stun.voipbuster.com' },
    { urls: 'stun:stun.voipstunt.com' },
    { urls: 'stun:stun.voxgratia.org' }
  ], [])

  const incomingCall = useStore(state => state.incomingCall);
  const setIncomingCall = useStore(state => state.setIncomingCall);
  const caller = useStore(state => state.caller);
  const setCaller = useStore(state => state.setCaller);

  useEffect(() => {
    const checkSupport = async () => {
      try {
        // Check socket connection first
        if (!socket.connected) {
          console.log('Socket not connected, attempting to connect...')
          
          // Try to reconnect with polling first
          socket.io.opts.transports = ['polling']
          socket.connect()

          // Wait for initial connection
          await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
              // If polling fails, try WebSocket
              socket.io.opts.transports = ['websocket']
              socket.connect()

              const wsTimeout = setTimeout(() => {
                reject(new Error('All connection attempts failed'))
              }, 5000)

              socket.once('connect', () => {
                clearTimeout(wsTimeout)
                resolve(true)
              })
            }, 5000)

            socket.once('connect', () => {
              clearTimeout(timeout)
              resolve(true)
            })

            socket.once('connect_error', (error) => {
              console.warn('Connection error:', error)
              // Don't reject yet, let the WebSocket attempt happen
            })
          })
        }

        // Verify connection
        if (!socket.connected) {
          throw new Error('Failed to establish socket connection')
        }

        console.log('Socket connected successfully with transport:', socket.io.engine.transport.name)

        const { isSupported, features } = checkWebRTCSupport()
        if (!isSupported) {
          setError('WebRTC is not supported in this browser. Please use a modern browser.')
          return
        }
        
        // Check if we have the required features
        if (!features.getUserMedia) {
          setError('Camera and microphone access is not supported in this browser.')
          return
        }

        // Set up socket listeners first
        setupSocketListeners()

        // Join the room
        socket.emit('join', { 
          roomId: id, 
          userId: localStorage.getItem('_id') 
        }, (response: any) => {
          if (response?.error) {
            console.error('Error joining room:', response.error)
            setError('Failed to join video call room. Please try again.')
          } else {
            console.log('Successfully joined room:', id)
          }
        })

        // Initialize devices and media
        await initializeDevices()

        // Add device change listener
        navigator.mediaDevices.addEventListener('devicechange', async () => {
          console.log('Devices changed, reinitializing...')
          await initializeDevices()
        })

        // Handle socket disconnection during call
        socket.on('disconnect', (reason) => {
          console.log('Socket disconnected during call:', reason)
          if (reason === 'io server disconnect' || reason === 'io client disconnect') {
            setError('Disconnected from server. Please refresh the page.')
          } else {
            setError('Connection lost. Attempting to reconnect...')
          }
        })

      } catch (error) {
        console.error('Error during initialization:', error)
        setError(error instanceof Error ? error.message : 'Failed to initialize video call. Please check your connection.')
      }
    }
    
    checkSupport()
    
    return () => {
      cleanup()
      // Remove device change listener
      navigator.mediaDevices.removeEventListener('devicechange', initializeDevices)
      // Leave the room
      if (socket.connected) {
        socket.emit('leave', { 
          roomId: id, 
          userId: localStorage.getItem('_id') 
        })
      }
      // Remove socket listeners
      socket.off('disconnect')
    }
  }, [id])

  useEffect(() => {
    if (callAccepted && callState.isConnected) {
      callTimerRef.current = setInterval(() => {
        setCallState(prev => ({
          ...prev,
          callDuration: prev.callDuration + 1
        }))
      }, 1000)
    }
    return () => {
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current)
      }
    }
  }, [callAccepted, callState.isConnected])

  useEffect(() => {
    if (showControls) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false)
      }, 5000)
    }
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current)
      }
    }
  }, [showControls])

  const initializeDevices = async () => {
    try {
      // Request permissions first
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: true 
      }).catch(async () => {
        // If both fail, try just audio
        return await navigator.mediaDevices.getUserMedia({ 
          video: false, 
          audio: true 
        });
      }).catch(async () => {
        // If audio fails, try just video
        return await navigator.mediaDevices.getUserMedia({ 
          video: true, 
          audio: false 
        });
      });

      // If we got a stream, use it
      if (stream) {
        setStream(stream);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
          await localVideoRef.current.play().catch(error => {
            console.error('Error playing local video:', error);
          });
        }
      }

      // Now get available devices
      const devices = await getAvailableDevices();
      console.log('Available devices after initialization:', devices);
      setAvailableDevices(devices);
      
      // Set default devices
      if (devices.cameras.length > 0 && !selectedCamera) {
        setSelectedCamera(devices.cameras[0].deviceId);
      }
      if (devices.microphones.length > 0 && !selectedMicrophone) {
        setSelectedMicrophone(devices.microphones[0].deviceId);
      }

      // Auto-start call if we're the initiator
      const searchParams = new URLSearchParams(window.location.search);
      const isInitiator = !searchParams.get('type');
      if (isInitiator && stream) {
        callUser();
      }
    } catch (error) {
      console.error('Failed to initialize devices:', error);
      setError('Failed to access media devices. Please ensure camera/microphone permissions are granted.');
    }
  }

  const initializeMedia = async (retryCount = 0) => {
    try {
      setError(null)
      setCallState(prev => ({ ...prev, reconnecting: retryCount > 0 }))
      
      // First try to get both video and audio
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      }).catch(async () => {
        console.log('Failed to get both video and audio, trying audio only...')
        // If both fail, try just audio
        return await navigator.mediaDevices.getUserMedia({
          video: false,
          audio: true
        })
      }).catch(async () => {
        console.log('Failed to get audio, trying video only...')
        // If audio fails, try just video
        return await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false
        })
      })

      if (!mediaStream) {
        throw new Error('Failed to get any media stream')
      }

      console.log('Got media stream:', {
        video: mediaStream.getVideoTracks().length > 0,
        audio: mediaStream.getAudioTracks().length > 0
      })

      setStream(mediaStream)
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = mediaStream
        await localVideoRef.current.play().catch(error => {
          console.error('Error playing local video:', error)
        })
      }
      
      setCallState(prev => ({ ...prev, reconnecting: false }))
      setConnectionRetries(0)

      // Update device selection based on active tracks
      const videoTrack = mediaStream.getVideoTracks()[0]
      const audioTrack = mediaStream.getAudioTracks()[0]
      
      if (videoTrack) {
        setSelectedCamera(videoTrack.getSettings().deviceId || '')
      }
      if (audioTrack) {
        setSelectedMicrophone(audioTrack.getSettings().deviceId || '')
      }

    } catch (error: any) {
      console.error('Media initialization error:', error)
      const errorMessage = getErrorMessage(error)
      
      if (error.name === 'NotAllowedError') {
        setDevicePermissionDenied(true)
        setError('Please allow camera and microphone access to use video calling')
      } else if (error.name === 'NotFoundError') {
        setError('No camera or microphone found. Please connect a device and try again.')
      } else if (error.name === 'NotReadableError') {
        setError('Cannot access your camera or microphone. They might be in use by another application.')
      } else {
        setError(errorMessage)
      }
      
      setCallState(prev => ({ ...prev, reconnecting: false }))
      
      // Auto-retry logic for certain errors
      if (retryCount < 3 && !['NotAllowedError', 'NotFoundError'].includes(error.name)) {
        console.log(`Retrying media initialization in ${2 * (retryCount + 1)} seconds...`)
        setTimeout(() => {
          initializeMedia(retryCount + 1)
        }, 2000 * (retryCount + 1))
      }
    }
  }

  const setupSocketListeners = () => {
    // Handle incoming calls
    socket.on('receiveCall', (data) => {
      console.log('Received call:', data);
      
      // Prevent duplicate call handling
      if (useStore.getState().incomingCall || callAccepted) {
        console.log('Call already in progress, ignoring duplicate event');
        return;
      }

      // Store the offer signal
      if (data.signalData?.type === 'offer') {
        console.log('Received offer signal, showing incoming call');
        setIncomingCall(true);
        setCaller({ ...data.from, roomId: data.roomId });
        setCallerSignal(data.signalData);
        
        // Join the room if not already joined
        socket.emit('join', { 
          roomId: data.roomId, 
          userId: localStorage.getItem('_id') 
        });

        // Force the incoming call modal to be visible
        const searchParams = new URLSearchParams(window.location.search);
        if (searchParams.get('type') === 'answer') {
          setOpenVideoCall(true);
        }
      } else {
        console.log('Received non-offer signal, ignoring:', data.signalData?.type);
      }
    });

    // Handle call accepted
    socket.on('callAccepted', (data) => {
      console.log('Call accepted:', data)
      setCallAccepted(true)
      setCallState(prev => ({ ...prev, isConnecting: true }))
      
      if (!connectionRef.current) {
        console.error('No peer connection available')
        return
      }

      try {
        // Signal the peer with the answer
        console.log('Signaling peer with answer:', data.signal)
        connectionRef.current.signal(data.signal)
      } catch (error) {
        console.error('Error handling call accepted:', error)
        setError('Failed to establish connection after call was accepted')
      }
    })

    // Handle call ended
    socket.on('callEnded', () => {
      console.log('Call ended')
      endCall()
    })

    // Handle ICE candidates
    socket.on('new-ice-candidate', (data) => {
      console.log('Received ICE candidate:', data)
      if (connectionRef.current && data.candidate) {
        connectionRef.current.signal(data.candidate)
      }
    })

    // Handle call rejected
    socket.on('callRejected', (data) => {
      console.log('Call rejected:', data)
      setError(`Call rejected: ${data.reason || 'User busy'}`)
      endCall()
    })

    return () => {
      socket.off('receiveCall')
      socket.off('callAccepted')
      socket.off('callEnded')
      socket.off('new-ice-candidate')
      socket.off('callRejected')
    }
  }

  const createPeerConnection = useCallback((initiator: boolean, stream: MediaStream) => {
    console.log('Creating peer connection:', { 
      initiator, 
      hasStream: !!stream,
      audioTracks: stream?.getAudioTracks().length,
      videoTracks: stream?.getVideoTracks().length
    });
    
    // Ensure stream tracks are enabled and not muted
    if (stream) {
      stream.getTracks().forEach(track => {
        track.enabled = true;
        console.log(`Enabled local ${track.kind} track:`, {
          id: track.id,
          enabled: track.enabled,
          muted: track.muted,
          readyState: track.readyState,
          settings: track.getSettings()
        });
      });
    }
    
    const peer = new Peer({
      initiator,
      trickle: true,
      stream,
      config: { 
        iceServers,
        iceTransportPolicy: 'all',
        bundlePolicy: 'max-bundle',
        rtcpMuxPolicy: 'require',
        sdpSemantics: 'unified-plan'
      },
      offerOptions: {
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
        iceRestart: true,
        voiceActivityDetection: true
      },
      answerOptions: {
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
        iceRestart: true,
        voiceActivityDetection: true
      },
      sdpTransform: (sdp: string) => {
        // Add logging
        console.log('Original SDP:', sdp);
        
        // Ensure video codec preferences and bandwidth
        let modifiedSdp = sdp
          .replace('a=group:BUNDLE 0 1', 'a=group:BUNDLE audio video')
          .replace('a=mid:0', 'a=mid:audio')
          .replace('a=mid:1', 'a=mid:video');
          
        // Add bandwidth constraints
        if (!modifiedSdp.includes('b=AS:')) {
          modifiedSdp = modifiedSdp
            .replace('c=IN IP4', 'b=AS:2000\r\nc=IN IP4')
            .replace('a=mid:video\r\n', 'a=mid:video\r\nb=AS:1500\r\n');
        }

        // Ensure audio is not disabled
        if (!modifiedSdp.includes('a=sendrecv')) {
          modifiedSdp = modifiedSdp.replace('a=recvonly', 'a=sendrecv');
        }
        
        console.log('Modified SDP:', modifiedSdp);
        return modifiedSdp;
      }
    }) as any;

    // Set up media stream handlers before other event handlers
    peer._pc.ontrack = (event: RTCTrackEvent) => {
      console.log('Received track:', {
        kind: event.track.kind,
        id: event.track.id,
        enabled: event.track.enabled,
        muted: event.track.muted,
        readyState: event.track.readyState
      });
      
      event.track.onunmute = () => {
        console.log(`Track ${event.track.kind} unmuted`);
      };
      
      if (event.streams && event.streams[0]) {
        console.log('Setting remote stream from ontrack');
        setRemoteStream(event.streams[0]);
      }
    };

    // Queue for ICE candidates before connection
    const iceCandidateQueue: RTCIceCandidate[] = [];

    // Handle signaling
    peer.on('signal', (data: any) => {
      console.log('Generated signal:', { type: data.type, hasCandidate: !!data.candidate })
      
      if (initiator) {
        // If we're the caller
        if (data.type === 'offer') {
          console.log('Sending offer to remote peer')
          socket.emit('callUser', {
            roomId: id,
            signalData: data,
            from: { 
              name: localStorage.getItem('fullname') || 'Unknown User', 
              id: localStorage.getItem('_id') || '' 
            }
          })
        } else if (data.candidate) {
          // Queue ICE candidates if connection not established
          if (!callState.isConnected) {
            console.log('Queueing ICE candidate for later')
            iceCandidateQueue.push(data.candidate)
          } else {
            console.log('Sending ICE candidate to remote peer')
            socket.emit('new-ice-candidate', {
              candidate: data.candidate,
              roomId: id,
              from: localStorage.getItem('_id')
            })
          }
        }
      } else {
        // If we're the answerer
        if (data.type === 'answer') {
          console.log('Sending answer to remote peer')
          socket.emit('answerCall', { 
            signal: data, 
            to: caller,
            from: {
              id: localStorage.getItem('_id') || '',
              name: localStorage.getItem('fullname') || 'Unknown User'
            }
          })
        } else if (data.candidate) {
          // Queue ICE candidates if connection not established
          if (!callState.isConnected) {
            console.log('Queueing ICE candidate for later')
            iceCandidateQueue.push(data.candidate)
          } else {
            console.log('Sending ICE candidate to remote peer')
            socket.emit('new-ice-candidate', {
              candidate: data.candidate,
              roomId: id,
              from: localStorage.getItem('_id')
            })
          }
        }
      }
    })

    // Handle ICE candidates
    peer.on('icecandidate', (candidate: RTCIceCandidate) => {
      console.log('Generated ICE candidate:', {
        type: candidate.type,
        protocol: candidate.protocol,
        address: candidate.address,
        port: candidate.port,
        priority: candidate.priority
      });
      
      if (candidate && candidate.candidate) {
        // Filter out reflexive candidates if we already have host candidates
        if (candidate.type === 'srflx' && peer._pc.localDescription.sdp.includes('typ host')) {
          console.log('Skipping reflexive candidate as we have host candidates');
          return;
        }
        
        socket.emit('new-ice-candidate', {
          candidate,
          roomId: id,
          from: localStorage.getItem('_id')
        });
      }
    });

    // Handle ICE connection state changes
    peer._pc.oniceconnectionstatechange = () => {
      console.log('ICE connection state:', peer._pc.iceConnectionState);
      
      switch (peer._pc.iceConnectionState) {
        case 'checking':
          setCallState(prev => ({ ...prev, isConnecting: true }));
          break;
        case 'connected':
        case 'completed':
          setCallState(prev => ({ 
            ...prev, 
            isConnected: true, 
            isConnecting: false,
            reconnecting: false
          }));
          break;
        case 'failed':
          // Try ICE restart
          if (connectionRetries < 3) {
            console.log('ICE connection failed, attempting restart...');
            peer._pc.restartIce();
            setConnectionRetries(prev => prev + 1);
          } else {
            setError('Connection failed after multiple attempts. Please try again.');
            endCall();
          }
          break;
        case 'disconnected':
          setCallState(prev => ({ ...prev, reconnecting: true }));
          // Attempt reconnection
          if (connectionRetries < 3) {
            console.log('ICE connection disconnected, attempting reconnection...');
            peer._pc.restartIce();
            setConnectionRetries(prev => prev + 1);
          }
          break;
      }
    };

    // Handle ICE gathering state changes
    peer._pc.onicegatheringstatechange = () => {
      console.log('ICE gathering state:', peer._pc.iceGatheringState);
    };

    // Handle signaling state changes
    peer._pc.onsignalingstatechange = () => {
      console.log('Signaling state:', peer._pc.signalingState);
    };

    peer.on('stream', async (remoteStream: MediaStream) => {
      console.log('Received remote stream:', {
        audioTracks: remoteStream.getAudioTracks().length,
        videoTracks: remoteStream.getVideoTracks().length,
        audioEnabled: remoteStream.getAudioTracks().some(track => track.enabled),
        videoEnabled: remoteStream.getVideoTracks().some(track => track.enabled)
      });

      // Log individual tracks for debugging
      remoteStream.getTracks().forEach(track => {
        console.log(`Remote ${track.kind} track:`, {
          id: track.id,
          enabled: track.enabled,
          muted: track.muted,
          readyState: track.readyState,
          settings: track.getSettings()
        });
      });

      // Ensure tracks are enabled and add track event listeners
      remoteStream.getTracks().forEach(track => {
        track.enabled = true;
        
        // Add track-specific event listeners
        track.onended = () => {
          console.log(`Remote ${track.kind} track ended`);
          // Attempt to restart the track if it ends unexpectedly
          if (connectionRef.current && connectionRef.current._pc) {
            connectionRef.current._pc.getTransceivers().forEach((transceiver: RTCRtpTransceiver) => {
              if (transceiver.receiver.track.kind === track.kind) {
                transceiver.direction = 'recvonly';
              }
            });
          }
        };
        
        track.onmute = () => {
          console.log(`Remote ${track.kind} track muted`);
          track.enabled = true; // Try to re-enable the track
        };
        
        track.onunmute = () => {
          console.log(`Remote ${track.kind} track unmuted`);
          track.enabled = true;
        };
      });

      setRemoteStream(remoteStream);
      
      if (remoteVideoRef.current) {
        try {
          // Ensure old stream is cleaned up
          if (remoteVideoRef.current.srcObject) {
            const oldStream = remoteVideoRef.current.srcObject as MediaStream;
            oldStream.getTracks().forEach(track => track.stop());
          }
          
          // Set up the new stream
          remoteVideoRef.current.srcObject = remoteStream;
          remoteVideoRef.current.muted = false; // Ensure audio is not muted
          remoteVideoRef.current.volume = 1.0; // Ensure volume is at maximum
          
          // Add loadedmetadata event listener
          remoteVideoRef.current.onloadedmetadata = async () => {
            console.log('Remote video metadata loaded');
            try {
              // Ensure autoplay is enabled
              remoteVideoRef.current!.autoplay = true;
              
              // Try to play with audio
              const playPromise = remoteVideoRef.current!.play();
              if (playPromise !== undefined) {
                await playPromise;
                console.log('Remote video playback started with audio');
              }
            } catch (error) {
              console.error('Error playing remote video after metadata loaded:', error);
              // Try auto-play with muted audio as fallback
              if (remoteVideoRef.current) {
                try {
                  remoteVideoRef.current.muted = true;
                  await remoteVideoRef.current.play();
                  console.log('Remote video playback started (muted)');
                  
                  // Try to unmute after a short delay
                  setTimeout(() => {
                    if (remoteVideoRef.current) {
                      remoteVideoRef.current.muted = false;
                      console.log('Attempted to unmute remote video after delay');
                    }
                  }, 1000);
                } catch (fallbackError) {
                  console.error('Failed to play remote video even when muted:', fallbackError);
                }
              }
            }
          };
          
          // Add error event listener
          remoteVideoRef.current.onerror = (event) => {
            console.error('Remote video error:', event);
          };
          
        } catch (error) {
          console.error('Error setting up remote video:', error);
          // Try auto-play with muted audio as fallback
          if (remoteVideoRef.current) {
            try {
              remoteVideoRef.current.muted = true;
              await remoteVideoRef.current.play();
              console.log('Remote video playback started (muted)');
              
              // Try to unmute after a short delay
              setTimeout(() => {
                if (remoteVideoRef.current) {
                  remoteVideoRef.current.muted = false;
                  console.log('Attempted to unmute remote video after delay');
                }
              }, 1000);
            } catch (fallbackError) {
              console.error('Failed to play remote video even when muted:', fallbackError);
            }
          }
        }
      }

      // Ensure local video is still playing
      if (localVideoRef.current && stream) {
        try {
          localVideoRef.current.srcObject = stream
          localVideoRef.current.muted = true // Local video should always be muted
          await localVideoRef.current.play()
          console.log('Local video playback started/resumed')
        } catch (error) {
          console.error('Error playing local video:', error)
        }
      }

      setCallState(prev => ({ 
        ...prev, 
        isConnected: true, 
        isConnecting: false,
        reconnecting: false
      }))
      
      // Start quality monitoring
      if (peer._pc && typeof monitorCallQuality === 'function') {
        qualityMonitorRef.current = monitorCallQuality(peer._pc, (stats: CallQualityStats) => {
          setCallState(prev => ({
            ...prev,
            networkQuality: stats.quality,
            qualityStats: stats
          }))
        })
      }
    })

    peer.on('connect', () => {
      console.log('Peer connection established')
      setCallState(prev => ({ 
        ...prev, 
        isConnected: true, 
        isConnecting: false,
        reconnecting: false
      }))

      // Send queued ICE candidates
      if (iceCandidateQueue.length > 0) {
        console.log('Sending queued ICE candidates:', iceCandidateQueue.length)
        iceCandidateQueue.forEach(candidate => {
          socket.emit('new-ice-candidate', {
            candidate,
            roomId: id,
            from: localStorage.getItem('_id')
          })
        })
        iceCandidateQueue.length = 0 // Clear the queue
      }
    })

    peer.on('error', (error: any) => {
      console.error('Peer connection error:', error)
      const retries = connectionRetries
      setConnectionRetries(prev => prev + 1)
      
      if (retries < 3) {
        setCallState(prev => ({ ...prev, reconnecting: true }))
        // Auto-reconnect after delay
        reconnectTimeoutRef.current = setTimeout(() => {
          if (stream) {
            const newPeer = createPeerConnection(initiator, stream)
            connectionRef.current = newPeer
          }
        }, 2000 * (retries + 1))
      } else {
        setError('Connection failed after multiple attempts. Please try again.')
        setCallState(prev => ({ ...prev, isConnecting: false, reconnecting: false }))
      }
    })

    peer.on('close', () => {
      if (qualityMonitorRef.current) {
        qualityMonitorRef.current()
        qualityMonitorRef.current = null
      }
      endCall()
    })

    return peer
  }, [id, caller, connectionRetries, iceServers])

  const callUser = () => {
    if (!stream) {
      setError('Please allow camera and microphone access first')
      return
    }

    setCallState(prev => ({ ...prev, isConnecting: true }))
    const peer = createPeerConnection(true, stream)
    connectionRef.current = peer
  }

  const answerCall = async () => {
    try {
      if (!stream) {
        // Try to get media stream if not already available
        await initializeDevices();
        if (!stream) {
          setError('Please allow camera and microphone access first');
          return;
        }
      }

      if (!callerSignal) {
        setError('Invalid call signal received');
        return;
      }

      console.log('Answering call with signal:', callerSignal);
      
      setCallAccepted(true);
      setCallState(prev => ({ ...prev, isConnecting: true }));
      
      const peer = createPeerConnection(false, stream);
      connectionRef.current = peer;

      // Add specific handlers for this answer flow
      peer.on('connect', () => {
        console.log('Peer connection established (answer)');
        setCallState(prev => ({ 
          ...prev, 
          isConnected: true, 
          isConnecting: false 
        }));
      });

      peer.on('error', (error: Error) => {
        console.error('Peer connection error (answer):', error);
        setError('Failed to establish connection. Please try again.');
      });

      // Signal the peer with the caller's signal data
      console.log('Signaling peer with caller data');
      peer.signal(callerSignal);

      // Wait for local description to be set
      await new Promise<void>((resolve) => {
        const checkDescription = () => {
          if (peer._pc.localDescription) {
            resolve();
          } else {
            setTimeout(checkDescription, 100);
          }
        };
        checkDescription();
      });

      // Emit the answer event to the socket
      socket.emit('answerCall', { 
        signal: peer._pc.localDescription,
        to: caller,
        from: {
          id: localStorage.getItem('_id'),
          name: localStorage.getItem('fullname')
        }
      });

      // Start monitoring the connection
      const connectionTimeout = setTimeout(() => {
        if (!callState.isConnected) {
          console.error('Connection timeout - no media received');
          setError('Failed to establish media connection. Please try again.');
          endCall();
        }
      }, 30000); // 30 second timeout

      // Clear timeout when component unmounts or call ends
      return () => clearTimeout(connectionTimeout);

    } catch (error) {
      console.error('Error in answerCall:', error);
      setError('Failed to answer call. Please try again.');
      setCallAccepted(false);
      setCallState(prev => ({ ...prev, isConnecting: false }));
    }
  };

  const endCall = () => {
    if (connectionRef.current) {
      connectionRef.current.destroy()
      connectionRef.current = null
    }
    
    socket.emit('endCall', { roomId: id })
    
    setCallAccepted(false)
    setCaller(null)
    setCallerSignal(null)
    setRemoteStream(null)
    setCallState({
      isConnected: false,
      isConnecting: false,
      callDuration: 0,
      networkQuality: 'good',
      reconnecting: false,
      qualityStats: null
    })
    
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null
    }
    
    setOpenVideoCall(false)
  }

  const toggleAudio = () => {
    if (stream) {
      const audioTracks = stream.getAudioTracks()
      audioTracks.forEach(track => {
        track.enabled = !track.enabled
      })
      setIsAudioMuted(!isAudioMuted)
    }
  }

  const toggleVideo = () => {
    if (stream) {
      const videoTracks = stream.getVideoTracks()
      videoTracks.forEach(track => {
        track.enabled = !track.enabled
      })
      setIsVideoMuted(!isVideoMuted)
    }
  }

  const toggleScreenShare = async () => {
    try {
      if (!isScreenSharing) {
        const screenStream = await startScreenShare()
        
        if (!screenStream) {
          setError('Failed to start screen sharing')
          return
        }
        
        const videoTrack = screenStream.getVideoTracks()[0]
        if (connectionRef.current && connectionRef.current.streams && connectionRef.current.streams[0]) {
          const sender = connectionRef.current.streams[0].getVideoTracks()[0]
          connectionRef.current.replaceTrack(sender, videoTrack, stream!)
        }
        
        videoTrack.onended = () => {
          setIsScreenSharing(false)
          if (stream && connectionRef.current && connectionRef.current.streams && connectionRef.current.streams[0]) {
            const cameraTrack = stream.getVideoTracks()[0]
            connectionRef.current.replaceTrack(videoTrack, cameraTrack, stream)
          }
          socket.emit('screenShareEnd', { roomId: id, userId: localStorage.getItem('_id') })
        }
        
        setIsScreenSharing(true)
        socket.emit('screenShareStart', { roomId: id, userId: localStorage.getItem('_id') })
      } else {
        if (stream && connectionRef.current && connectionRef.current.streams && connectionRef.current.streams[0]) {
          const cameraTrack = stream.getVideoTracks()[0]
          const currentTrack = connectionRef.current.streams[0].getVideoTracks()[0]
          connectionRef.current.replaceTrack(currentTrack, cameraTrack, stream)
        }
        setIsScreenSharing(false)
        socket.emit('screenShareEnd', { roomId: id, userId: localStorage.getItem('_id') })
      }
    } catch (error: any) {
      setError(getErrorMessage(error) || 'Failed to share screen')
    }
  }

  const switchCameraDevice = async (deviceId: string) => {
    if (!stream) return
    
    try {
      const newStream = await switchCamera(stream, deviceId)
      if (newStream) {
        setStream(newStream)
        setSelectedCamera(deviceId)
        
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = newStream
        }
        
        // Update the peer connection with new stream
        if (connectionRef.current) {
          const videoTrack = newStream.getVideoTracks()[0]
          connectionRef.current.replaceTrack(
            connectionRef.current.streams[0].getVideoTracks()[0],
            videoTrack,
            newStream
          )
        }
      }
    } catch (error) {
      setError('Failed to switch camera')
    }
  }

  const switchMicrophoneDevice = async (deviceId: string) => {
    if (!stream) return
    
    try {
      const newStream = await switchMicrophone(stream, deviceId)
      if (newStream) {
        setStream(newStream)
        setSelectedMicrophone(deviceId)
        
        // Update the peer connection with new stream
        if (connectionRef.current) {
          const audioTrack = newStream.getAudioTracks()[0]
          connectionRef.current.replaceTrack(
            connectionRef.current.streams[0].getAudioTracks()[0],
            audioTrack,
            newStream
          )
        }
      }
    } catch (error) {
      setError('Failed to switch microphone')
    }
  }

  const toggleFullscreen = () => {
    if (!videoContainerRef.current) return
    
    if (!isFullscreen) {
      if (videoContainerRef.current.requestFullscreen) {
        videoContainerRef.current.requestFullscreen()
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen()
      }
    }
    setIsFullscreen(!isFullscreen)
  }

  const togglePictureInPicture = async () => {
    if (!remoteVideoRef.current) return
    
    try {
      if (!isPictureInPicture) {
        await remoteVideoRef.current.requestPictureInPicture()
        setIsPictureInPicture(true)
      } else {
        await document.exitPictureInPicture()
        setIsPictureInPicture(false)
      }
    } catch (error) {
      setError('Picture-in-picture not supported')
    }
  }

  const cleanup = () => {
    if (connectionRef.current) {
      connectionRef.current.destroy()
      connectionRef.current = null
    }
    
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
    }
    
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current)
      callTimerRef.current = null
    }
    
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current)
      controlsTimeoutRef.current = null
    }
    
    if (qualityMonitorRef.current) {
      qualityMonitorRef.current()
      qualityMonitorRef.current = null
    }
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
    
    // Reset all states
    setCallState({
      isConnected: false,
      isConnecting: false,
      callDuration: 0,
      networkQuality: 'good',
      reconnecting: false,
      qualityStats: null
    })
    setConnectionRetries(0)
    setIsFullscreen(false)
    setIsPictureInPicture(false)
    setShowSettings(false)
  }

  const formatCallDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const remainingSeconds = seconds % 60
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
    }
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  const rejectCall = () => {
    setIncomingCall(false)
    setCaller(null)
    setCallerSignal(null)
    socket.emit('rejectCall', { roomId: caller?.roomId })
  }

  // Check URL parameters for incoming call
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const isAnswer = searchParams.get('type') === 'answer';
    
    if (isAnswer) {
      console.log('This is an answer call, waiting for offer signal...');
      setIncomingCall(true);
      setOpenVideoCall(true);
    }
  }, [setOpenVideoCall]);

  // Initialize media devices when component mounts
  useEffect(() => {
    const initCall = async () => {
      try {
        await initializeDevices();
      } catch (error) {
        console.error('Failed to initialize devices:', error);
        setError('Failed to initialize devices. Please check permissions.');
      }
    };

    const searchParams = new URLSearchParams(window.location.search);
    const isAnswer = searchParams.get('type') === 'answer';
    
    if (isAnswer) {
      // For incoming calls, initialize devices immediately
      initCall();
    }
  }, []);

  if (devicePermissionDenied) {
    return (
      <div className="video-call-container">
        <div className="permission-denied">
          <h3>Camera and Microphone Access Required</h3>
          <p>Please allow camera and microphone permissions to use video calling.</p>
          <button onClick={() => initializeMedia(0)} className="retry-button">
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      {incomingCall && caller && (
        <div className="incoming-call-modal">
          <div className="incoming-call-content">
            <div className="caller-info">
              <h3>Incoming call from</h3>
              <h2>{caller.name}</h2>
            </div>
            <div className="call-actions">
              <button onClick={answerCall} className="answer-btn">
                📞 Answer
              </button>
              <button onClick={rejectCall} className="reject-btn">
                📞 Reject
              </button>
            </div>
          </div>
        </div>
      )}

      {(openVideoCall || callAccepted) && (
        <div 
          ref={videoContainerRef}
          className={`video-call-container ${isFullscreen ? 'fullscreen' : ''}`}
          onMouseMove={() => setShowControls(true)}
        >
          {error && (
            <div className="error-message">
              <span>{error}</span>
              <button onClick={() => setError(null)}>×</button>
            </div>
          )}

          <div className="call-status">
            <div className="status-left">
              {callState.reconnecting && <span className="reconnecting">Reconnecting...</span>}
              {callState.isConnecting && !callState.reconnecting && <span className="connecting">Connecting...</span>}
              {callState.isConnected && (
                <>
                  <span className="connected">Connected</span>
                  <span className="call-duration">{formatCallDuration(callState.callDuration)}</span>
                  <span 
                    className={`network-quality ${callState.networkQuality}`}
                    title={callState.qualityStats ? 
                      `Bitrate: ${callState.qualityStats.bitrate} kbps, RTT: ${callState.qualityStats.roundTripTime}ms` : 
                      'Network quality'}
                  >
                    {callState.networkQuality === 'good' && '🟢'}
                    {callState.networkQuality === 'fair' && '🟡'}
                    {callState.networkQuality === 'poor' && '🔴'}
                  </span>
                  {connectionRetries > 0 && (
                    <span className="retry-count" title="Connection attempts">
                      🔄 {connectionRetries}
                    </span>
                  )}
                </>
              )}
            </div>
            <div className="status-right">
              <button 
                className="settings-btn"
                onClick={() => setShowSettings(!showSettings)}
                title="Settings"
              >
                ⚙️
              </button>
              <div className="version-info">
                v{APP_VERSION}
              </div>
            </div>
          </div>

          <div className="video-layout">
            <div className="remote-video-container">
              <video 
                ref={remoteVideoRef}
                autoPlay 
                playsInline
                className="remote-video"
              />
              {!remoteStream && callAccepted && (
                <div className="video-placeholder">
                  <span>Waiting for {caller?.name || 'other participant'}...</span>
                </div>
              )}
            </div>

            <div className="local-video-container">
              <video 
                ref={localVideoRef}
                autoPlay 
                playsInline 
                muted
                className={`local-video ${isVideoMuted ? 'video-muted' : ''}`}
              />
              {isVideoMuted && (
                <div className="video-muted-overlay">
                  <span>📹</span>
                </div>
              )}
            </div>
          </div>

          {showSettings && (
            <div className="settings-panel">
              <div className="settings-section">
                <h4>Camera</h4>
                <select 
                  value={selectedCamera} 
                  onChange={(e) => switchCameraDevice(e.target.value)}
                  disabled={!callState.isConnected}
                >
                  {availableDevices.cameras.map(camera => (
                    <option key={camera.deviceId} value={camera.deviceId}>
                      {camera.label || `Camera ${camera.deviceId.substring(0, 5)}`}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="settings-section">
                <h4>Microphone</h4>
                <select 
                  value={selectedMicrophone} 
                  onChange={(e) => switchMicrophoneDevice(e.target.value)}
                  disabled={!callState.isConnected}
                >
                  {availableDevices.microphones.map(mic => (
                    <option key={mic.deviceId} value={mic.deviceId}>
                      {mic.label || `Microphone ${mic.deviceId.substring(0, 5)}`}
                    </option>
                  ))}
                </select>
              </div>
              
              {callState.qualityStats && (
                <div className="settings-section quality-stats">
                  <h4>Connection Stats</h4>
                  <div className="stats-grid">
                    <div>Bitrate: {callState.qualityStats.bitrate} kbps</div>
                    <div>Latency: {callState.qualityStats.roundTripTime}ms</div>
                    <div>Packets Lost: {callState.qualityStats.packetsLost}</div>
                    <div>Jitter: {callState.qualityStats.jitter}ms</div>
                  </div>
                </div>
              )}
            </div>
          )}

          {showControls && (
            <div className="call-controls">
              <div className="primary-controls">
                <button 
                  onClick={toggleAudio}
                  className={`control-btn ${isAudioMuted ? 'muted' : ''}`}
                  title={isAudioMuted ? 'Unmute' : 'Mute'}
                >
                  {isAudioMuted ? '🔇' : '🎤'}
                </button>
                
                <button 
                  onClick={toggleVideo}
                  className={`control-btn ${isVideoMuted ? 'muted' : ''}`}
                  title={isVideoMuted ? 'Turn on camera' : 'Turn off camera'}
                >
                  {isVideoMuted ? '📹' : '📷'}
                </button>
                
                <button 
                  onClick={toggleScreenShare}
                  className={`control-btn ${isScreenSharing ? 'active' : ''}`}
                  title={isScreenSharing ? 'Stop sharing' : 'Share screen'}
                >
                  🖥️
                </button>
                
                {!callAccepted && !callState.isConnecting && (
                  <button 
                    onClick={callUser}
                    className="control-btn call-btn"
                    disabled={!stream}
                    title="Start call"
                  >
                    📞
                  </button>
                )}
                
                <button 
                  onClick={endCall}
                  className="control-btn end-call-btn"
                  title="End call"
                >
                  📞
                </button>
              </div>
              
              <div className="secondary-controls">
                <button 
                  onClick={toggleFullscreen}
                  className="control-btn"
                  title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
                >
                  {isFullscreen ? '🔳' : '⛶'}
                </button>
                
                {remoteStream && (
                  <button 
                    onClick={togglePictureInPicture}
                    className="control-btn"
                    title="Picture in Picture"
                  >
                    📱
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  )
}
