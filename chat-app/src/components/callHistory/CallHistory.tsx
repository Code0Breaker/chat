import React from 'react';
import { useStore } from '../../store/store';
import { formatCallDuration, formatTimestamp } from '../../utils/webrtc';
import './CallHistory.css';

interface CallHistoryProps {
  onCallBack?: (roomId: string) => void;
}

export const CallHistory: React.FC<CallHistoryProps> = ({ onCallBack }) => {
  const { callHistory, clearCallHistory } = useStore();

  const getCallStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return '✅';
      case 'missed':
        return '📞❌';
      case 'rejected':
        return '🚫';
      case 'failed':
        return '⚠️';
      default:
        return '📞';
    }
  };

  const getCallStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return '#00b894';
      case 'missed':
        return '#e17055';
      case 'rejected':
        return '#d63031';
      case 'failed':
        return '#fdcb6e';
      default:
        return '#74b9ff';
    }
  };

  const groupCallsByDate = () => {
    const grouped = callHistory.reduce((acc, call) => {
      const date = call.startTime.toDateString();
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(call);
      return acc;
    }, {} as Record<string, typeof callHistory>);

    // Sort by date (most recent first)
    return Object.entries(grouped).sort(([a], [b]) => 
      new Date(b).getTime() - new Date(a).getTime()
    );
  };

  const handleCallBack = (roomId: string) => {
    if (onCallBack) {
      onCallBack(roomId);
    }
  };

  if (callHistory.length === 0) {
    return (
      <div className="call-history-container">
        <div className="call-history-header">
          <h3>Call History</h3>
        </div>
        <div className="call-history-empty">
          <div className="empty-state">
            <span className="empty-icon">📞</span>
            <h4>No calls yet</h4>
            <p>Your call history will appear here</p>
          </div>
        </div>
      </div>
    );
  }

  const groupedCalls = groupCallsByDate();

  return (
    <div className="call-history-container">
      <div className="call-history-header">
        <h3>Call History</h3>
        <button 
          onClick={clearCallHistory}
          className="clear-history-btn"
          title="Clear all history"
        >
          🗑️
        </button>
      </div>
      
      <div className="call-history-list">
        {groupedCalls.map(([date, calls]) => (
          <div key={date} className="call-history-group">
            <div className="call-history-date">
              {new Date(date).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </div>
            
            {calls.map((call) => (
              <div key={call.id} className="call-history-item">
                <div className="call-info">
                  <div className="call-status">
                    <span 
                      className="status-icon"
                      style={{ color: getCallStatusColor(call.status) }}
                    >
                      {getCallStatusIcon(call.status)}
                    </span>
                  </div>
                  
                  <div className="call-details">
                    <div className="call-participants">
                      {call.participants.length > 0 ? (
                        <span className="participants-text">
                          {call.participants.length === 1 
                            ? `${call.participants[0]}`
                            : `${call.participants.length} participants`
                          }
                        </span>
                      ) : (
                        <span className="participants-text">Unknown participant</span>
                      )}
                    </div>
                    
                    <div className="call-meta">
                      <span className="call-time">
                        {formatTimestamp(call.startTime)}
                      </span>
                      
                      {call.duration && call.duration > 0 && (
                        <>
                          <span className="meta-separator">•</span>
                          <span className="call-duration">
                            {formatCallDuration(call.duration)}
                          </span>
                        </>
                      )}
                      
                      <span className="meta-separator">•</span>
                      <span className={`call-type ${call.callType}`}>
                        {call.callType === 'video' ? '📹' : '📞'} {call.callType}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="call-actions">
                  {call.status !== 'failed' && (
                    <button
                      onClick={() => handleCallBack(call.roomId)}
                      className="callback-btn"
                      title="Call back"
                    >
                      📞
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}; 