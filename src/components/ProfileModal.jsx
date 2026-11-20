import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { useToast } from '../context/ToastContext'
import { X, User, Lock, Mail, Eye, EyeOff, Save, ShieldCheck } from 'lucide-react'

export default function ProfileModal({ isOpen, onClose }) {
  const { showToast } = useToast()
  const [admin, setAdmin] = useState(null)
  const [namaAdmin, setNamaAdmin] = useState('')
  const [email, setEmail] = useState('')
  const [passwordLama, setPasswordLama] = useState('')
  const [passwordBaru, setPasswordBaru] = useState('')
  const [konfirmasiPassword, setKonfirmasiPassword] = useState('')
  const [showOldPassword, setShowOldPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (isOpen) {
      const stored = JSON.parse(localStorage.getItem('admin') || 'null')
      if (stored) {
        setAdmin(stored)
        setNamaAdmin(stored.nama_admin || '')
        setEmail(stored.email || '')
      }
      setPasswordLama('')
      setPasswordBaru('')
      setKonfirmasiPassword('')
      setError('')
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!namaAdmin.trim()) {
      setError('Nama admin tidak boleh kosong.')
      return
    }

    // Jika ingin ganti password
    if (passwordBaru || passwordLama || konfirmasiPassword) {
      if (!passwordLama) {
        setError('Masukkan password lama Anda untuk konfirmasi pergantian.')
        return
      }

      if (passwordLama !== admin.password) {
        setError('Password lama yang Anda masukkan salah!')
        return
      }

      if (passwordBaru.length < 6) {
        setError('Password baru minimal harus 6 karakter.')
        return
      }

      if (passwordBaru !== konfirmasiPassword) {
        setError('Konfirmasi password baru tidak cocok.')
        return
      }
    }

    setLoading(true)

    try {
      const updatePayload = {
        nama_admin: namaAdmin.trim()
      }

      if (passwordBaru) {
        updatePayload.password = passwordBaru
      }

      const { data, error: updateError } = await supabase
        .from('admin')
        .update(updatePayload)
        .eq('id_admin', admin.id_admin)
        .select()

      if (updateError) throw updateError

      const updatedAdmin = data && data[0] ? data[0] : { ...admin, ...updatePayload }
      localStorage.setItem('admin', JSON.stringify(updatedAdmin))
      window.dispatchEvent(new Event('admin-updated'))

      showToast('Profil akun admin berhasil diperbarui!', 'success')
      onClose()
    } catch (err) {
      setError('Gagal memperbarui profil: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-base font-[Sora]">Pengaturan Akun Admin</h3>
              <p className="text-xs text-slate-500">Kelola identitas dan kata sandi akun</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content / Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-semibold flex items-start gap-2">
              <span className="text-sm">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Nama Admin *
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={namaAdmin}
                onChange={(e) => setNamaAdmin(e.target.value)}
                required
                disabled={loading}
                className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all font-medium text-slate-800"
                placeholder="Nama lengkap admin"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                Email Terdaftar
              </label>
              <span className="text-[10px] text-slate-400">Tidak dapat diubah</span>
            </div>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="email"
                value={email}
                disabled
                className="w-full pl-9 pr-3.5 py-2.5 bg-slate-100/80 border border-slate-200/80 rounded-xl text-sm text-slate-500 cursor-not-allowed outline-none select-none font-medium"
              />
            </div>
          </div>

          {/* Section Divider */}
          <div className="pt-2 border-t border-slate-100">
            <h4 className="text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-blue-600" />
              <span>Ganti Kata Sandi (Opsional)</span>
            </h4>
            <p className="text-[11px] text-slate-400 mb-3">
              Kosongkan jika tidak ingin mengubah kata sandi Anda.
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Password Lama
                </label>
                <div className="relative">
                  <input
                    type={showOldPassword ? 'text' : 'password'}
                    value={passwordLama}
                    onChange={(e) => setPasswordLama(e.target.value)}
                    disabled={loading}
                    placeholder="Masukkan password saat ini"
                    className="w-full pl-3.5 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowOldPassword(!showOldPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showOldPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Password Baru (Minimal 6 karakter)
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={passwordBaru}
                    onChange={(e) => setPasswordBaru(e.target.value)}
                    disabled={loading}
                    placeholder="Masukkan password baru"
                    className="w-full pl-3.5 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Ulangi Password Baru
                </label>
                <input
                  type="password"
                  value={konfirmasiPassword}
                  onChange={(e) => setKonfirmasiPassword(e.target.value)}
                  disabled={loading}
                  placeholder="Ketik ulang password baru"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-3 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs sm:text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold rounded-xl transition-colors shadow-xs disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{loading ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
