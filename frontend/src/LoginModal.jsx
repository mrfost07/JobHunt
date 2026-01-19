import { useState } from 'react'
import axios from 'axios'
import './LoginModal.css'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'
const GOOGLE_AUTH_URL = `${API_URL}/auth/google`

function LoginModal({ onClose, intent }) {
    const [isLogin, setIsLogin] = useState(true)
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [name, setName] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    const handleGoogleLogin = () => {
        const url = intent ? `${GOOGLE_AUTH_URL}?returnTo=${intent}` : GOOGLE_AUTH_URL
        window.location.href = url
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        try {
            const endpoint = isLogin ? '/auth/login' : '/auth/signup'
            const payload = isLogin ? { email, password } : { email, password, displayName: name }

            const res = await axios.post(`${API_URL}${endpoint}`, payload)

            if (res.data.success) {
                if (intent) {
                    window.location.href = `/?login=success&action=${intent}`
                } else {
                    window.location.reload()
                }
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Authentication failed')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="login-overlay" onClick={onClose}>
            <div className="login-modal" onClick={e => e.stopPropagation()}>
                <button className="login-close" onClick={onClose}>×</button>

                <div className="login-header">
                    <h2>{isLogin ? 'Sign in' : 'Create Account'}</h2>
                    <p>{isLogin ? 'Welcome back to JobHunt' : 'Get started with JobHunt'}</p>
                </div>

                <button className="google-btn" onClick={handleGoogleLogin}>
                    <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" />
                    <span>{isLogin ? 'Sign in with Google' : 'Sign up with Google'}</span>
                </button>

                <div className="divider">
                    <span>or</span>
                </div>

                <form className="login-form" onSubmit={handleSubmit}>
                    {!isLogin && (
                        <div className="form-field">
                            <label>Name</label>
                            <input
                                type="text"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                required
                                placeholder="John Doe"
                            />
                        </div>
                    )}

                    <div className="form-field">
                        <label>Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            required
                            placeholder="you@email.com"
                        />
                    </div>

                    <div className="form-field">
                        <label>Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            required
                            placeholder="••••••••"
                        />
                    </div>

                    {error && <div className="login-error">{error}</div>}

                    <button type="submit" className="submit-btn" disabled={loading}>
                        {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Create Account')}
                    </button>
                </form>

                <div className="toggle-auth">
                    {isLogin ? "Don't have an account? " : "Already have an account? "}
                    <button onClick={() => {
                        setIsLogin(!isLogin)
                        setError('')
                    }}>
                        {isLogin ? 'Sign Up' : 'Log In'}
                    </button>
                </div>
            </div>
        </div>
    )
}

export default LoginModal
