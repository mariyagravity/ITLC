import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { authService } from '../services/authService'
import ForgotPinModal from '../components/ForgotPinModal'

export default function Login() {
  const navigate = useNavigate()

  // Login Mode: 'member' | 'staff'
  const [loginMode, setLoginMode] = useState('member')

  // Staff credentials
  const [staffCredentials, setStaffCredentials] = useState({ username: '', password: '' })

  // Member credentials
  const [memberCredentials, setMemberCredentials] = useState({ phone: '', pin: '' })

  // General states
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const [customLogo, setCustomLogo] = useState('')
  const [showForgotPinModal, setShowForgotPinModal] = useState(false)

  useEffect(() => {
    // Load custom logo from localStorage
    const savedLogo = localStorage.getItem('customLogo')
    if (savedLogo) setCustomLogo(savedLogo)

    // Initialize default staff users if not exists
    const savedUsers = localStorage.getItem('systemUsers')
    if (!savedUsers) {
      const defaultUsers = [
        { id: 1, username: 'admin', password: 'admin123', role: 'admin', name: 'Administrator', created_at: new Date().toISOString() },
        { id: 2, username: 'manager', password: 'manager123', role: 'event_manager', name: 'Event Manager', created_at: new Date().toISOString() }
      ]
      localStorage.setItem('systemUsers', JSON.stringify(defaultUsers))
    }
  }, [])

  // 1. Staff / Admin Login Handler
  async function handleStaffLogin(e) {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      await new Promise(resolve => setTimeout(resolve, 350))
      const savedUsers = localStorage.getItem('systemUsers')
      const users = savedUsers ? JSON.parse(savedUsers) : []

      const user = users.find(
        u => u.username.toLowerCase() === staffCredentials.username.toLowerCase() && u.password === staffCredentials.password
      )

      if (user) {
        localStorage.setItem('user', JSON.stringify({
          username: user.username,
          role: user.role,
          name: user.name
        }))

        if (user.role === 'admin') {
          navigate('/admin/dashboard')
        } else if (user.role === 'event_manager') {
          navigate('/manager/dashboard')
        }
      } else {
        setError('Invalid username or password')
      }
    } catch (err) {
      setError('Staff login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // 2. Member Login Handler (Phone + 4-digit PIN)
  async function handleMemberLogin(e) {
    e.preventDefault()
    setError('')
    setSuccess('')

    const cleanPhone = memberCredentials.phone.trim()
    const pin = memberCredentials.pin.trim()

    if (!cleanPhone) {
      setError('Please enter your registered mobile number')
      return
    }

    if (!pin || pin.length !== 4) {
      setError('PIN must be exactly 4 digits')
      return
    }

    setLoading(true)

    try {
      const result = await authService.memberLogin({
        phoneNumber: cleanPhone,
        pin: pin
      })

      if (result.success && result.member) {
        localStorage.setItem('user', JSON.stringify({
          id: result.member.id,
          role: 'member',
          name: result.member.full_name,
          phone: result.member.phone_number,
          email: result.member.email,
          company: result.member.company,
          designation: result.member.designation,
          chapter: result.member.itlc_chapter_name,
          profile_image: result.member.profile_image,
          membership_tier: result.member.membership_tier
        }))

        // Route to Member Dashboard
        navigate('/member/dashboard')
      } else if (result.needsPinSetup) {
        setError('No PIN set yet for this member. Click "Set PIN" below to receive a reset code.')
      } else {
        setError(result.message || 'Invalid PIN or credentials.')
      }
    } catch (err) {
      setError(err.message || 'Login failed. Please check your phone number and PIN.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-white to-primary/10 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo & Community Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-20 h-20 mb-3 overflow-hidden">
            {customLogo ? (
              <img src={customLogo} alt="ITLC Logo" className="w-full h-full object-contain" />
            ) : (
              <img src="/itlc-logo.svg" alt="ITLC Logo" className="w-full h-full object-contain" />
            )}
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            IT Leaders Community
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Kerala Chapter • Members & Management Portal
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8">
          {/* Mode Switcher Tabs */}
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl mb-6">
            <button
              type="button"
              onClick={() => {
                setLoginMode('member')
                setError('')
                setSuccess('')
              }}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                loginMode === 'member'
                  ? 'bg-white dark:bg-slate-900 text-primary shadow-sm font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span className="material-symbols-outlined text-base">badge</span>
              <span>Member Sign In</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setLoginMode('staff')
                setError('')
                setSuccess('')
              }}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                loginMode === 'staff'
                  ? 'bg-white dark:bg-slate-900 text-primary shadow-sm font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span className="material-symbols-outlined text-base">admin_panel_settings</span>
              <span>Staff / Admin</span>
            </button>
          </div>

          {/* Feedback Alerts */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-xl text-xs font-medium flex items-center gap-2">
              <span className="material-symbols-outlined text-base">error</span>
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 rounded-xl text-xs font-medium flex items-center gap-2">
              <span className="material-symbols-outlined text-base">check_circle</span>
              <span>{success}</span>
            </div>
          )}

          {/* 1. MEMBER SIGN IN FORM */}
          {loginMode === 'member' && (
            <form onSubmit={handleMemberLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Registered Mobile Number
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xl">
                    phone
                  </span>
                  <input
                    type="tel"
                    value={memberCredentials.phone}
                    onChange={(e) => setMemberCredentials({ ...memberCredentials, phone: e.target.value })}
                    placeholder="e.g. 9876543210"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
                    required
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    4-Digit Security PIN
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowForgotPinModal(true)}
                    className="text-xs font-semibold text-primary hover:underline cursor-pointer"
                  >
                    Forgot PIN?
                  </button>
                </div>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xl">
                    lock
                  </span>
                  <input
                    type="password"
                    maxLength={4}
                    value={memberCredentials.pin}
                    onChange={(e) => setMemberCredentials({ ...memberCredentials, pin: e.target.value.replace(/\D/g, '') })}
                    placeholder="••••"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm tracking-[0.3em] focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all font-mono"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-primary hover:bg-primary/90 disabled:opacity-50 text-white font-bold rounded-xl shadow-lg shadow-primary/25 transition-all active:scale-[0.98] mt-2 flex items-center justify-center gap-2 cursor-pointer text-sm"
              >
                {loading ? (
                  <>
                    <span className="inline-block size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In</span>
                    <span className="material-symbols-outlined text-base">arrow_forward</span>
                  </>
                )}
              </button>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 text-center">
                <button
                  type="button"
                  onClick={() => setShowForgotPinModal(true)}
                  className="text-xs text-slate-500 dark:text-slate-400 hover:text-primary dark:hover:text-primary inline-flex items-center gap-1.5 cursor-pointer font-medium transition-colors"
                >
                  <span className="material-symbols-outlined text-sm">lock_reset</span>
                  <span>Need to reset or set your PIN? Click here</span>
                </button>
              </div>
            </form>
          )}

          {/* 2. STAFF / ADMIN LOGIN FORM */}
          {loginMode === 'staff' && (
            <form onSubmit={handleStaffLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Username
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xl">
                    person
                  </span>
                  <input
                    type="text"
                    value={staffCredentials.username}
                    onChange={(e) => setStaffCredentials({ ...staffCredentials, username: e.target.value })}
                    placeholder="Enter your username"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xl">
                    lock
                  </span>
                  <input
                    type="password"
                    value={staffCredentials.password}
                    onChange={(e) => setStaffCredentials({ ...staffCredentials, password: e.target.value })}
                    placeholder="Enter your password"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-primary hover:bg-primary/90 disabled:opacity-50 text-white font-bold rounded-xl shadow-lg shadow-primary/25 transition-all active:scale-[0.98] mt-2 flex items-center justify-center gap-2 cursor-pointer text-sm"
              >
                {loading ? (
                  <>
                    <span className="inline-block size-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In</span>
                    <span className="material-symbols-outlined text-base">arrow_forward</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-6 text-xs text-slate-500 dark:text-slate-400">
          <p>© 2026 IT Leaders Community. All rights reserved.</p>
        </div>

        {/* Reusable Forgot / Set PIN Modal */}
        <ForgotPinModal
          isOpen={showForgotPinModal}
          onClose={() => setShowForgotPinModal(false)}
          initialPhone={memberCredentials.phone}
          onSuccess={({ newPin, phoneNumber }) => {
            setMemberCredentials({ phone: phoneNumber, pin: newPin })
            setSuccess('PIN set successfully! You can now sign in with your new PIN.')
          }}
        />
      </div>
    </div>
  )
}
