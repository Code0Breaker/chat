import { Button, Input, Typography } from "@mui/material";
import { Box } from "@mui/system";
import { registerInitialValues } from "../../formik/initialValues";
import StyledInput from "../../formik/models";
import validations from "../../formik/validations";
import { Form, Formik } from "formik";
import forms from "../../formik/forms";
import axios from "axios";
import { useNavigate } from "react-router-dom";
const {
    formId,
    forms: {
      fullname,
      email,
      password,
      confirm_password,
      phone
    },
  } = forms;

  const inputs = [
    fullname,
    email,
    phone,
    password,
    confirm_password,
  ];
export default function Register(){
  const navigate = useNavigate()
  const register = async(datas) =>{
    const {data} = await axios.post('http://localhost:5000/user/register', datas)
    navigate('/login');
  }

    return(
        <Box padding={3}>
            <Typography variant={'h4'}>Register</Typography>
            <br/>
            <br/>
            <Formik
              initialValues={registerInitialValues}
              validationSchema={validations[0]}
              onSubmit={(values, actions) => {
                register(values);
                // setTimeout(() => {
                  console.log(values);
                  // actions.setSubmitting(false);
                // }, 1000);
              }}
            >
                <Form id={formId}>
                    <Box display={'flex'} flexDirection={'column'} gap={3}>
                        {
                            inputs.map(item=>{
                                return <StyledInput label={item.label} name={item.name}/>
                            })
                        }
                        
                        <Button variant="outlined" type="submit">Register</Button>
                    </Box>
                </Form>
            </Formik>
            
        </Box>
    )
}