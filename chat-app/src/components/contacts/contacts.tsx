import { useEffect, useState } from 'react'
import Contact from '../contact/contact'
import { getContacts } from '../../apis/chatApis'
import { IChat } from '../../types'
import { getSocket } from '../../config/socket'
import { SOCKET_EVENTS } from '../../config/constants'

export default function Contacts({ id }: { id: string }) {
  const [contacts, setContacts] = useState<null | IChat[]>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const socket = getSocket()

  useEffect(() => {
    const loadContacts = async () => {
      try {
        setIsLoading(true)
        setError(null)
        
        const data = await getContacts()
        
        // Join all chat rooms
        socket.emit(SOCKET_EVENTS.JOIN, data.map(item => item._id))
        
        setContacts(data)
      } catch (err) {
        console.error('Failed to load contacts:', err)
        setError('Failed to load contacts')
      } finally {
        setIsLoading(false)
      }
    }

    loadContacts()
  }, [id, socket])

  if (isLoading) {
    return (
      <div className="conversation-area">
        <div className="loading-container">
          <p>Loading contacts...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="conversation-area">
        <div className="error-container">
          <p className="error-message">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="conversation-area">
      {contacts?.map(item => <Contact chat={item} id={id} key={item._id} />)}
      <button className="add" />
      <div className="overlay" />
    </div>
  )
}
