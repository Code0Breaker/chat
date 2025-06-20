import { useEffect, useRef, useState, useCallback, useMemo, useReducer } from "react";

import { socket } from "../../socket";
import "./VideoCall.css";
import {
  getAvailableDevices,
  monitorCallQuality,
  startScreenShare,
  getErrorMessage,
  checkWebRTCSupport,
  switchCamera,
  switchMicrophone,
  MediaDevices,
  CallQualityStats,
} from "../../utils/webrtc";
import { useStore } from "../../store/store";
import { CallerData } from "../../types";
import SimplePeer from "simple-peer";

const APP_VERSION = "1.0.0";
const MAX_RETRY_ATTEMPTS = 3;
const SIGNAL_WAIT_TIMEOUT = 10000; // 10 seconds
const CONNECTION_TIMEOUT = 30000; // 30 seconds
const RECONNECT_DELAY_BASE = 2000; // 2 seconds base delay

// Enable debug logging only in development
const DEBUG = process.env.NODE_ENV === 'development';
const log = DEBUG ? console.log : () => { /* no-op */ };
const warn = DEBUG ? console.warn : () => { /* no-op */ };
const error = console.error; // Always log errors

interface VideoCallProps {
  setOpenVideoCall: (state: boolean) => void;
  openVideoCall: boolean;
  id: string;
}

interface CallState {
  isConnected: boolean;
  isConnecting: boolean;
  callDuration: number;
  networkQuality: "good" | "fair" | "poor";
  reconnecting: boolean;
  qualityStats: CallQualityStats | null;
}

// Consolidated UI state using useReducer
interface UIState {
  isAudioMuted: boolean;
  isVideoMuted: boolean;
  isScreenSharing: boolean;
  showControls: boolean;
  error: string | null;
  devicePermissionDenied: boolean;
  connectionRetries: number;
  isFullscreen: boolean;
  isPictureInPicture: boolean;
  showSettings: boolean;
  waitingForCall: boolean;
  isComponentMounted: boolean;
}

type UIAction = 
  | { type: 'SET_AUDIO_MUTED'; payload: boolean }
  | { type: 'SET_VIDEO_MUTED'; payload: boolean }
  | { type: 'SET_SCREEN_SHARING'; payload: boolean }
  | { type: 'SET_SHOW_CONTROLS'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_DEVICE_PERMISSION_DENIED'; payload: boolean }
  | { type: 'SET_CONNECTION_RETRIES'; payload: number }
  | { type: 'INCREMENT_CONNECTION_RETRIES' }
  | { type: 'SET_FULLSCREEN'; payload: boolean }
  | { type: 'SET_PICTURE_IN_PICTURE'; payload: boolean }
  | { type: 'SET_SHOW_SETTINGS'; payload: boolean }
  | { type: 'SET_WAITING_FOR_CALL'; payload: boolean }
  | { type: 'SET_COMPONENT_MOUNTED'; payload: boolean }
  | { type: 'RESET_UI' };

const initialUIState: UIState = {
  isAudioMuted: false,
  isVideoMuted: false,
  isScreenSharing: false,
  showControls: true,
  error: null,
  devicePermissionDenied: false,
  connectionRetries: 0,
  isFullscreen: false,
  isPictureInPicture: false,
  showSettings: false,
  waitingForCall: false,
  isComponentMounted: true,
};

const uiReducer = (state: UIState, action: UIAction): UIState => {
  switch (action.type) {
    case 'SET_AUDIO_MUTED':
      return { ...state, isAudioMuted: action.payload };
    case 'SET_VIDEO_MUTED':
      return { ...state, isVideoMuted: action.payload };
    case 'SET_SCREEN_SHARING':
      return { ...state, isScreenSharing: action.payload };
    case 'SET_SHOW_CONTROLS':
      return { ...state, showControls: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'SET_DEVICE_PERMISSION_DENIED':
      return { ...state, devicePermissionDenied: action.payload };
    case 'SET_CONNECTION_RETRIES':
      return { ...state, connectionRetries: action.payload };
    case 'INCREMENT_CONNECTION_RETRIES':
      return { ...state, connectionRetries: Math.min(state.connectionRetries + 1, MAX_RETRY_ATTEMPTS) };
    case 'SET_FULLSCREEN':
      return { ...state, isFullscreen: action.payload };
    case 'SET_PICTURE_IN_PICTURE':
      return { ...state, isPictureInPicture: action.payload };
    case 'SET_SHOW_SETTINGS':
      return { ...state, showSettings: action.payload };
    case 'SET_WAITING_FOR_CALL':
      return { ...state, waitingForCall: action.payload };
    case 'SET_COMPONENT_MOUNTED':
      return { ...state, isComponentMounted: action.payload };
    case 'RESET_UI':
      return { ...initialUIState, showControls: true, isComponentMounted: state.isComponentMounted };
    default:
      return state;
  }
};

export const VideoCall = ({
  setOpenVideoCall,
  openVideoCall,
  id,
}: VideoCallProps) => {
  // Media state
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [callAccepted, setCallAccepted] = useState(false);
  const [callerSignal, setCallerSignal] = useState<any>(null);
  
  // Call state
  const [callState, setCallState] = useState<CallState>({
    isConnected: false,
    isConnecting: false,
    callDuration: 0,
    networkQuality: "good",
    reconnecting: false,
    qualityStats: null,
  });

  // Device state
  const [availableDevices, setAvailableDevices] = useState<MediaDevices>({
    cameras: [],
    microphones: [],
    speakers: [],
  });
  const [selectedCamera, setSelectedCamera] = useState<string>("");
  const [selectedMicrophone, setSelectedMicrophone] = useState<string>("");

  // UI state using reducer
  const [uiState, dispatch] = useReducer(uiReducer, initialUIState);

  // Refs for cleanup and avoiding stale closures
  const connectionRef = useRef<any>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const callTimerRef = useRef<NodeJS.Timeout | null>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const qualityMonitorRef = useRef<(() => void) | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const signalTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const connectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const cleanupCallbacksRef = useRef<Array<() => void>>([]);
  const isInitializingRef = useRef(false);
  const deviceChangeHandlerRef = useRef<(() => Promise<void>) | null>(null);

  // ICE servers configuration with better fallbacks
  const iceServers = useMemo(
    () => [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
      { urls: "stun:stun2.l.google.com:19302" },
      { urls: "stun:stun.services.mozilla.com" },
      { urls: "stun:stun.stunprotocol.org:3478" },
    ],
    []
  );

  // Store hooks
  const incomingCall = useStore((state) => state.incomingCall);
  const setIncomingCall = useStore((state) => state.setIncomingCall);
  const caller = useStore((state) => state.caller);
  const setCaller = useStore((state) => state.setCaller);

  // Safe localStorage access
  const getUserId = useCallback(() => {
    try {
      return localStorage.getItem("_id") || "";
    } catch {
      return "";
    }
  }, []);

  const getUserName = useCallback(() => {
    try {
      return localStorage.getItem("fullname") || "Unknown User";
    } catch {
      return "Unknown User";
    }
  }, []);

  // Helper function to safely clear timeouts
  const safeClearTimeout = useCallback((ref: React.MutableRefObject<NodeJS.Timeout | null>) => {
    if (ref.current) {
      clearTimeout(ref.current);
      ref.current = null;
    }
  }, []);

  // Improved cleanup function
  const performCleanup = useCallback(() => {
    log("Starting cleanup...");
    
    // Mark component as unmounted
    dispatch({ type: 'SET_COMPONENT_MOUNTED', payload: false });

    // Clear all timeouts safely
    safeClearTimeout(callTimerRef);
    safeClearTimeout(controlsTimeoutRef);
    safeClearTimeout(reconnectTimeoutRef);
    safeClearTimeout(signalTimeoutRef);
    safeClearTimeout(connectionTimeoutRef);

    // Stop quality monitoring
    if (qualityMonitorRef.current) {
      try {
        qualityMonitorRef.current();
      } catch (err) {
        error("Error stopping quality monitor:", err);
      }
      qualityMonitorRef.current = null;
    }

    // Clean up peer connection
    if (connectionRef.current) {
      try {
        connectionRef.current.destroy();
      } catch (err) {
        error("Error destroying peer connection:", err);
      }
      connectionRef.current = null;
    }

    // Clean up media streams
    [stream, remoteStream].forEach(mediaStream => {
      if (mediaStream) {
        try {
          mediaStream.getTracks().forEach(track => {
            track.stop();
            track.onended = null;
            track.onmute = null;
            track.onunmute = null;
          });
        } catch (err) {
          error("Error stopping media tracks:", err);
        }
      }
    });

    // Clean up video elements
    [localVideoRef.current, remoteVideoRef.current].forEach(videoEl => {
      if (videoEl) {
        try {
          videoEl.srcObject = null;
          videoEl.onloadedmetadata = null;
          videoEl.onerror = null;
        } catch (err) {
          error("Error cleaning up video element:", err);
        }
      }
    });

    // Run all registered cleanup callbacks
    cleanupCallbacksRef.current.forEach(callback => {
      try {
        callback();
      } catch (err) {
        error("Error in cleanup callback:", err);
      }
    });
    cleanupCallbacksRef.current = [];

    // Remove device change listener
    if (deviceChangeHandlerRef.current && typeof navigator !== 'undefined' && navigator.mediaDevices) {
      try {
        navigator.mediaDevices.removeEventListener("devicechange", deviceChangeHandlerRef.current);
      } catch (err) {
        error("Error removing device change listener:", err);
      }
      deviceChangeHandlerRef.current = null;
    }

    log("Cleanup completed");
  }, [stream, remoteStream, safeClearTimeout]);

  // Improved device initialization with better error handling
  const initializeDevices = useCallback(async () => {
    if (isInitializingRef.current) {
      log("Device initialization already in progress");
      return;
    }

    isInitializingRef.current = true;
    
    try {
      if (!uiState.isComponentMounted) return;

      log("Initializing devices...");

      // Request permissions with fallback strategy
      let mediaStream: MediaStream | null = null;
      
      try {
        // Try both video and audio first
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
        });
        log("Got both video and audio");
      } catch (err) {
        warn("Failed to get both video and audio, trying audio only:", err);
        try {
          mediaStream = await navigator.mediaDevices.getUserMedia({
            video: false,
            audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
          });
          log("Got audio only");
        } catch (audioErr) {
          warn("Failed to get audio, trying video only:", audioErr);
          try {
            mediaStream = await navigator.mediaDevices.getUserMedia({
              video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
              audio: false
            });
            log("Got video only");
          } catch (videoErr) {
            error("Failed to get any media:", videoErr);
            throw videoErr;
          }
        }
      }

      if (!uiState.isComponentMounted) {
        // Component unmounted during initialization
        if (mediaStream) {
          mediaStream.getTracks().forEach(track => track.stop());
        }
        return;
      }

      if (mediaStream) {
        // Clean up previous stream
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
        }

        setStream(mediaStream);
        
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = mediaStream;
          try {
            await localVideoRef.current.play();
            log("Local video playing");
          } catch (playErr) {
            warn("Error playing local video:", playErr);
          }
        }
      }

      // Get available devices with error handling
      try {
        const devices = await getAvailableDevices();
        if (!uiState.isComponentMounted) return;
        
        log("Available devices:", { 
          cameras: devices.cameras.length,
          microphones: devices.microphones.length,
          speakers: devices.speakers.length
        });
        setAvailableDevices(devices);

        // Set default devices
        if (devices.cameras.length > 0 && !selectedCamera) {
          setSelectedCamera(devices.cameras[0].deviceId);
        }
        if (devices.microphones.length > 0 && !selectedMicrophone) {
          setSelectedMicrophone(devices.microphones[0].deviceId);
        }
      } catch (devErr) {
        warn("Error getting device list:", devErr);
      }

      // Set up device change listener (only once)
      if (!deviceChangeHandlerRef.current && navigator.mediaDevices) {
        deviceChangeHandlerRef.current = async () => {
          if (!uiState.isComponentMounted) return;
          log("Devices changed, reinitializing...");
          
          // Debounce device changes
          safeClearTimeout(reconnectTimeoutRef);
          reconnectTimeoutRef.current = setTimeout(async () => {
            if (uiState.isComponentMounted) {
              await initializeDevices();
            }
          }, 1000);
        };

        navigator.mediaDevices.addEventListener("devicechange", deviceChangeHandlerRef.current);
        cleanupCallbacksRef.current.push(() => {
          if (deviceChangeHandlerRef.current) {
            navigator.mediaDevices.removeEventListener("devicechange", deviceChangeHandlerRef.current);
          }
        });
      }

      // Auto-start call if we're the initiator
      const searchParams = new URLSearchParams(window.location.search);
      const isInitiator = !searchParams.get("type");
      if (isInitiator && mediaStream && !callAccepted) {
        log("Auto-starting call as initiator");
        callUser();
      }

    } catch (err) {
      if (!uiState.isComponentMounted) return;
      
      error("Failed to initialize devices:", err);
      const errorMessage = getErrorMessage(err);

      if (err && typeof err === 'object' && 'name' in err) {
        const { name } = err as { name: string };
        if (name === "NotAllowedError") {
          dispatch({ type: 'SET_DEVICE_PERMISSION_DENIED', payload: true });
          dispatch({ type: 'SET_ERROR', payload: "Please allow camera and microphone access to use video calling" });
        } else if (name === "NotFoundError") {
          dispatch({ type: 'SET_ERROR', payload: "No camera or microphone found. Please connect a device and try again." });
        } else if (name === "NotReadableError") {
          dispatch({ type: 'SET_ERROR', payload: "Cannot access your camera or microphone. They might be in use by another application." });
        } else {
          dispatch({ type: 'SET_ERROR', payload: errorMessage });
        }
      } else {
        dispatch({ type: 'SET_ERROR', payload: errorMessage });
      }
    } finally {
      isInitializingRef.current = false;
    }
  }, [uiState.isComponentMounted, stream, selectedCamera, selectedMicrophone, callAccepted, safeClearTimeout]);

  // Improved endCall function
  const endCall = useCallback(() => {
    log("Ending call...");
    
    try {
      if (connectionRef.current) {
        connectionRef.current.destroy();
        connectionRef.current = null;
      }

      // Emit end call event
      if (socket.connected) {
        socket.emit("endCall", { roomId: id });
      }

      // Reset call state
      setCallAccepted(false);
      setCaller(null);
      setCallerSignal(null);
      setRemoteStream(null);
      setCallState({
        isConnected: false,
        isConnecting: false,
        callDuration: 0,
        networkQuality: "good",
        reconnecting: false,
        qualityStats: null,
      });

      // Clean up video elements
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = null;
      }

      // Reset UI state
      dispatch({ type: 'RESET_UI' });
      
      setOpenVideoCall(false);
      
      log("Call ended successfully");
    } catch (err) {
      error("Error ending call:", err);
    }
  }, [id, setCaller, setOpenVideoCall]);

  // Improved socket listener setup with proper cleanup
  const setupSocketListeners = useCallback(() => {
    log("Setting up socket listeners...");

    const handleReceiveCall = (data: any) => {
      if (!uiState.isComponentMounted) return;
      
      log("Received call:", { hasSignalData: !!data.signalData, type: data.signalData?.type });

      // Prevent duplicate call handling
      if (useStore.getState().incomingCall || callAccepted) {
        log("Call already in progress, ignoring duplicate event");
        return;
      }

      // Store the offer signal
      if (data.signalData?.type === "offer") {
        log("Received offer signal, showing incoming call");
        setIncomingCall(true);
        setCaller({ ...data.from, roomId: data.roomId });
        setCallerSignal(data.signalData);

        // Join the room if not already joined
        socket.emit("join", {
          roomId: data.roomId,
          userId: getUserId(),
        });

        // Force the incoming call modal to be visible
        const searchParams = new URLSearchParams(window.location.search);
        if (searchParams.get("type") === "answer") {
          setOpenVideoCall(true);
        }
      } else {
        log("Received non-offer signal, ignoring:", data.signalData?.type);
      }
    };

    const handleCallAccepted = (data: any) => {
      if (!uiState.isComponentMounted) return;
      
      log("Call accepted:", { hasSignal: !!data.signal });
      setCallAccepted(true);
      setCallState((prev) => ({ ...prev, isConnecting: true }));

      if (!connectionRef.current) {
        error("No peer connection available");
        return;
      }

      try {
        // Signal the peer with the answer
        log("Signaling peer with answer");
        connectionRef.current.signal(data.signal);
      } catch (err) {
        error("Error handling call accepted:", err);
        dispatch({ type: 'SET_ERROR', payload: "Failed to establish connection after call was accepted" });
      }
    };

    const handleCallEnded = () => {
      if (!uiState.isComponentMounted) return;
      log("Call ended");
      endCall();
    };

    const handleIceCandidate = (data: any) => {
      if (!uiState.isComponentMounted) return;
      
      log("Received ICE candidate");
      if (connectionRef.current && data.candidate) {
        try {
          connectionRef.current.signal(data.candidate);
        } catch (err) {
          error("Error handling ICE candidate:", err);
        }
      }
    };

    const handleCallRejected = (data: any) => {
      if (!uiState.isComponentMounted) return;
      
      log("Call rejected:", data.reason);
      dispatch({ type: 'SET_ERROR', payload: `Call rejected: ${data.reason || "User busy"}` });
      endCall();
    };

    // Remove existing listeners first
    socket.off("receiveCall");
    socket.off("callAccepted");
    socket.off("callEnded");
    socket.off("new-ice-candidate");
    socket.off("callRejected");

    // Add new listeners
    socket.on("receiveCall", handleReceiveCall);
    socket.on("callAccepted", handleCallAccepted);
    socket.on("callEnded", handleCallEnded);
    socket.on("new-ice-candidate", handleIceCandidate);
    socket.on("callRejected", handleCallRejected);

    // Register cleanup
    const cleanupSocketListeners = () => {
      socket.off("receiveCall", handleReceiveCall);
      socket.off("callAccepted", handleCallAccepted);
      socket.off("callEnded", handleCallEnded);
      socket.off("new-ice-candidate", handleIceCandidate);
      socket.off("callRejected", handleCallRejected);
    };

    cleanupCallbacksRef.current.push(cleanupSocketListeners);
    log("Socket listeners set up");
  }, [uiState.isComponentMounted, callAccepted, setIncomingCall, setCaller, setOpenVideoCall, getUserId, endCall]);

  // Call user function
  const callUser = useCallback(() => {
    if (!stream) {
      dispatch({ type: 'SET_ERROR', payload: "Please allow camera and microphone access first" });
      return;
    }

    setCallState((prev) => ({ ...prev, isConnecting: true }));
    const peer = createPeerConnection(true, stream);
    connectionRef.current = peer;
  }, [stream]);

  // Initialize component with better error handling
  useEffect(() => {
    const abortController = new AbortController();
    
    const checkSupport = async () => {
      try {
        // Check if component is still mounted
        if (abortController.signal.aborted) return;

        // Check socket connection first
        if (!socket.connected) {
          log("Socket not connected, attempting to connect...");
          socket.io.opts.transports = ["polling"];
          socket.connect();

          // Wait for initial connection with timeout
          await Promise.race([
            new Promise((resolve, reject) => {
              const timeout = setTimeout(() => {
                socket.io.opts.transports = ["websocket"];
                socket.connect();

                const wsTimeout = setTimeout(() => {
                  reject(new Error("All connection attempts failed"));
                }, 5000);

                socket.once("connect", () => {
                  clearTimeout(wsTimeout);
                  resolve(true);
                });
              }, 5000);

              socket.once("connect", () => {
                clearTimeout(timeout);
                resolve(true);
              });

              socket.once("connect_error", (err) => {
                warn("Connection error:", err);
              });
            }),
            new Promise((_, reject) => {
              setTimeout(() => reject(new Error("Connection timeout")), 15000);
            })
          ]);
        }

        if (!socket.connected) {
          throw new Error("Failed to establish socket connection");
        }

        log("Socket connected successfully with transport:", socket.io.engine?.transport?.name);

        const { isSupported, features } = checkWebRTCSupport();
        if (!isSupported) {
          dispatch({ type: 'SET_ERROR', payload: "WebRTC is not supported in this browser. Please use a modern browser." });
          return;
        }

        if (!features.getUserMedia) {
          dispatch({ type: 'SET_ERROR', payload: "Camera and microphone access is not supported in this browser." });
          return;
        }

        if (abortController.signal.aborted) return;

        setupSocketListeners();

        // Join room with error handling
        socket.emit("join", {
          roomId: id,
          userId: getUserId(),
        }, (response: any) => {
          if (abortController.signal.aborted) return;
          
          if (response?.error) {
            error("Error joining room:", response.error);
            dispatch({ type: 'SET_ERROR', payload: "Failed to join video call room. Please try again." });
          } else {
            log("Successfully joined room:", id);
          }
        });

        await initializeDevices();

        // Handle socket disconnection during call
        const handleDisconnect = (reason: string) => {
          if (abortController.signal.aborted) return;
          
          log("Socket disconnected during call:", reason);
          if (reason === "io server disconnect" || reason === "io client disconnect") {
            dispatch({ type: 'SET_ERROR', payload: "Disconnected from server. Please refresh the page." });
          } else {
            dispatch({ type: 'SET_ERROR', payload: "Connection lost. Attempting to reconnect..." });
          }
        };

        socket.on("disconnect", handleDisconnect);
        cleanupCallbacksRef.current.push(() => socket.off("disconnect", handleDisconnect));

      } catch (err) {
        if (abortController.signal.aborted) return;
        
        error("Error during initialization:", err);
        dispatch({ 
          type: 'SET_ERROR', 
          payload: err instanceof Error ? err.message : "Failed to initialize video call. Please check your connection." 
        });
      }
    };

    checkSupport();

    return () => {
      abortController.abort();
      performCleanup();
    };
  }, [id, setupSocketListeners, getUserId, initializeDevices, performCleanup]);

  // Call timer effect
  useEffect(() => {
    if (callAccepted && callState.isConnected) {
      callTimerRef.current = setInterval(() => {
        setCallState((prev) => ({
          ...prev,
          callDuration: prev.callDuration + 1,
        }));
      }, 1000);
    }
    return () => {
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
      }
    };
  }, [callAccepted, callState.isConnected]);

  // Controls auto-hide effect
  useEffect(() => {
    if (uiState.showControls) {
      controlsTimeoutRef.current = setTimeout(() => {
        dispatch({ type: 'SET_SHOW_CONTROLS', payload: false });
      }, 5000);
    }
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [uiState.showControls]);

  // Create peer connection with improved error handling
  const createPeerConnection = useCallback(
    (initiator: boolean, stream: MediaStream) => {
      log("Creating peer connection:", {
        initiator,
        hasStream: !!stream,
        audioTracks: stream?.getAudioTracks().length,
        videoTracks: stream?.getVideoTracks().length,
      });

      if (stream) {
        stream.getTracks().forEach((track) => {
          track.enabled = true;
        });
      }

      const peer = new SimplePeer({
        initiator,
        trickle: true,
        stream,
        config: {
          iceServers,
          iceTransportPolicy: "all",
          bundlePolicy: "max-bundle",
          rtcpMuxPolicy: "require",
        },
        offerOptions: {
          offerToReceiveAudio: true,
          offerToReceiveVideo: true,
          iceRestart: true,
        },
        answerOptions: {
          offerToReceiveAudio: true,
          offerToReceiveVideo: true,
          iceRestart: true,
        },
      }) as any;

      // Handle signaling
      peer.on("signal", (data: any) => {
        if (initiator) {
          if (data.type === "offer") {
            socket.emit("callUser", {
              roomId: id,
              signalData: data,
              from: {
                name: getUserName(),
                id: getUserId(),
              },
            });
          } else if (data.candidate) {
            socket.emit("new-ice-candidate", {
              candidate: data.candidate,
              roomId: id,
              from: getUserId(),
            });
          }
        } else {
          if (data.type === "answer") {
            socket.emit("answerCall", {
              signal: data,
              to: caller,
              from: {
                id: getUserId(),
                name: getUserName(),
              },
            });
          } else if (data.candidate) {
            socket.emit("new-ice-candidate", {
              candidate: data.candidate,
              roomId: id,
              from: getUserId(),
            });
          }
        }
      });

      // Handle remote stream
      peer.on("stream", async (remoteStream: MediaStream) => {
        log("Received remote stream");
        setRemoteStream(remoteStream);

        if (remoteVideoRef.current) {
          try {
            remoteVideoRef.current.srcObject = remoteStream;
            remoteVideoRef.current.muted = false;
            await remoteVideoRef.current.play();
          } catch (err) {
            warn("Error playing remote video:", err);
          }
        }

        setCallState((prev) => ({
          ...prev,
          isConnected: true,
          isConnecting: false,
          reconnecting: false,
        }));
      });

      peer.on("connect", () => {
        log("Peer connection established");
        setCallState((prev) => ({
          ...prev,
          isConnected: true,
          isConnecting: false,
          reconnecting: false,
        }));
      });

      peer.on("error", (error: any) => {
        error("Peer connection error:", error);
        dispatch({ type: 'SET_ERROR', payload: "Connection failed. Please try again." });
      });

      peer.on("close", () => {
        endCall();
      });

      return peer;
    },
    [id, caller, iceServers, getUserId, getUserName, endCall]
  );

  // Audio/Video controls
  const toggleAudio = useCallback(() => {
    if (stream) {
      const audioTracks = stream.getAudioTracks();
      audioTracks.forEach((track) => {
        track.enabled = !track.enabled;
      });
      dispatch({ type: 'SET_AUDIO_MUTED', payload: !uiState.isAudioMuted });
    }
  }, [stream, uiState.isAudioMuted]);

  const toggleVideo = useCallback(() => {
    if (stream) {
      const videoTracks = stream.getVideoTracks();
      videoTracks.forEach((track) => {
        track.enabled = !track.enabled;
      });
      dispatch({ type: 'SET_VIDEO_MUTED', payload: !uiState.isVideoMuted });
    }
  }, [stream, uiState.isVideoMuted]);

  const toggleScreenShare = useCallback(async () => {
    try {
      if (!uiState.isScreenSharing) {
        const screenStream = await startScreenShare();
        if (!screenStream) {
          dispatch({ type: 'SET_ERROR', payload: "Failed to start screen sharing" });
          return;
        }

        const videoTrack = screenStream.getVideoTracks()[0];
        if (connectionRef.current && stream) {
          const oldTrack = stream.getVideoTracks()[0];
          if (oldTrack && connectionRef.current.replaceTrack) {
            connectionRef.current.replaceTrack(oldTrack, videoTrack, stream);
          }
        }

        videoTrack.onended = () => {
          dispatch({ type: 'SET_SCREEN_SHARING', payload: false });
          if (stream) {
            const cameraTrack = stream.getVideoTracks()[0];
            if (cameraTrack && connectionRef.current && connectionRef.current.replaceTrack) {
              connectionRef.current.replaceTrack(videoTrack, cameraTrack, stream);
            }
          }
        };

        dispatch({ type: 'SET_SCREEN_SHARING', payload: true });
      } else {
        if (stream) {
          const cameraTrack = stream.getVideoTracks()[0];
          const currentTrack = stream.getVideoTracks()[0];
          if (cameraTrack && connectionRef.current && connectionRef.current.replaceTrack) {
            connectionRef.current.replaceTrack(currentTrack, cameraTrack, stream);
          }
        }
        dispatch({ type: 'SET_SCREEN_SHARING', payload: false });
      }
    } catch (err) {
      dispatch({ type: 'SET_ERROR', payload: getErrorMessage(err) || "Failed to share screen" });
    }
  }, [uiState.isScreenSharing, stream]);

  const switchCameraDevice = useCallback(async (deviceId: string) => {
    if (!stream) return;

    try {
      const newStream = await switchCamera(stream, deviceId);
      if (newStream) {
        setStream(newStream);
        setSelectedCamera(deviceId);

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = newStream;
        }

        if (connectionRef.current) {
          const videoTrack = newStream.getVideoTracks()[0];
          const oldTrack = stream.getVideoTracks()[0];
          if (videoTrack && oldTrack && connectionRef.current.replaceTrack) {
            connectionRef.current.replaceTrack(oldTrack, videoTrack, newStream);
          }
        }
      }
    } catch (err) {
      dispatch({ type: 'SET_ERROR', payload: "Failed to switch camera" });
    }
  }, [stream]);

  const switchMicrophoneDevice = useCallback(async (deviceId: string) => {
    if (!stream) return;

    try {
      const newStream = await switchMicrophone(stream, deviceId);
      if (newStream) {
        setStream(newStream);
        setSelectedMicrophone(deviceId);

        if (connectionRef.current) {
          const audioTrack = newStream.getAudioTracks()[0];
          const oldTrack = stream.getAudioTracks()[0];
          if (audioTrack && oldTrack && connectionRef.current.replaceTrack) {
            connectionRef.current.replaceTrack(oldTrack, audioTrack, newStream);
          }
        }
      }
    } catch (err) {
      dispatch({ type: 'SET_ERROR', payload: "Failed to switch microphone" });
    }
  }, [stream]);

  const toggleFullscreen = useCallback(() => {
    if (!videoContainerRef.current) return;

    if (!uiState.isFullscreen) {
      if (videoContainerRef.current.requestFullscreen) {
        videoContainerRef.current.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
    dispatch({ type: 'SET_FULLSCREEN', payload: !uiState.isFullscreen });
  }, [uiState.isFullscreen]);

  const togglePictureInPicture = useCallback(async () => {
    if (!remoteVideoRef.current) return;

    try {
      if (!uiState.isPictureInPicture) {
        await remoteVideoRef.current.requestPictureInPicture();
        dispatch({ type: 'SET_PICTURE_IN_PICTURE', payload: true });
      } else {
        await document.exitPictureInPicture();
        dispatch({ type: 'SET_PICTURE_IN_PICTURE', payload: false });
      }
    } catch (err) {
      dispatch({ type: 'SET_ERROR', payload: "Picture-in-picture not supported" });
    }
  }, [uiState.isPictureInPicture]);

  const formatCallDuration = useCallback((seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${remainingSeconds
        .toString()
        .padStart(2, "0")}`;
    }
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  }, []);

  // Handle device permission denied case
  if (uiState.devicePermissionDenied) {
    return (
      <div className="video-call-container">
        <div className="permission-denied">
          <h3>Camera and Microphone Access Required</h3>
          <p>
            Please allow camera and microphone permissions to use video calling.
          </p>
          <button onClick={() => initializeDevices()} className="retry-button">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Removed duplicate incoming call modal - now handled globally in MessengerPage */}
      
      {uiState.waitingForCall && !incomingCall && (
        <div className="incoming-call-modal">
          <div className="incoming-call-content">
            <div className="caller-info">
              <h3>Waiting for incoming call...</h3>
              <p>If someone is calling you, the call will appear here.</p>
            </div>
          </div>
        </div>
      )}

      {(openVideoCall || callAccepted) && (
        <div
          ref={videoContainerRef}
          className={`video-call-container ${uiState.isFullscreen ? "fullscreen" : ""}`}
          onMouseMove={() => dispatch({ type: 'SET_SHOW_CONTROLS', payload: true })}
        >
          {uiState.error && (
            <div className="error-message">
              <span>{uiState.error}</span>
              <button onClick={() => dispatch({ type: 'SET_ERROR', payload: null })}>×</button>
            </div>
          )}

          <div className="call-status">
            <div className="status-left">
              {callState.reconnecting && (
                <span className="reconnecting">Reconnecting...</span>
              )}
              {callState.isConnecting && !callState.reconnecting && (
                <span className="connecting">Connecting...</span>
              )}
              {callState.isConnected && (
                <>
                  <span className="connected">Connected</span>
                  <span className="call-duration">
                    {formatCallDuration(callState.callDuration)}
                  </span>
                  <span
                    className={`network-quality ${callState.networkQuality}`}
                    title={
                      callState.qualityStats
                        ? `Bitrate: ${callState.qualityStats.bitrate} kbps, RTT: ${callState.qualityStats.roundTripTime}ms`
                        : "Network quality"
                    }
                  >
                    {callState.networkQuality === "good" && "🟢"}
                    {callState.networkQuality === "fair" && "🟡"}
                    {callState.networkQuality === "poor" && "🔴"}
                  </span>
                  {uiState.connectionRetries > 0 && (
                    <span className="retry-count" title="Connection attempts">
                      🔄 {uiState.connectionRetries}
                    </span>
                  )}
                </>
              )}
            </div>
            <div className="status-right">
              <button
                className="settings-btn"
                onClick={() => dispatch({ type: 'SET_SHOW_SETTINGS', payload: !uiState.showSettings })}
                title="Settings"
              >
                ⚙️
              </button>
              <div className="version-info">v{APP_VERSION}</div>
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
                  <span>
                    Waiting for {caller?.name || "other participant"}...
                  </span>
                </div>
              )}
            </div>

            <div className="local-video-container">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className={`local-video ${uiState.isVideoMuted ? "video-muted" : ""}`}
              />
              {uiState.isVideoMuted && (
                <div className="video-muted-overlay">
                  <span>📹</span>
                </div>
              )}
            </div>
          </div>

          {uiState.showSettings && (
            <div className="settings-panel">
              <div className="settings-section">
                <h4>Camera</h4>
                <select
                  value={selectedCamera}
                  onChange={(e) => switchCameraDevice(e.target.value)}
                  disabled={!callState.isConnected}
                >
                  {availableDevices.cameras.map((camera) => (
                    <option key={camera.deviceId} value={camera.deviceId}>
                      {camera.label ||
                        `Camera ${camera.deviceId.substring(0, 5)}`}
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
                  {availableDevices.microphones.map((mic) => (
                    <option key={mic.deviceId} value={mic.deviceId}>
                      {mic.label ||
                        `Microphone ${mic.deviceId.substring(0, 5)}`}
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
                    <div>
                      Packets Lost: {callState.qualityStats.packetsLost}
                    </div>
                    <div>Jitter: {callState.qualityStats.jitter}ms</div>
                  </div>
                </div>
              )}
            </div>
          )}

          {uiState.showControls && (
            <div className="call-controls">
              <div className="primary-controls">
                <button
                  onClick={toggleAudio}
                  className={`control-btn ${uiState.isAudioMuted ? "muted" : ""}`}
                  title={uiState.isAudioMuted ? "Unmute" : "Mute"}
                >
                  {uiState.isAudioMuted ? "🔇" : "🎤"}
                </button>

                <button
                  onClick={toggleVideo}
                  className={`control-btn ${uiState.isVideoMuted ? "muted" : ""}`}
                  title={uiState.isVideoMuted ? "Turn on camera" : "Turn off camera"}
                >
                  {uiState.isVideoMuted ? "📹" : "📷"}
                </button>

                <button
                  onClick={toggleScreenShare}
                  className={`control-btn ${uiState.isScreenSharing ? "active" : ""}`}
                  title={uiState.isScreenSharing ? "Stop sharing" : "Share screen"}
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
                  title={uiState.isFullscreen ? "Exit fullscreen" : "Fullscreen"}
                >
                  {uiState.isFullscreen ? "🔳" : "⛶"}
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
  );
};
