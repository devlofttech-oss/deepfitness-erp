import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { LogIn } from 'lucide-react'
import logoImage from '../assets/logo.png'

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
    <div className="min-h-screen flex items-center justify-center bg-surface dark:bg-slate-900 p-4 font-['Plus_Jakarta_Sans']">
      <div className="bg-surface-container-lowest dark:bg-slate-950 w-full max-w-md p-8 md:p-10 rounded-3xl shadow-[0_20px_40px_rgba(0,0,0,0.08)] dark:shadow-[0_20px_40px_rgba(0,0,0,0.4)] border border-outline-variant/30 flex flex-col items-center">
        
        <div className="w-40 h-40 mb-6 flex items-center justify-center">
          <img src={logoImage} alt="Deep Fitness Logo" className="w-full h-full object-contain" />
        </div>
        
        <h1 className="text-2xl font-bold text-on-surface text-center mb-1">Deep Fitness ERP</h1>
        <p className="text-on-surface-variant text-center mb-8 text-sm">Sign in to your management dashboard</p>

        {error && (
          <div className="w-full p-3 mb-6 bg-error-container text-on-error-container rounded-xl text-sm font-medium text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="login-email" className="text-sm font-semibold text-on-surface">Email address</label>
            <input
              id="login-email"
              type="email"
              className="w-full px-4 py-3 rounded-xl bg-surface-container border border-outline-variant/50 focus:border-primary focus:ring-2 focus:ring-primary/20 text-on-surface outline-none transition-all"
              placeholder="admin@deepfitness.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="login-password" className="text-sm font-semibold text-on-surface">Password</label>
            <input
              id="login-password"
              type="password"
              className="w-full px-4 py-3 rounded-xl bg-surface-container border border-outline-variant/50 focus:border-primary focus:ring-2 focus:ring-primary/20 text-on-surface outline-none transition-all"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="w-full mt-2 bg-primary hover:bg-primary/90 text-on-primary font-bold py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-sm disabled:opacity-70"
            disabled={loading}
            id="login-submit"
          >
            {loading ? (
              <span className="material-symbols-outlined animate-spin">progress_activity</span>
            ) : (
              <>
                <LogIn size={20} />
                Sign In
              </>
            )}
          </button>
        </form>

        <p className="text-center mt-8 text-xs text-on-surface-variant opacity-70">
          Powered by Deep Fitness ERP &middot; Firebase
        </p>
      </div>
    </div>
  )
}
