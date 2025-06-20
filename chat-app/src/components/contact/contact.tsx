import { useNavigate } from "react-router-dom"
import { IChat, IUser } from "../../types"
import React, { useEffect, useState } from "react"
import { useChatStore } from "../../store/chatStore"
import { timeAgo } from "../../utils/time.utils"
import { getSocket } from "../../config/socket"
import { SOCKET_EVENTS } from "../../config/constants"
import { AuthStorage } from "../../utils/storage.utils"

export default function Contact({ chat, id }: { chat: IChat, id: string }) {
  const { unreadMessages } = useChatStore()
  const [isTyping, setIsTyping] = useState(false)
  const navigate = useNavigate()
  const [typerId, setTyperId] = useState<string | null>(null)
  const socket = getSocket()

  useEffect(() => {
    const handleTyping = (data: { typerId: string; roomId: string }) => {
      setTyperId(data.typerId)
      setIsTyping(true)
    }

    socket.on(SOCKET_EVENTS.IS_TYPING, handleTyping)
    
    return () => {
      socket.off(SOCKET_EVENTS.IS_TYPING, handleTyping)
    }
  }, [socket])

  useEffect(() => {
    const timeout = setTimeout(() => {
      setIsTyping(false)
    }, 2000)
    return () => clearTimeout(timeout)
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

  return (
    <div className={`msg ${chat._id === id && "active"}`} onClick={handleContactClick}>
      {/* online */}
      {
        filterFriends(chat?.users)?.map(item => {
          return (
            <React.Fragment key={item._id}>
              <img
                className="msg-profile"
                src={item.pic}
                alt={item.fullname}
              />
              {!!filterUnread()?.length && <p className="msg-badage">{filterUnread()?.length}</p>}
              <div className="msg-detail">
                <div className="msg-username">{item.fullname}</div>
                <div className="msg-content">
                  {isTyping && typerId === item._id ? 
                    <p>Typing...</p> : 
                    <span className="msg-message"><b>{filterUnread()?.[0]?.content}</b></span>
                  }
                  {!timeAgo(filterUnread()?.[0]?.created_at || '').includes('NaN') && 
                    <span className="msg-date">{timeAgo(filterUnread()?.[0]?.created_at || '')}</span>
                  }
                </div>
              </div>
            </React.Fragment>
          )
        })
      }
    </div>
  )
}
