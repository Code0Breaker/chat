import { useEffect, useState } from 'react'
import Contact from '../contact/contact'
import { getContacts } from '../../apis/chatApis'
import { IChat } from '../../types'
import { socket } from '../../socket'

export default function Contacts({ id }: { id: string }) {
  const [contacts, setContacts] = useState<null | IChat[]>(null)

  useEffect(() => {
    (async () => {
      const data = await getContacts()
      socket.emit('join', data.map(item => (item._id)));
      setContacts(data)
    })()
  }, [id])

  return (
    <div className="conversation-area">
      {contacts?.map(item => <Contact chat={item} id={id} key={item._id} />)}
      <button className="add" />
      <div className="overlay" />
    </div>
  )
}
