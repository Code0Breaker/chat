import { StyledInput } from "../../../../models/chatlist";

export default function ChatListSearch({search, setSearch}){
    return <StyledInput placeholder="Search ..." value={search} onChange={(e)=>setSearch(e.target.value)}/>
}