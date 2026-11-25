import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { useNavigate } from 'react-router-dom'
import { Mail, Lock, LogIn, AlertCircle, Eye, EyeOff } from 'lucide-react'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [lockoutSeconds, setLockoutSeconds] = useState(0)
  const [failedAttempts, setFailedAttempts] = useState(0)
  const navigate = useNavigate()

  useEffect(() => {
    const savedEmail = localStorage.getItem('remember_admin_email')
    if (savedEmail) {
      setEmail(savedEmail)
      setRememberMe(true)
    }
  }, [])

  useEffect(() => {
    if (lockoutSeconds <= 0) return
    const timer = setInterval(() => {
      setLockoutSeconds((prev) => prev - 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [lockoutSeconds])

  const handleLogin = async (e) => {
    e.preventDefault()
    if (lockoutSeconds > 0) return
    setError('')
    setLoading(true)

    const inputVal = email.trim()

    const { data, error } = await supabase
      .from('admin')
      .select('*')
      .or(`email.ilike.${inputVal},email.ilike.${inputVal}@%,nama_admin.ilike.%${inputVal}%`)
      .eq('password', password)

    setLoading(false)

    if (error || !data || data.length === 0) {
      const nextFailed = failedAttempts + 1
      setFailedAttempts(nextFailed)

      if (nextFailed >= 5) {
        setLockoutSeconds(30)
        setError('Terlalu banyak percobaan gagal. Silakan tunggu 30 detik.')
      } else {
        setError(`Email atau password salah! (${nextFailed}/5 percobaan)`)
      }
      return
    }

    setFailedAttempts(0)

    if (rememberMe) {
      localStorage.setItem('remember_admin_email', email.trim())
    } else {
      localStorage.removeItem('remember_admin_email')
    }

    localStorage.setItem('admin', JSON.stringify(data[0]))
    navigate('/dashboard')
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-white">
      {/* Kiri: Panel Visual (Branding) */}
      <div className="relative hidden lg:flex lg:w-[45%] flex-col justify-between overflow-hidden p-12">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/bg_login.jpg')" }}
        />
        {/* Overlay Vignette & Bottom Gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/30 to-transparent" />
        <div className="absolute inset-0 bg-black/20" />
        
        {/* Konten Atas Panel Kiri */}
        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-8">
            <div className="bg-white/90 backdrop-blur-md p-1.5 rounded-xl shadow-lg shadow-black/5 border border-white/50 flex items-center justify-center">
              <img src="/logo.png" alt="Logo Kampar" className="h-9 w-auto object-contain" />
            </div>
            <span className="text-white font-[Sora] font-bold text-xl tracking-wide drop-shadow-md">Wisata Kampar</span>
          </div>
        </div>

        {/* Konten Tengah/Bawah Panel Kiri */}
        <div className="relative z-10 max-w-lg">
          <h1 className="text-4xl lg:text-5xl font-[Sora] font-bold text-white mb-6 leading-tight animate-in fade-in slide-in-from-bottom-8 duration-700 delay-150 fill-mode-both drop-shadow-lg">
            Sistem Informasi <br/>
            <span className="text-blue-300">Geografis Wisata</span>
          </h1>
          <p className="text-slate-100 text-lg leading-relaxed animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300 fill-mode-both drop-shadow-md">
            Kelola data destinasi, fasilitas, jalur, dan wisatawan di Kabupaten Kampar secara mudah, akurat, dan terintegrasi.
          </p>
        </div>
        
        {/* Hiasan Bawah Panel Kiri */}
        <div className="relative z-10 text-slate-300 text-sm drop-shadow-sm">
          &copy; {new Date().getFullYear()} Dinas Pariwisata Kab. Kampar
        </div>
      </div>

      {/* Kanan: Panel Form Login */}
      <div className="w-full lg:w-[55%] flex items-center justify-center p-6 sm:p-12 relative overflow-hidden">
        {/* Hiasan Background Kanan */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50 rounded-bl-full blur-3xl opacity-60 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-50 rounded-tr-full blur-3xl opacity-60 pointer-events-none" />

        <div className="w-full max-w-[400px] relative z-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
          <div className="text-center lg:text-left mb-10">
            {/* Logo untuk versi mobile/tablet */}
            <img src="/logo.png" alt="Logo" className="h-16 w-auto mx-auto lg:mx-0 mb-6 drop-shadow-sm block lg:hidden" />
            <img src="/logo.png" alt="Logo" className="h-16 w-auto mb-6 drop-shadow-sm hidden lg:block" />
            
            <h2 className="text-3xl font-[Sora] font-bold text-slate-900 mb-2">Login Admin</h2>
            <p className="text-slate-500 text-sm">Silakan masukkan email dan password Anda untuk masuk ke dashboard.</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 rounded-xl flex items-start gap-3 animate-in fade-in zoom-in-95 duration-200">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-500" />
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-700">Email atau Username</label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                <input
                  type="text"
                  autoComplete="username"
                  placeholder="Masukkan email atau username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                  autoFocus={!email}
                  className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 hover:border-slate-300 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all disabled:opacity-50 text-slate-700 placeholder:text-slate-400 shadow-sm"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-semibold text-slate-700">Password</label>
              </div>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  className="w-full pl-12 pr-12 py-3.5 bg-white border border-slate-200 hover:border-slate-300 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all disabled:opacity-50 text-slate-700 placeholder:text-slate-400 shadow-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
                  tabIndex={-1}
                  title={showPassword ? 'Sembunyikan password' : 'Lihat password'}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Checkbox Ingat Saya */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  disabled={loading}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 transition-colors cursor-pointer"
                />
                <span className="text-sm font-medium text-slate-600">Ingat Saya</span>
              </label>
            </div>

            <button 
              type="submit" 
              disabled={loading || lockoutSeconds > 0}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-[Sora] font-semibold rounded-xl transition-all duration-300 shadow-lg shadow-blue-600/20 hover:shadow-blue-600/40 hover:-translate-y-0.5 disabled:opacity-70 disabled:hover:translate-y-0 disabled:hover:shadow-none mt-4"
            >
              {loading ? (
                <span className="flex items-center gap-2">Memeriksa kredensial...</span>
              ) : lockoutSeconds > 0 ? (
                <span>Terkunci ({lockoutSeconds}s)</span>
              ) : (
                <>
                  <span>Masuk ke Dashboard</span>
                  <LogIn className="w-5 h-5" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}