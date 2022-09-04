import { Box } from "@mui/system";
import SignComponent from "../../components/SignComponent";
import {Outlet} from 'react-router-dom'
export default function SignLayout() {
    return (
        <Box width={'100%'} height={'100vh'} display={'flex'} justifyContent={'center'} alignItems={'center'}>
            <SignComponent>
                <Outlet/>
            </SignComponent>
        </Box>
    )
}