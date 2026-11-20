import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { useToast } from '../context/ToastContext'
import { Search, Star, MessageSquare, Trash2, Calendar, ThumbsUp, Sparkles } from 'lucide-react'
import ConfirmModal from '../components/ConfirmModal'
import { dataCache } from '../utils/dataCache'

export default function Review() {
  const { showToast } = useToast()
  const [reviewList, setReviewList] = useState(() => dataCache.get('review') || [])
  const [loading, setLoading] = useState(() => !dataCache.has('review'))
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, id: null })
  const [search, setSearch] = useState('')
  const [ratingFilter, setRatingFilter] = useState('Semua')

  useEffect(() => { fetchReview() }, [])

  const fetchReview = async () => {
    if (!dataCache.has('review')) {
      setLoading(true)
    }
    const { data } = await supabase
      .from('review')
      .select(`
        id_review, rating, komentar, tanggal,
        wisatawan (nama_wisatawan),
        wisata (nama_wisata)
      `)
      .order('tanggal', { ascending: false })
    if (data) {
      setReviewList(data)
      dataCache.set('review', data)
    }
    setLoading(false)
  }

  const handleDeleteClick = (id) => {
    setDeleteConfirm({ isOpen: true, id })
  }

  const confirmDelete = async () => {
    const { id } = deleteConfirm
    if (!id) return

    try {
      const { error } = await supabase.from('review').delete().eq('id_review', id)
      if (error) throw error

      showToast('Ulasan berhasil dihapus', 'success')
      dataCache.invalidate('review')
      fetchReview()
    } catch (err) {
      showToast('Gagal menghapus review: ' + err.message, 'error')
    } finally {
      setDeleteConfirm({ isOpen: false, id: null })
    }
  }

  const renderStars = (rating) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star 
        key={i} 
        className={`w-3.5 h-3.5 ${i < rating ? 'text-amber-400 fill-amber-400' : 'text-slate-200'}`} 
      />
    ))
  }

  const filtered = reviewList.filter(r => {
    const matchSearch =
      r.wisata?.nama_wisata?.toLowerCase().includes(search.toLowerCase()) ||
      r.wisatawan?.nama_wisatawan?.toLowerCase().includes(search.toLowerCase()) ||
      r.komentar?.toLowerCase().includes(search.toLowerCase())
    const matchRating = ratingFilter === 'Semua' || r.rating === Number(ratingFilter)
    return matchSearch && matchRating
  })

  const avgRating = reviewList.length > 0
    ? (reviewList.reduce((acc, r) => acc + r.rating, 0) / reviewList.length).toFixed(1)
    : '0.0'

  const todayStr = new Date().toLocaleDateString('en-CA')
  const todayReviewsCount = reviewList.filter(r => r.tanggal === todayStr).length

  return (
    <div className="flex flex-col gap-6">
      
      {/* Page Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
          Kelola Review Wisata
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Pantau feedback pengunjung, rating destinasi wisata, serta komentar wisatawan.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center justify-between gap-4">
          <div>
            <span className="text-xs font-medium text-slate-500 block mb-1">Total Ulasan</span>
            <p className="text-2xl font-bold text-slate-900 tracking-tight">{reviewList.length}</p>
            <p className="text-xs text-slate-400 mt-0.5">Ulasan tersimpan</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shrink-0">
            <MessageSquare className="w-6 h-6" />
          </div>
        </div>
        
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center justify-between gap-4">
          <div>
            <span className="text-xs font-medium text-slate-500 block mb-1">Rata-rata Rating</span>
            <div className="flex items-baseline gap-1">
              <p className="text-2xl font-bold text-amber-600 tracking-tight">{avgRating}</p>
              <span className="text-slate-400 font-medium text-xs">/ 5.0</span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">Skor kepuasan</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-500 border border-amber-100 flex items-center justify-center shrink-0">
            <Star className="w-6 h-6 fill-amber-500" />
          </div>
        </div>
        
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center justify-between gap-4">
          <div>
            <span className="text-xs font-medium text-slate-500 block mb-1">Ulasan Hari Ini</span>
            <p className="text-2xl font-bold text-emerald-600 tracking-tight">{todayReviewsCount}</p>
            <p className="text-xs text-slate-400 mt-0.5">Aktivitas baru</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0">
            <Calendar className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 sm:p-5 border-b border-slate-200/80 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-50/70">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base sm:text-lg font-bold font-[Sora] text-slate-900 mr-1">Daftar Review</h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100/70 text-amber-800 mr-2">
              {filtered.length} Ulasan
            </span>

            {/* Rating Filter Pills */}
            <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200/90 shadow-2xs">
              {['Semua', 5, 4, 3, 2, 1].map((star) => (
                <button
                  key={star}
                  onClick={() => setRatingFilter(star)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${
                    ratingFilter === star
                      ? 'bg-amber-500 text-white shadow-2xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {star === 'Semua' ? 'Semua' : (
                    <>
                      <span>{star}</span>
                      <Star className={`w-3 h-3 ${ratingFilter === star ? 'fill-white text-white' : 'fill-amber-400 text-amber-400'}`} />
                    </>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Cari wisata, nama, ulasan..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-xs"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-12 text-center text-slate-500">Memuat data review...</div>
          ) : (
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80">
                  <th className="py-3.5 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider w-14 text-center">No</th>
                  <th className="py-3.5 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Destinasi Wisata</th>
                  <th className="py-3.5 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Wisatawan</th>
                  <th className="py-3.5 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider min-w-[130px]">Rating</th>
                  <th className="py-3.5 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Komentar</th>
                  <th className="py-3.5 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Tanggal</th>
                  <th className="py-3.5 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.length > 0 ? filtered.map((item, index) => (
                  <tr key={item.id_review} className="hover:bg-blue-50/20 transition-colors group">
                    <td className="py-4 px-4 text-center text-slate-400 text-sm font-medium">{index + 1}</td>
                    <td className="py-4 px-4">
                      <span className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                        {item.wisata?.nama_wisata || '-'}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-slate-700 font-medium text-sm">
                        {item.wisatawan?.nama_wisatawan || <span className="text-slate-400 italic">Anonim</span>}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50/80 border border-amber-200/60 rounded-lg">
                        <div className="flex items-center gap-0.5">
                          {renderStars(item.rating)}
                        </div>
                        <span className="text-xs font-bold text-amber-700">{item.rating}/5</span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <p className="text-xs sm:text-sm text-slate-600 italic bg-slate-50/60 p-2 rounded-lg border border-slate-100 line-clamp-2 max-w-sm" title={item.komentar || '-'}>
                        "{item.komentar || '-'}"
                      </p>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-xs text-slate-500 whitespace-nowrap font-medium">{item.tanggal}</span>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <div className="flex items-center justify-end">
                        <button 
                          onClick={() => handleDeleteClick(item.id_review)}
                          className="p-2 text-red-500 bg-red-50 hover:bg-red-100 rounded-lg transition-colors duration-150"
                          title="Hapus Review"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-500">
                      {search ? 'Tidak ada review yang cocok dengan pencarian.' : 'Belum ada data review.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <ConfirmModal
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, id: null })}
        onConfirm={confirmDelete}
        title="Hapus review ini?"
        description="Data review akan dihapus permanen dari sistem."
        confirmText="Hapus"
      />
    </div>
  )
}
