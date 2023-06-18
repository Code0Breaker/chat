import { ILogin, IRegister } from "../types";
import { base_url } from "./baseUrl";

export const register = async (params:IRegister) => {
    const {data} = await base_url.post('user/register',params)
    return data
}

export const login = async (params:ILogin):Promise<{fullname:string,pic:string,_id:string}> => {
    const {data:{token,fullname,pic,_id}} = await base_url.post('user/login',params)
    localStorage.token = token
    localStorage.fullname = fullname
    localStorage.pic = pic
    localStorage._id = _id
    return {fullname,pic,_id}
}