import { Box } from '@mui/system'
import img from '../../assets/logo.png'
export default function SignImagePart(){
    return(
        <Box width={'100%'} height={'100%'}>
            <img src={img} width={'100%'} height={'100%'} alt={''} style={{objectFit:'contain'}}/>
        </Box>
    )
}