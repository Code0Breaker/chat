import { Button, Input, Typography } from "@mui/material";
import { Box } from "@mui/system";
import StyledInput from "../../formik/models";
import { Form, Formik } from "formik";
import { loginInitialValues } from "../../formik/initialValues";
import validations from "../../formik/validations";
import forms from "../../formik/forms";
import axios from 'axios'
import {useNavigate} from 'react-router-dom'
const {
    formId,
    forms: { email, password },
  } = forms;

export default function Login(){
  const navigate = useNavigate()
  const login = async(datas) =>{
    const {data:{token,fullname,pic,_id}} = await axios.post('http://localhost:5000/user/login', datas)
    localStorage.token = token
    localStorage.fullname = fullname
    localStorage.pic = pic
    localStorage._id = _id
    navigate('/chat');
  }
    return(
        <Box padding={3}>
            <Typography variant={'h4'}>Login</Typography>
            <br/>
            <br/>
            <Formik
              initialValues={loginInitialValues}
              validationSchema={validations[1]}
              onSubmit={(values, actions) => {
                login(values);
                // setTimeout(() => {
                  console.log(values);
                  // actions.setSubmitting(false);
                // }, 1000);
              }}
            >
                <Form id={formId}>
                    <Box display={'flex'} flexDirection={'column'} gap={3}>
                        <StyledInput label={email.label} placeholder={'email'} name={email.name}/>
                        <StyledInput label={password.label} placeholder={'password'} name={password.name}/>
                        <Button variant="outlined" type="submit">Login</Button>
                    </Box>
                </Form>
            </Formik>
        </Box>
    )
}