import { useNavigate, useParams } from "react-router-dom"
import { IChat, IUser } from "../../types"
import React from "react"
import { useStore } from "../../store/store"
import { timeAgo } from "../../utils/time.utils"

export default function Contact({ chat }: { chat: IChat }) {
  const [unreadMessages] = useStore((state) => [state.unreadMessages])
  const navigate = useNavigate()
  const { id } = useParams()

  const filterFriends = (friends?: IUser[]) => {
    const data = friends?.filter(item => item._id !== localStorage._id)
    return data
  }

  const filterUnread = () => {
    //@ts-ignore
    const data = unreadMessages?.filter(item => item.chat._id === chat._id).sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    return data
  }
  
  return (
    <div className={`msg online ${chat._id === id && "active"}`} onClick={() => navigate(chat._id)}>
      {
        filterFriends(chat?.users)?.map(item => {
          return (
            <React.Fragment key={item._id}>
              <img
                className="msg-profile"
                src={item.pic}
                alt=""
              />
              {!!filterUnread()?.length && <p className="msg-badage">{filterUnread()?.length}</p>}
              <div className="msg-detail">
                <div className="msg-username">{item.fullname}</div>
                <div className="msg-content">
                  <span className="msg-message"><b>{filterUnread()?.[0]?.content}</b></span>
                  {!timeAgo(filterUnread()?.[0]?.created_at).includes('NaN') && <span className="msg-date">{timeAgo(filterUnread()?.[0]?.created_at)}</span>}
                </div>
              </div>
            </React.Fragment>
          )
        })
      }

    </div>
  )
}
