import { useParams, useRoutes } from 'react-router-dom'
import './App.css'
import MessengerPage from './pages/messengerPage/messengerPage'
import SignPage from './pages/signPage/signPage'
import Messages from './components/messages/messages'
import CallPage from './pages/callPage/callPage'
 
function App() {

  const routes = useRoutes([
    {path:'',element:<SignPage/>},
    {
      path:'messenger', 
      element:<MessengerPage/>,
      children:[
        {
          path:':id',
          element:<MessagesWrapper/>
        },
        {
          path:'call/:id',
          element:<CallPage/>
        }
      ]
    },


  ])
  return routes
}

function MessagesWrapper() {
  const { id } = useParams();

  return <Messages id={id as string} />;
}

export default App
