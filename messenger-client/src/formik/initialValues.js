import forms from "./forms";

const {
    forms:{
        confirm_password,
        fullname,
        password,
        email,
        phone
    }
} = forms

export const registerInitialValues = {
    [email.name]:'',
    [fullname.name]:'',
    [password.name]:'',
    [confirm_password.name]:'',
    [phone.name]:'',
}

export const loginInitialValues = {
    [email.name]:'',
    [password.name]:'',
}