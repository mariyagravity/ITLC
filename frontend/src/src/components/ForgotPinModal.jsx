import { useState, useEffect } from 'react'
import { authService } from '../services/authService'

export default function ForgotPinModal({
  isOpen,
  onClose,
  initialPhone = '',
  onSuccess = () => {},
  title = 'Forgot / Set Security PIN'
}) {
  const [step, setStep] = useState('request') // 'request' | 'verify' | 'done'
  const [phoneNumber, setPhoneNumber] = useState('')
  const [maskedEmail, setMaskedEmail] = useState('')
  const [resetCode, setResetCode] = useState('')
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  useEffect(() => {
    if (isOpen) {
      setPhoneNumber(initialPhone || '')
      setStep('request')
      setResetCode('')
      setNewPin('')
      setConfirmPin('')
      setError('')
      setSuccessMsg('')
      setMaskedEmail('')
    }
  }, [isOpen, initialPhone])

  if (!isOpen) return null

  // Step 1: Request 6-digit code sent to member's email
  async function handleSendCode(e) {
    e?.preventDefault()
    setError('')
    setSuccessMsg('')
    const cleanPhone = phoneNumber.trim()

    if (!cleanPhone) {
      setError('Please enter your registered mobile number')
      return
    }

    setLoading(true)
    try {
      const res = await authService.forgotPin(cleanPhone)
      if (res.maskedEmail) setMaskedEmail(res.maskedEmail)
      setStep('verify')
      setSuccessMsg(res.message || 'Verification code sent to your registered email')
    } catch (err) {
      setError(err.message || 'Failed to send reset code. Please check your phone number.')
    } finally {
      setLoading(false)
    }
  }

  // Step 2: Verify 6-digit code and save new 4-digit PIN
  async function handleResetPin(e) {
    e?.preventDefault()
    setError('')
    setSuccessMsg('')

    const code = resetCode.trim()
    const pin = newPin.trim()
    const confirm = confirmPin.trim()

    if (!code || code.length !== 6) {
      setError('Please enter the 6-digit verification code')
      return
    }

    if (!pin || pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      setError('PIN must be exactly 4 digits')
      return
    }

    if (pin !== confirm) {
      setError('PIN and confirmation PIN do not match')
      return
    }

    setLoading(true)
    try {
      const res = await authService.resetPin({
        phoneNumber: phoneNumber.trim(),
        resetCode: code,
        newPin: pin
      })

      setStep('done')
      setSuccessMsg(res.message || 'PIN updated successfully!')
      setTimeout(() => {
        onSuccess({ newPin: pin, phoneNumber: phoneNumber.trim() })
        onClose()
      }, 1400)
    } catch (err) {
      setError(err.message || 'Failed to reset PIN. Code may be invalid or expired.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-2xl">lock_reset</span>
            <h3 className="font-bold text-slate-900 dark:text-white text-base">
              {title}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-xl text-xs font-medium flex items-center gap-2">
              <span className="material-symbols-outlined text-base">error</span>
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 rounded-xl text-xs font-medium flex items-center gap-2">
              <span className="material-symbols-outlined text-base">check_circle</span>
              <span>{successMsg}</span>
            </div>
          )}



          {/* STEP 1: REQUEST CODE */}
          {step === 'request' && (
            <form onSubmit={handleSendCode} className="space-y-4">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Enter your registered mobile number. We will send a 6-digit verification code to your registered email address.
              </p>

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
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="e.g. 9876543210"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                    required
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2.5 px-4 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl font-medium text-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !phoneNumber.trim()}
                  className="flex-1 py-2.5 px-4 bg-primary text-white rounded-xl font-semibold text-xs shadow-md shadow-primary/20 hover:bg-primary/90 disabled:opacity-50 transition-all flex items-center justify-center gap-1.5"
                >
                  {loading ? (
                    <>
                      <span className="inline-block size-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Sending...</span>
                    </>
                  ) : (
                    <>
                      <span>Send Reset Code</span>
                      <span className="material-symbols-outlined text-sm">send</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* STEP 2: VERIFY CODE & SET NEW PIN */}
          {step === 'verify' && (
            <form onSubmit={handleResetPin} className="space-y-4">
              <div className="p-3 bg-blue-50/70 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50 rounded-xl">
                <p className="text-xs text-blue-800 dark:text-blue-300">
                  {maskedEmail ? (
                    <>We sent a 6-digit code to <strong className="font-semibold">{maskedEmail}</strong>.</>
                  ) : (
                    <>Check your registered email address for the 6-digit reset code.</>
                  )}
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  6-Digit Verification Code
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={resetCode}
                  onChange={(e) => setResetCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="123456"
                  className="w-full text-center text-lg font-mono tracking-[0.4em] py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    New 4-Digit PIN
                  </label>
                  <input
                    type="password"
                    maxLength={4}
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                    placeholder="••••"
                    className="w-full text-center text-lg font-mono tracking-[0.3em] py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Confirm PIN
                  </label>
                  <input
                    type="password"
                    maxLength={4}
                    value={confirmPin}
                    onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                    placeholder="••••"
                    className="w-full text-center text-lg font-mono tracking-[0.3em] py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={() => setStep('request')}
                  className="text-xs text-primary hover:underline flex items-center gap-1 font-medium"
                >
                  <span className="material-symbols-outlined text-sm">arrow_back</span>
                  <span>Resend code or change phone</span>
                </button>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2.5 px-4 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl font-medium text-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || resetCode.length !== 6 || newPin.length !== 4}
                  className="flex-1 py-2.5 px-4 bg-primary text-white rounded-xl font-semibold text-xs shadow-md shadow-primary/20 hover:bg-primary/90 disabled:opacity-50 transition-all flex items-center justify-center gap-1.5"
                >
                  {loading ? (
                    <>
                      <span className="inline-block size-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Saving PIN...</span>
                    </>
                  ) : (
                    <>
                      <span>Set & Save PIN</span>
                      <span className="material-symbols-outlined text-sm">check</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* STEP 3: DONE */}
          {step === 'done' && (
            <div className="text-center py-4 space-y-3 animate-fadeIn">
              <div className="size-14 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-sm">
                <span className="material-symbols-outlined text-3xl">check_circle</span>
              </div>
              <h4 className="text-base font-bold text-slate-900 dark:text-white">
                PIN Updated Successfully!
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Your new 4-digit PIN is now active and ready to use.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
