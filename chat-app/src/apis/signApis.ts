import { ILogin, IRegister } from "../types";
import { base_url } from "./baseUrl";

export const register = async (params:IRegister) => {
    const {data} = await base_url.post('user/register',params)
    return data
}

export const login = async (params:ILogin):Promise<{fullname:string,pic:string,_id:string,token:string}> => {
    const {data:{fullname,pic,_id,token}} = await base_url.post('user/login',params)
    // Store token first so subsequent requests can use it
    localStorage.setItem('token', token)
    localStorage.setItem('fullname', fullname)
    localStorage.setItem('pic', pic)
    localStorage.setItem('_id', _id)
    return {fullname,pic,_id,token}
}