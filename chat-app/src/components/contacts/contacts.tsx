import { useEffect, useState } from 'react'
import Contact from '../contact/contact'
import { getContacts } from '../../apis/chatApis'
import { IChat } from '../../types'
import { emitEvent } from '../../config/socket'
import { SOCKET_EVENTS } from '../../config/constants'

export default function Contacts({ id }: { id: string }) {
  const [contacts, setContacts] = useState<null | IChat[]>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadContacts = async () => {
      try {
        setIsLoading(true)
        setError(null)
        
        // Make API call regardless of socket status
        console.log('🔄 Loading contacts...');
        const data = await getContacts()
        console.log('✅ Contacts loaded:', data);
        
        setContacts(data)
        
        // Try to join rooms via socket (optional)
        const roomIds = data.map(item => item._id).filter(Boolean);
        if (roomIds.length > 0) {
          const success = emitEvent(SOCKET_EVENTS.JOIN, roomIds);
          if (success) {
            console.log('🔌 Joined rooms successfully:', roomIds);
          } else {
            console.warn('⚠️ Could not join rooms via socket (using API fallback)');
          }
        }
        
      } catch (err) {
        console.error('❌ Failed to load contacts:', err)
        setError('Failed to load contacts')
      } finally {
        setIsLoading(false)
      }
    }

    loadContacts()
  }, []) // Remove socket dependency to prevent re-loading

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

  if (!contacts || contacts.length === 0) {
    return (
      <div className="conversation-area">
        <div className="no-contacts">
          <p>No contacts found</p>
        </div>
      </div>
    )
  }

  return (
    <div className="conversation-area">
      {contacts.map(item => <Contact chat={item} id={id} key={item._id} />)}
      <button className="add" />
      <div className="overlay" />
    </div>
  )
}
