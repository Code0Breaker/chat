import { ILogin, IRegister } from "../types";
import { base_url } from "./baseUrl";

export const register = async (params:IRegister) => {
    const {data} = await base_url.post('user/register',params)
    return data
}

export const login = async (params:ILogin):Promise<{fullname:string,pic:string,_id:string,token:string}> => {
    const {data:{fullname,pic,_id,token}} = await base_url.post('user/login',params)
    localStorage.fullname = fullname
    localStorage.pic = pic
    localStorage._id = _id
    localStorage.token = token
    return {fullname,pic,_id,token}
}