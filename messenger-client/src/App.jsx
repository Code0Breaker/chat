import {useRoutes} from 'react-router-dom'
import ChatLayout from './layouts/ChatLayout/ChatLayout';
import SignLayout from './layouts/SignLayout/SignLayout';
import Login from './pages/Login';
import Messages from './pages/Messages';
import Register from './pages/Register';

function App() {
  const routes = useRoutes([
    {
      path:'', 
      element:<SignLayout/>,
      children:[
        {path:'',element:<Register/>},
        {path:'login',element:<Login/>},
      ]
    },
    {
      path:'chat',
      element:<ChatLayout/>,
      children:[
        {path:':id',element:<Messages/>}
      ]
    }
  ])

  return routes
}

export default App;
