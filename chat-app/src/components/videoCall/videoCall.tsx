import { useEffect, useRef, useState, useCallback } from 'react'
import Peer from 'simple-peer/simplepeer.min.js';
import { socket } from '../../socket'
import './VideoCall.css'

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
}

export const VideoCall = ({ setOpenVideoCall, openVideoCall, id }: VideoCallProps) => {
  // Media state
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null)
  
  // Call state
  const [callAccepted, setCallAccepted] = useState(false)
  const [incomingCall, setIncomingCall] = useState(false)
  const [caller, setCaller] = useState<CallerData | null>(null)
  const [callerSignal, setCallerSignal] = useState<any>(null)
  const [callState, setCallState] = useState<CallState>({
    isConnected: false,
    isConnecting: false,
    callDuration: 0,
    networkQuality: 'good'
  })
  
  // Media controls
  const [isAudioMuted, setIsAudioMuted] = useState(false)
  const [isVideoMuted, setIsVideoMuted] = useState(false)
  const [isScreenSharing, setIsScreenSharing] = useState(false)
  const [showControls, setShowControls] = useState(true)
  
  // Error handling
  const [error, setError] = useState<string | null>(null)
  const [devicePermissionDenied, setDevicePermissionDenied] = useState(false)
  
  // Refs
  const connectionRef = useRef<Peer.Instance | null>(null)
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const callTimerRef = useRef<NodeJS.Timeout | null>(null)
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  // STUN/TURN servers configuration
  const iceServers = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
  ]

  // Initialize media devices and socket listeners
  useEffect(() => {
    initializeMedia()
    setupSocketListeners()
    
    return () => {
      cleanup()
    }
  }, [])

  // Call timer
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

  // Auto-hide controls
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

  const initializeMedia = async () => {
    try {
      setError(null)
      const devices = await navigator.mediaDevices.enumerateDevices()
      const videoDevices = devices.filter(device => device.kind === 'videoinput')
      const audioDevices = devices.filter(device => device.kind === 'audioinput')
      
      if (videoDevices.length === 0 && audioDevices.length === 0) {
        setError('No camera or microphone found')
        return
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: videoDevices.length > 0 ? {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 }
        } : false,
        audio: audioDevices.length > 0 ? {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } : false
      })

      setStream(mediaStream)
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = mediaStream
      }
    } catch (error: any) {
      console.error('Error accessing media devices:', error)
      if (error.name === 'NotAllowedError') {
        setDevicePermissionDenied(true)
        setError('Camera and microphone access denied. Please allow permissions and refresh.')
      } else if (error.name === 'NotFoundError') {
        setError('No camera or microphone found')
      } else {
        setError('Failed to access camera and microphone')
      }
    }
  }

  const setupSocketListeners = () => {
    socket.on('reciveCall', (data) => {
      setIncomingCall(true)
      setCaller({ ...data.from, roomId: data.roomId })
      setCallerSignal(data.signalData)
    })

    socket.on('callAccepted', (signal) => {
      setCallAccepted(true)
      setCallState(prev => ({ ...prev, isConnecting: true }))
      if (connectionRef.current) {
        connectionRef.current.signal(signal.signal)
      }
    })

    socket.on('callEnded', () => {
      endCall()
    })

    return () => {
      socket.off('reciveCall')
      socket.off('callAccepted')
      socket.off('callEnded')
    }
  }

  const createPeerConnection = useCallback((initiator: boolean, stream: MediaStream) => {
    const peer = new Peer({
      initiator,
      trickle: false,
      stream,
      config: { iceServers }
    })

    peer.on('signal', (data: any) => {
      if (initiator) {
        socket.emit('callUser', {
          roomId: id,
          signalData: data,
          from: { 
            name: localStorage.getItem('fullname') || 'Unknown User', 
            id: localStorage.getItem('_id') || '' 
          }
        })
      } else {
        socket.emit('answerCall', { signal: data, to: caller })
      }
    })

    peer.on('stream', (remoteStream: MediaStream) => {
      setRemoteStream(remoteStream)
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream
      }
      setCallState(prev => ({ 
        ...prev, 
        isConnected: true, 
        isConnecting: false 
      }))
    })

    peer.on('connect', () => {
      console.log('Peer connected successfully')
      setCallState(prev => ({ ...prev, isConnected: true, isConnecting: false }))
    })

    peer.on('error', (error: any) => {
      console.error('Peer connection error:', error)
      setError('Connection failed. Please try again.')
      setCallState(prev => ({ ...prev, isConnecting: false }))
    })

    peer.on('close', () => {
      console.log('Peer connection closed')
      endCall()
    })

    return peer
  }, [id, caller])

  const callUser = () => {
    if (!stream) {
      setError('Please allow camera and microphone access first')
      return
    }

    setCallState(prev => ({ ...prev, isConnecting: true }))
    const peer = createPeerConnection(true, stream)
    connectionRef.current = peer
  }

  const answerCall = () => {
    if (!stream) {
      setError('Please allow camera and microphone access first')
      return
    }

    setCallAccepted(true)
    setIncomingCall(false)
    setCallState(prev => ({ ...prev, isConnecting: true }))
    
    const peer = createPeerConnection(false, stream)
    peer.signal(callerSignal)
    connectionRef.current = peer
  }

  const endCall = () => {
    if (connectionRef.current) {
      connectionRef.current.destroy()
      connectionRef.current = null
    }
    
    socket.emit('endCall', { roomId: id })
    
    setCallAccepted(false)
    setIncomingCall(false)
    setCaller(null)
    setCallerSignal(null)
    setRemoteStream(null)
    setCallState({
      isConnected: false,
      isConnecting: false,
      callDuration: 0,
      networkQuality: 'good'
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
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true
        })
        
        const videoTrack = screenStream.getVideoTracks()[0]
        if (connectionRef.current && connectionRef.current.streams && connectionRef.current.streams[0]) {
          const sender = connectionRef.current.streams[0].getVideoTracks()[0]
          connectionRef.current.replaceTrack(sender, videoTrack, stream!)
        }
        
        videoTrack.onended = () => {
          setIsScreenSharing(false)
          // Switch back to camera
          if (stream && connectionRef.current && connectionRef.current.streams && connectionRef.current.streams[0]) {
            const cameraTrack = stream.getVideoTracks()[0]
            connectionRef.current.replaceTrack(videoTrack, cameraTrack, stream)
          }
        }
        
        setIsScreenSharing(true)
      } else {
        // Switch back to camera
        if (stream && connectionRef.current && connectionRef.current.streams && connectionRef.current.streams[0]) {
          const cameraTrack = stream.getVideoTracks()[0]
          const currentTrack = connectionRef.current.streams[0].getVideoTracks()[0]
          connectionRef.current.replaceTrack(currentTrack, cameraTrack, stream)
        }
        setIsScreenSharing(false)
      }
    } catch (error) {
      console.error('Error toggling screen share:', error)
      setError('Failed to share screen')
    }
  }

  const cleanup = () => {
    if (connectionRef.current) {
      connectionRef.current.destroy()
    }
    
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
    }
    
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current)
    }
    
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current)
    }
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

  if (devicePermissionDenied) {
    return (
      <div className="video-call-container">
        <div className="permission-denied">
          <h3>Camera and Microphone Access Required</h3>
          <p>Please allow camera and microphone permissions to use video calling.</p>
          <button onClick={initializeMedia} className="retry-button">
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Incoming Call Modal */}
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

      {/* Video Call Interface */}
      {(openVideoCall || callAccepted) && (
        <div 
          className="video-call-container"
          onMouseMove={() => setShowControls(true)}
        >
          {error && (
            <div className="error-message">
              <span>{error}</span>
              <button onClick={() => setError(null)}>×</button>
            </div>
          )}

          {/* Call Status */}
          <div className="call-status">
            {callState.isConnecting && <span className="connecting">Connecting...</span>}
            {callState.isConnected && (
              <>
                <span className="connected">Connected</span>
                <span className="call-duration">{formatCallDuration(callState.callDuration)}</span>
                <span className={`network-quality ${callState.networkQuality}`}>
                  {callState.networkQuality === 'good' && '🟢'}
                  {callState.networkQuality === 'fair' && '🟡'}
                  {callState.networkQuality === 'poor' && '🔴'}
                </span>
              </>
            )}
          </div>

          {/* Video Layout */}
          <div className="video-layout">
            {/* Remote Video (Main) */}
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

            {/* Local Video (Picture-in-Picture) */}
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

          {/* Call Controls */}
          {showControls && (
            <div className="call-controls">
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
          )}
        </div>
      )}
    </>
  )
}
