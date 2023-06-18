import React, { useState } from 'react'
import './style.css'
import { useNavigate } from 'react-router-dom'
import { ILogin, IRegister } from '../../types'
import { login, register } from '../../apis/signApis'

export default function SignPage() {
    const [switchPanel, setSwitchPanel] = useState(false)
    const navigate = useNavigate()
    const [registerCred, setRegisterCred] = useState<IRegister>({
        email: '',
        fullname: '',
        password: '',
        phone: ''
    })
    const [loginCred, setLoginCred] = useState<ILogin>({
        email: '',
        password: ''
    })

    const signUp = async() => {
        const data = await register(registerCred)
        setSwitchPanel(false)
    }

    const signIn = async() => {
        const data = await login(loginCred)
        navigate('/messenger')
    }

    return (
        <div className='sign-page'>
            <div className={`container ${switchPanel && "right-panel-active"}`} id="container">
                <div className="form-container sign-up-container">
                    <form action="#">
                        <h1>Create Account</h1>
                        <div className="social-container">
                            <a href="#" className="social">
                                <i className="fab fa-facebook-f" />
                            </a>
                            <a href="#" className="social">
                                <i className="fab fa-google-plus-g" />
                            </a>
                            <a href="#" className="social">
                                <i className="fab fa-linkedin-in" />
                            </a>
                        </div>
                        <span>or use your email for registration</span>
                        <input type="text" placeholder="Name" value={registerCred.fullname} onChange={e => setRegisterCred({ ...registerCred, fullname: e.target.value })} />
                        <input type="email" placeholder="Email" value={registerCred.email} onChange={e => setRegisterCred({ ...registerCred, email: e.target.value })} />
                        <input type="email" placeholder="Phone" value={registerCred.phone} onChange={e => setRegisterCred({ ...registerCred, phone: e.target.value })} />
                        <input type="password" placeholder="Password" value={registerCred.password} onChange={e => setRegisterCred({ ...registerCred, password: e.target.value })} />
                        <button onClick={signUp}>Sign Up</button>
                    </form>
                </div>
                <div className="form-container sign-in-container">
                    <form action="#">
                        <h1>Sign in</h1>
                        <div className="social-container">
                            <a href="#" className="social">
                                <i className="fab fa-facebook-f" />
                            </a>
                            <a href="#" className="social">
                                <i className="fab fa-google-plus-g" />
                            </a>
                            <a href="#" className="social">
                                <i className="fab fa-linkedin-in" />
                            </a>
                        </div>
                        <span>or use your account</span>
                        <input type="email" placeholder="Email" value={loginCred.email} onChange={e => setLoginCred({ ...loginCred, email: e.target.value })} />
                        <input type="password" placeholder="Password" value={loginCred.password} onChange={e => setLoginCred({ ...loginCred, password: e.target.value })} />
                        {/* <a href="#">Forgot your password?</a> */}
                        <button onClick={signIn}>Sign In</button>
                    </form>
                </div>
                <div className="overlay-container">
                    <div className="overlay">
                        <div className="overlay-panel overlay-left">
                            <h1>Welcome Back!</h1>
                            <p>To keep connected with us please login with your personal info</p>
                            <button className="ghost" id="signIn" onClick={() => setSwitchPanel(!switchPanel)}>
                                Sign In
                            </button>
                        </div>
                        <div className="overlay-panel overlay-right">
                            <h1>Hello, Friend!</h1>
                            <p>Enter your personal details and start journey with us</p>
                            <button className="ghost" id="signUp" onClick={() => setSwitchPanel(!switchPanel)}>
                                Sign Up
                            </button>
                        </div>
                    </div>
                </div>
            </div>

        </div>
    )
}
