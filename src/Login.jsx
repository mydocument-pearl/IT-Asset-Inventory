import { useState } from 'react'
import { dbService } from './dbService'
import { Lock, User, UserPlus, LogIn, CheckCircle, AlertCircle } from 'lucide-react'

export default function Login({ onLoginSuccess }) {
  const [isSignUp, setIsSignUp] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrorMsg('')
    setSuccessMsg('')
    
    if (!username || !password || (isSignUp && !name)) {
      setErrorMsg('Please fill in all fields.')
      return
    }

    setLoading(true)
    try {
      if (isSignUp) {
        // Sign-up flow
        const newUser = {
          username: username.toLowerCase().trim(),
          password,
          name: name.trim(),
          role: 'member',
          status: 'Pending',
          createdAt: new Date().toISOString()
        }
        await dbService.saveUser(newUser)
        setSuccessMsg('Registration successful! Please wait for Admin approval before logging in.')
        setIsSignUp(false)
        setName('')
        setPassword('')
      } else {
        // Login flow
        const users = await dbService.getUsers()
        let user = users.find(u => u.username === username.toLowerCase().trim() && u.password === password)
        
        // Safety Fallback for System Admin profile
        if (!user && username.toLowerCase().trim() === 'admin' && password === 'password123') {
          user = { username: 'admin', password: 'password123', name: 'System Admin', role: 'admin', status: 'Approved' };
        }
        
        if (!user) {
          setErrorMsg('Invalid username or password.')
          return
        }

        if (user.status !== 'Approved') {
          setErrorMsg('Your account is pending Admin approval.')
          return
        }

        // Save session locally
        localStorage.setItem('currentUser', JSON.stringify(user))
        
        // Log Login Action
        await dbService.saveActivityLog({
          member: `${user.name} (${user.role})`,
          action: 'Member Logged In',
          details: `User ${user.username} successfully authorized.`
        })

        onLoginSuccess(user)
      }
    } catch (err) {
      console.error(err)
      setErrorMsg(err.message || 'Authentication error.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="glass-panel bg-white p-8 rounded-2xl w-full max-w-md shadow-2xl animate-fade-in border border-white/40">
        
        <div className="flex justify-center mb-6">
          <div className="bg-red-600 h-12 w-12 rounded-xl flex items-center justify-center font-extrabold text-white text-xl shadow-lg shadow-red-500/20">
            IT
          </div>
        </div>

        <h3 className="text-2xl font-extrabold text-center text-slate-800 mb-2">
          {isSignUp ? 'Create Member Account' : 'IT Asset Inventory'}
        </h3>
        <p className="text-slate-400 text-xs text-center mb-6 font-semibold uppercase tracking-wider">
          {isSignUp ? 'Pending Admin Approval' : 'Authorized Access Only'}
        </p>

        {errorMsg && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle size={16} className="text-red-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
            <CheckCircle size={16} className="text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUp && (
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Full Name</label>
              <div className="relative">
                <User className="absolute left-3.5 top-3.5 text-slate-400" size={16} />
                <input
                  type="text"
                  placeholder="e.g. John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full glass-input rounded-xl pl-10 pr-4 py-3 text-sm outline-none"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Username</label>
            <div className="relative">
              <User className="absolute left-3.5 top-3.5 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Enter username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full glass-input rounded-xl pl-10 pr-4 py-3 text-sm outline-none font-mono lowercase"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3.5 text-slate-400" size={16} />
              <input
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full glass-input rounded-xl pl-10 pr-4 py-3 text-sm outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-6 bg-red-600 hover:bg-red-700 hover:shadow-lg hover:shadow-red-500/20 text-white rounded-xl py-3 text-sm font-bold flex items-center justify-center gap-2 cursor-pointer transition duration-200"
          >
            {loading ? (
              <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : isSignUp ? (
              <>
                <UserPlus size={16} />
                Request Signup
              </>
            ) : (
              <>
                <LogIn size={16} />
                Sign In
              </>
            )}
          </button>
        </form>

        <div className="text-center mt-6 pt-4 border-t border-slate-100 text-xs text-slate-500">
          {isSignUp ? (
            <p>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(false)
                  setErrorMsg('')
                }}
                className="text-red-600 font-bold hover:underline"
              >
                Sign In
              </button>
            </p>
          ) : (
            <p>
              Need to access?{' '}
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(true)
                  setErrorMsg('')
                }}
                className="text-red-600 font-bold hover:underline"
              >
                Sign Up Now
              </button>
            </p>
          )}
        </div>



      </div>
    </div>
  )
}
