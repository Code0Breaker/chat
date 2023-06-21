import { useEffect, useState } from 'react'
import Contact from '../contact/contact'
import { getContacts } from '../../apis/chatApis'
import { IChat } from '../../types'
import { socket } from '../../socket'
import { useParams } from 'react-router-dom'

export default function Contacts() {
  const [contacts, setContacts] = useState<null|IChat[]>(null)
  const {id} = useParams()
  useEffect(() => {
    // socket.emit("setup", localStorage._id);
    (async()=>{
      const data = await getContacts()
      socket.emit('join', data.map(item=>(item._id)));
      setContacts(data)

    })()
  }, [id])
  return (
    <div className="conversation-area">
      {contacts?.map(item=><Contact chat={item} key={item._id}/>)}
      <button className="add" />
      <div className="overlay" />
    </div>
  )
}
