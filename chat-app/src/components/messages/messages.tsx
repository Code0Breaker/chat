import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { selectChat, sendMessage } from '../../apis/chatApis'
import { IMessage } from '../../types'
import { SendIcon } from '../../assets/icons/sendIcon'
import { socket } from '../../socket'
import { useStore } from '../../store/store'
import { timeAgo } from '../../utils/time.utils'

export default function Messages({ id }: { id: string }) {
    const [messages, setMessages] = useStore((state) => [state.messages, state.setMessages])
    const [text, setText] = useState('')
    const [isTyping, setIsTyping] = useState(false)
    const [typerId, setTyperId] = useState(null)
    const [roomId, setRoomId] = useState(null)

    useEffect(() => {
        socket.on('isTyping', (data) => {
            setTyperId(data.typerId)
            setRoomId(data.roomId)
            setIsTyping(true)
        })
    }, [socket, id])

    useEffect(() => {
        (async () => {
            const data = await selectChat(id as string)
            setMessages(data.messages as IMessage[])
        })()
    }, [id])

    useEffect(() => {
        const timeout = setTimeout(() => {
            setIsTyping(false)
        }, 2000)
        return () => clearTimeout(timeout)
    }, [isTyping])

    useEffect(() => {
        socket.emit('isTyping', { roomId: id, typerId: localStorage._id })
    }, [text, id])

    const send = async () => {
        const data = await sendMessage(id as string, text)
        socket.emit("chat", data);
    }
    return (
        <>
            <div className="chat-area-main">
                {
                    messages?.map(item => {
                        return (
                            <div className={`chat-msg ${item.sender_id === localStorage._id ? "owner":"sender"}`} key={item._id}>
                                <div className="chat-msg-profile">
                                    <img
                                        className="chat-msg-img"
                                        src={item.user.pic}
                                        alt=""
                                    />
                                    {!timeAgo(item?.created_at).includes('NaN') && <div className="chat-msg-date">{timeAgo(item?.created_at)}</div>}

                                </div>
                                <div className="chat-msg-content">
                                    <div className="chat-msg-text">
                                        {item.content}
                                    </div>
                                    {/* <div className="chat-msg-text">
                                        <img src="https://media0.giphy.com/media/yYSSBtDgbbRzq/giphy.gif?cid=ecf05e47344fb5d835f832a976d1007c241548cc4eea4e7e&rid=giphy.gif" />
                                    </div> */}

                                </div>
                            </div>
                        )
                    })
                }
                {isTyping && typerId !== localStorage._id && id === roomId && <p>Typing</p>}
            </div>
            <div className="chat-area-footer">
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="feather feather-video"
                >
                    <path d="M23 7l-7 5 7 5V7z" />
                    <rect x={1} y={5} width={15} height={14} rx={2} ry={2} />
                </svg>
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="feather feather-image"
                >
                    <rect x={3} y={3} width={18} height={18} rx={2} ry={2} />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <path d="M21 15l-5-5L5 21" />
                </svg>
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="feather feather-plus-circle"
                >
                    <circle cx={12} cy={12} r={10} />
                    <path d="M12 8v8M8 12h8" />
                </svg>
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="feather feather-paperclip"
                >
                    <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
                </svg>
                <input type="text" placeholder="Type something here..." value={text} onChange={e => setText(e.target.value)} />
                <button onClick={send}>
                    <SendIcon />
                </button>

                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="feather feather-smile"
                >
                    <circle cx={12} cy={12} r={10} />
                    <path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01" />
                </svg>
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="feather feather-thumbs-up"
                >
                    <path d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3zM7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3" />
                </svg>
            </div>
        </>
    )
}
