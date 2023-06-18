import { useRoutes } from 'react-router-dom'
import './App.css'
import MessengerPage from './pages/messengerPage/messengerPage'
import SignPage from './pages/signPage/signPage'
import Messages from './components/messages/messages'

function App() {

  const routes = useRoutes([
    {path:'',element:<SignPage/>},
    {
      path:'messenger', 
      element:<MessengerPage/>,
      children:[
        {
          path:':id',
          element:<Messages/>
        }
      ]
    }
  ])
  return routes
}

export default App
