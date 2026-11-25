import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { useToast } from '../context/ToastContext'
import { Search, Users, Eye, Mail, Star, X, MessageSquare, Calendar, Trash2 } from 'lucide-react'
import ConfirmModal from '../components/ConfirmModal'
import { dataCache } from '../utils/dataCache'

export default function Wisatawan() {
  const { showToast } = useToast()
  const [wisatawanList, setWisatawanList] = useState(() => dataCache.get('wisatawan') || [])
  const [loading, setLoading] = useState(() => !dataCache.has('wisatawan'))
  const [search, setSearch] = useState('')
  const [selectedUser, setSelectedUser] = useState(null)
  const [userReviews, setUserReviews] = useState([])
  const [loadingReviews, setLoadingReviews] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, id: null, name: '' })

  useEffect(() => { fetchWisatawan() }, [])

  const fetchWisatawan = async () => {
    if (!dataCache.has('wisatawan')) {
      setLoading(true)
    }
    const { data, error } = await supabase
      .from('wisatawan')
      .select('id_wisatawan, nama_wisatawan, email')
      .order('id_wisatawan')
    if (error) {
      console.error('Gagal mengambil data wisatawan:', error)
    }
    if (data) {
      setWisatawanList(data)
      dataCache.set('wisatawan', data)
    }
    setLoading(false)
  }

  const handleDeleteUser = (user) => {
    setDeleteConfirm({ isOpen: true, id: user.id_wisatawan, name: user.nama_wisatawan })
  }

  const confirmDeleteUser = async () => {
    const { id } = deleteConfirm
    if (!id) return

    try {
      // Hapus riwayat itinerary dan item wisata terkait terlebih dahulu agar tidak terkendala foreign key
      const { data: itins } = await supabase.from('itinerary').select('id_itinerary').eq('id_wisatawan', id)
      if (itins && itins.length > 0) {
        const itinIds = itins.map(it => it.id_itinerary)
        await supabase.from('itinerary_wisata').delete().in('id_itinerary', itinIds)
        await supabase.from('itinerary').delete().eq('id_wisatawan', id)
      }

      // Hapus riwayat ulasan wisatawan
      await supabase.from('review').delete().eq('id_wisatawan', id)
      const { error } = await supabase.from('wisatawan').delete().eq('id_wisatawan', id)
      if (error) throw error

      showToast('Akun wisatawan berhasil dihapus', 'success')
      dataCache.invalidate('wisatawan')
      dataCache.invalidate('review')
      dataCache.invalidate('dashboard_data')
      fetchWisatawan()
    } catch (err) {
      showToast('Gagal menghapus wisatawan: ' + err.message, 'error')
    } finally {
      setDeleteConfirm({ isOpen: false, id: null, name: '' })
    }
  }

  const handleOpenDetail = async (user) => {
    setSelectedUser(user)
    setLoadingReviews(true)
    try {
      const { data } = await supabase
        .from('review')
        .select('id_review, rating, komentar, tanggal, wisata(nama_wisata)')
        .eq('id_wisatawan', user.id_wisatawan)
        .order('tanggal', { ascending: false })
      setUserReviews(data || [])
    } catch (err) {
      console.error('Gagal memuat ulasan pengguna:', err)
      setUserReviews([])
    } finally {
      setLoadingReviews(false)
    }
  }

  const getAvatarColor = (name) => {
    if (!name) return 'bg-slate-100 text-slate-500'
    const colors = [
      'bg-blue-100 text-blue-700', 'bg-indigo-100 text-indigo-700',
      'bg-purple-100 text-purple-700', 'bg-pink-100 text-pink-700',
      'bg-emerald-100 text-emerald-700', 'bg-teal-100 text-teal-700',
    ]
    const charCode = name.charCodeAt(0)
    return colors[charCode % colors.length]
  }

  const filtered = wisatawanList.filter(w =>
    w.nama_wisatawan?.toLowerCase().includes(search.toLowerCase()) ||
    w.email?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="flex flex-col gap-6">
      
      {/* Page Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
          Data Wisatawan
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Daftar pengguna terdaftar pada aplikasi mobile Wisata Kampar.
        </p>
      </div>

      {/* Stats Card */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center justify-between gap-4">
          <div>
            <span className="text-xs font-medium text-slate-500 block mb-1">Total Wisatawan</span>
            <p className="text-2xl font-bold text-slate-900 tracking-tight">{wisatawanList.length}</p>
            <p className="text-xs text-slate-400 mt-0.5">Akun terdaftar</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shrink-0">
            <Users className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 sm:p-5 border-b border-slate-200/80 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50/70">
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-bold font-[Sora] text-slate-900">Daftar Akun Wisatawan</h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100/70 text-blue-800">
              {filtered.length} Pengguna
            </span>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nama atau email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-xs"
            />
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-500">Memuat data wisatawan...</div>
        ) : (
          <>
            {/* Mobile Card View (< md) */}
            <div className="md:hidden divide-y divide-slate-100">
              {filtered.length > 0 ? filtered.map((item) => (
                <div key={item.id_wisatawan} className="p-4 flex items-center justify-between gap-3 hover:bg-blue-50/20 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shadow-xs shrink-0 ${getAvatarColor(item.nama_wisatawan)}`}>
                      {item.nama_wisatawan?.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 text-sm truncate">{item.nama_wisatawan}</p>
                      <p className="text-xs text-slate-500 truncate">{item.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => handleOpenDetail(item)}
                      className="p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                      title="Lihat Detail & Ulasan"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteUser(item)}
                      className="p-2 text-red-500 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                      title="Hapus Akun Pengguna"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )) : (
                <div className="p-10 text-center text-sm text-slate-500">
                  {search ? 'Tidak ada wisatawan yang cocok dengan pencarian.' : 'Belum ada data wisatawan.'}
                </div>
              )}
            </div>

            {/* Desktop Table View (>= md) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200/80">
                    <th className="py-3.5 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider w-16 text-center">No</th>
                    <th className="py-3.5 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Nama Wisatawan</th>
                    <th className="py-3.5 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Email Akun</th>
                    <th className="py-3.5 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Status</th>
                    <th className="py-3.5 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.length > 0 ? filtered.map((item, index) => (
                    <tr key={item.id_wisatawan} className="hover:bg-blue-50/20 transition-colors group">
                      <td className="py-4 px-4 text-center text-slate-400 text-sm font-medium">{index + 1}</td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shadow-xs ${getAvatarColor(item.nama_wisatawan)}`}>
                            {item.nama_wisatawan?.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{item.nama_wisatawan}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-1.5 text-slate-600 text-sm">
                          <Mail className="w-3.5 h-3.5 text-slate-400" />
                          <span>{item.email}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          Aktif
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button 
                            onClick={() => handleOpenDetail(item)}
                            className="p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors duration-150"
                            title="Lihat Detail & Ulasan"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleDeleteUser(item)}
                            className="p-2 text-red-500 bg-red-50 hover:bg-red-100 rounded-lg transition-colors duration-150"
                            title="Hapus Akun Pengguna"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-500">
                        {search ? 'Tidak ada wisatawan yang cocok dengan pencarian.' : 'Belum ada data wisatawan.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Modal Detail Wisatawan */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/70">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shadow-xs ${getAvatarColor(selectedUser.nama_wisatawan)}`}>
                  {selectedUser.nama_wisatawan?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">{selectedUser.nama_wisatawan}</h3>
                  <p className="text-xs text-slate-500">{selectedUser.email}</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedUser(null)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <MessageSquare className="w-4 h-4 text-blue-600" />
                  Riwayat Ulasan ({userReviews.length})
                </span>
                <span className="text-xs text-slate-400">ID Wisatawan: #{selectedUser.id_wisatawan}</span>
              </div>

              {loadingReviews ? (
                <div className="text-center py-8 text-slate-400 text-sm">Memuat riwayat ulasan...</div>
              ) : userReviews.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-sm bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  Wisatawan ini belum pernah memberikan ulasan destinasi.
                </div>
              ) : (
                <div className="space-y-3">
                  {userReviews.map((rev) => (
                    <div key={rev.id_review} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800 text-sm">{rev.wisata?.nama_wisata || 'Destinasi Wisata'}</span>
                        <div className="flex items-center gap-0.5 text-amber-500">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star 
                              key={i} 
                              className={`w-3.5 h-3.5 ${i < rev.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`} 
                            />
                          ))}
                        </div>
                      </div>
                      <p className="text-xs text-slate-600 italic">"{rev.komentar}"</p>
                      <p className="text-[11px] text-slate-400 font-medium pt-1 border-t border-slate-200/60">
                        Tanggal: {rev.tanggal || '-'}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50/70 flex justify-end">
              <button
                onClick={() => setSelectedUser(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold rounded-xl transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Modal Konfirmasi Hapus Wisatawan */}
      <ConfirmModal
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, id: null, name: '' })}
        onConfirm={confirmDeleteUser}
        title="Hapus Akun Wisatawan?"
        description={`Akun "${deleteConfirm.name}" beserta riwayat ulasannya akan dihapus permanen.`}
        confirmText="Hapus"
      />
    </div>
  )
}
