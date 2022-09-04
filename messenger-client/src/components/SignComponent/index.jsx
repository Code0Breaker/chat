import { Grid } from "@mui/material";
import SignImagePart from "../../parts/SignImagePart";

export default function SignComponent({children}){
    return(
        <Grid
        container 
        maxWidth={900} 
        maxHeight={700} 
        boxShadow={'2px 11px 21px -4px rgba(0,0,0,0.75)'}>
            <Grid item xs={5}>
                <SignImagePart/>
            </Grid>
            <Grid item xs={6}>{children}</Grid>
        </Grid>
    )
}