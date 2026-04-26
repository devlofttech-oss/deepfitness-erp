import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { LogIn } from 'lucide-react'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login, currentUser } = useAuth()
  const navigate = useNavigate()

  // If already logged in, redirect
  if (currentUser) {
    navigate('/', { replace: true })
    return null
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      navigate('/', { replace: true })
    } catch (err) {
      console.error(err);
      setError(err?.message || 'Invalid credentials. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="logo">D</div>
        <h1>Welcome back</h1>
        <p className="subtitle">Sign in to your DevLoft ERP dashboard</p>

        {error && <div className="error-msg">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="login-email">Email address</label>
            <input
              id="login-email"
              type="text"
              className="form-input"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="login-password">Password</label>
            <input
              id="login-password"
              type="password"
              className="form-input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-lg w-full"
            disabled={loading}
            id="login-submit"
          >
            {loading ? (
              <div className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} />
            ) : (
              <>
                <LogIn size={18} />
                Sign In
              </>
            )}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 'var(--space-6)', fontSize: 'var(--font-xs)', color: 'var(--text-muted)' }}>
          Powered by Firebase
        </p>
      </div>
    </div>
  )
}
