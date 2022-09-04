import forms from "./forms";
import * as Yup from "yup";
const {
  forms: {
    fullname,
    email,
    password,
    confirm_password,
    phone
  },
} = forms;

export default [
  Yup.object().shape({
    [fullname.name]: Yup.string().required(),
    [phone.name]: Yup.string().required(),
    [email.name]: Yup.string()
      .email("Field should contain a valid e-mail")
      .required(),
    [password.name]: Yup.string().required(),
    [confirm_password.name]: Yup.string()
      .required()
      .oneOf([Yup.ref("password"), null], "Passwords must match"),
  }),
  Yup.object().shape({
    [email.name]: Yup.string()
      .email("Field should contain a valid e-mail")
      .required(),
    [password.name]: Yup.string().required(),
  }),
];