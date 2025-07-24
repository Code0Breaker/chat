import { useNavigate } from "react-router-dom"
import { IChat, IUser } from "../../types"
import React, { useEffect, useState, useMemo } from "react"
import { useChatStore } from "../../store/chatStore"
import { timeAgo } from "../../utils/time.utils"
import { getSocket } from "../../config/socket"
import { SOCKET_EVENTS } from "../../config/constants"
import { AuthStorage } from "../../utils/storage.utils"
import { useSocketEvent } from "../../hooks/useSocket"

export default function Contact({ chat, id }: { chat: IChat, id: string }) {
  const { unreadMessages } = useChatStore()
  const [isTyping, setIsTyping] = useState(false)
  const navigate = useNavigate()
  const [typerId, setTyperId] = useState<string | null>(null)

  // Handle typing indicators using useSocketEvent
  useSocketEvent<{ typerId: string; roomId: string }>(
    SOCKET_EVENTS.IS_TYPING, 
    (data) => {
      setTyperId(data.typerId)
      setIsTyping(true)
    },
    []
  );

  useEffect(() => {
    if (isTyping) {
      const timeout = setTimeout(() => {
        setIsTyping(false)
      }, 2000)
      return () => clearTimeout(timeout)
    }
  }, [isTyping])

  const filterFriends = (friends?: IUser[]) => {
    const data = friends?.filter(item => item._id !== AuthStorage.getUserId())
    return data
  }

  const filterUnread = () => {
    const data = unreadMessages?.filter(item => item.chat?._id === chat._id).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    return data
  }

  const handleContactClick = () => {
    if (chat._id) {
      navigate(chat._id);
    }
  };

  const lastMessage = chat.messages?.[chat.messages.length - 1];
  const unreadCount = filterUnread()?.length || 0;
  const friends = filterFriends(chat.users);

  return (
    <div 
      className={`conversation ${id === chat._id ? 'active' : ''}`}
      onClick={handleContactClick}
    >
      <img 
        className="conversation-photo" 
        src={friends?.[0]?.pic || '/default-avatar.png'} 
        alt={friends?.[0]?.fullname || 'User'}
      />
      
      <div className="conversation-info">
        <h1 className="conversation-title">
          {friends?.[0]?.fullname || 'Unknown User'}
        </h1>
        
        <p className="conversation-snippet">
          {isTyping ? (
            <em>typing...</em>
          ) : lastMessage ? (
            lastMessage.content
          ) : (
            'No messages yet'
          )}
        </p>
        
        {lastMessage && (
          <div className="conversation-time">
            {timeAgo(lastMessage.created_at)}
          </div>
        )}
      </div>
      
      {unreadCount > 0 && (
        <div className="conversation-badge">
          {unreadCount}
        </div>
      )}
    </div>
  )
}
