import { useOutletContext } from "react-router-dom"

const useRoomId = () =>{
    return useOutletContext<{id:string}>()
}