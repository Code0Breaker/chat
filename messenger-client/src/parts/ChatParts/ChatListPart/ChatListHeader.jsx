import { Box } from "@mui/system";
import logo from '../../../assets/logo.png'
export default function ChatListHeader(){
    return(
        <Box padding={2} display={'flex'} justifyContent={'space-between'}>
            <Box width={40} height={30}>
                <img src={logo} width={'100%'} height={'100%'} style={{objectFit:'contain'}}/>
            </Box>
        </Box>
    )
}