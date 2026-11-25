import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../supabaseClient'
import { useToast } from '../context/ToastContext'
import { 
  Search, Plus, Edit2, Trash2, Building, Bath, Moon, Car, Utensils, 
  Tent, Bed, X, Camera, Waves, Wifi, Ship, Trees, Gamepad2, 
  ShoppingBag, ShieldCheck, HeartPulse, Bike, Music, Tag 
} from 'lucide-react'
import ConfirmModal from '../components/ConfirmModal'
import { dataCache } from '../utils/dataCache'

export default function Fasilitas() {
  const { showToast } = useToast()
  const [fasilitasList, setFasilitasList] = useState(() => dataCache.get('fasilitas') || [])
  const [loading, setLoading] = useState(() => !dataCache.has('fasilitas'))
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, id: null })
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editData, setEditData] = useState(null)
  const [namaFasilitas, setNamaFasilitas] = useState('')
  const [formError, setFormError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => { fetchFasilitas() }, [])

  const fetchFasilitas = async () => {
    if (!dataCache.has('fasilitas')) {
      setLoading(true)
    }
    const { data } = await supabase.from('fasilitas').select('*, wisata_fasilitas(id_wisata)').order('id_fasilitas')
    if (data) {
      setFasilitasList(data)
      dataCache.set('fasilitas', data)
    }
    setLoading(false)
  }

  const getFasilitasIcon = (name) => {
    const n = (name || '').toLowerCase()
    if (n.includes('toilet') || n.includes('wc') || n.includes('mandi') || n.includes('kamar kecil')) {
      return { Icon: Bath, bg: 'bg-cyan-100/70 text-cyan-700 border-cyan-200/60' }
    }
    if (n.includes('mushol') || n.includes('masjid') || n.includes('ibadah') || n.includes('sholat')) {
      return { Icon: Moon, bg: 'bg-emerald-100/70 text-emerald-700 border-emerald-200/60' }
    }
    if (n.includes('parkir') || n.includes('kendaraan')) {
      return { Icon: Car, bg: 'bg-slate-200/70 text-slate-700 border-slate-300/60' }
    }
    if (n.includes('warung') || n.includes('makan') || n.includes('resto') || n.includes('kafe') || n.includes('kuliner') || n.includes('kantin')) {
      return { Icon: Utensils, bg: 'bg-orange-100/70 text-orange-700 border-orange-200/60' }
    }
    if (n.includes('foto') || n.includes('spot') || n.includes('selfie') || n.includes('kamera')) {
      return { Icon: Camera, bg: 'bg-pink-100/70 text-pink-700 border-pink-200/60' }
    }
    if (n.includes('pantai') || n.includes('danau') || n.includes('sungai') || n.includes('kolam') || n.includes('air') || n.includes('renang') || n.includes('water')) {
      return { Icon: Waves, bg: 'bg-sky-100/70 text-sky-700 border-sky-200/60' }
    }
    if (n.includes('gazebo') || n.includes('tenda') || n.includes('kemah') || n.includes('camping')) {
      return { Icon: Tent, bg: 'bg-teal-100/70 text-teal-700 border-teal-200/60' }
    }
    if (n.includes('penginapan') || n.includes('hotel') || n.includes('villa') || n.includes('kamar') || n.includes('resort') || n.includes('homestay')) {
      return { Icon: Bed, bg: 'bg-indigo-100/70 text-indigo-700 border-indigo-200/60' }
    }
    if (n.includes('taman') || n.includes('hutan') || n.includes('pohon') || n.includes('alam') || n.includes('kebun')) {
      return { Icon: Trees, bg: 'bg-emerald-100/70 text-emerald-700 border-emerald-200/60' }
    }
    if (n.includes('perahu') || n.includes('kapal') || n.includes('sampan') || n.includes('kano') || n.includes('rafting') || n.includes('boat')) {
      return { Icon: Ship, bg: 'bg-blue-100/70 text-blue-700 border-blue-200/60' }
    }
    if (n.includes('sepeda') || n.includes('gowes') || n.includes('olahraga')) {
      return { Icon: Bike, bg: 'bg-lime-100/70 text-lime-700 border-lime-200/60' }
    }
    if (n.includes('wahana') || n.includes('permainan') || n.includes('bermain') || n.includes('outbound') || n.includes('playground')) {
      return { Icon: Gamepad2, bg: 'bg-purple-100/70 text-purple-700 border-purple-200/60' }
    }
    if (n.includes('toko') || n.includes('souvenir') || n.includes('oleh') || n.includes('cinderamata') || n.includes('belanja')) {
      return { Icon: ShoppingBag, bg: 'bg-amber-100/70 text-amber-700 border-amber-200/60' }
    }
    if (n.includes('wifi') || n.includes('internet') || n.includes('hotspot')) {
      return { Icon: Wifi, bg: 'bg-violet-100/70 text-violet-700 border-violet-200/60' }
    }
    if (n.includes('pos') || n.includes('keamanan') || n.includes('satpam') || n.includes('informasi') || n.includes('info')) {
      return { Icon: ShieldCheck, bg: 'bg-rose-100/70 text-rose-700 border-rose-200/60' }
    }
    if (n.includes('medis') || n.includes('p3k') || n.includes('kesehatan') || n.includes('klinik')) {
      return { Icon: HeartPulse, bg: 'bg-red-100/70 text-red-700 border-red-200/60' }
    }
    if (n.includes('musik') || n.includes('panggung') || n.includes('hiburan') || n.includes('karaoke')) {
      return { Icon: Music, bg: 'bg-fuchsia-100/70 text-fuchsia-700 border-fuchsia-200/60' }
    }
    return { Icon: Tag, bg: 'bg-blue-100/70 text-blue-700 border-blue-200/60' }
  }

  const filteredFasilitas = useMemo(() => {
    if (!searchTerm) return fasilitasList;
    return fasilitasList.filter(f => 
      f.nama_fasilitas.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [fasilitasList, searchTerm]);

  const handleSubmit = async (e) => {
    e.preventDefault()
    const nama = namaFasilitas.trim()
    if (!nama) { setFormError('Nama fasilitas wajib diisi'); return }

    const duplikat = fasilitasList.some(f =>
      f.nama_fasilitas.toLowerCase() === nama.toLowerCase() &&
      (!editData || f.id_fasilitas !== editData.id_fasilitas)
    )
    if (duplikat) { setFormError('Fasilitas dengan nama ini sudah ada'); return }

    setFormError('')
    setSaving(true)
    try {
      if (editData) {
        const { error } = await supabase.from('fasilitas').update({ nama_fasilitas: nama }).eq('id_fasilitas', editData.id_fasilitas)
        if (error) throw error
        showToast('Fasilitas berhasil diperbarui', 'success')
      } else {
        const { error } = await supabase.from('fasilitas').insert([{ nama_fasilitas: nama }])
        if (error) throw error
        showToast('Fasilitas baru berhasil ditambahkan', 'success')
      }
      resetForm()
      dataCache.invalidate('fasilitas')
      dataCache.invalidate('wf_fasilitas')
      dataCache.invalidate('dashboard_data')
      await fetchFasilitas()
    } catch (err) {
      setFormError('Gagal menyimpan data: ' + err.message)
      showToast('Gagal menyimpan fasilitas: ' + err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (item) => {
    setEditData(item)
    setNamaFasilitas(item.nama_fasilitas)
    setFormError('')
    setShowForm(true)
  }

  const handleDeleteClick = (id) => {
    setDeleteConfirm({ isOpen: true, id })
  }

  const confirmDelete = async () => {
    const { id } = deleteConfirm
    if (!id) return

    try {
      // Hapus relasi ke wisata terlebih dahulu agar tidak terkendala foreign key
      await supabase.from('wisata_fasilitas').delete().eq('id_fasilitas', id)
      const { error } = await supabase.from('fasilitas').delete().eq('id_fasilitas', id)
      if (error) throw error

      showToast('Fasilitas berhasil dihapus', 'success')
      dataCache.invalidate('fasilitas')
      dataCache.invalidate('wf_fasilitas')
      dataCache.invalidate('wf_relasi')
      dataCache.invalidate('dashboard_data')
      fetchFasilitas()
    } catch (err) {
      showToast('Gagal menghapus fasilitas: ' + err.message, 'error')
    } finally {
      setDeleteConfirm({ isOpen: false, id: null })
    }
  }

  const resetForm = () => {
    setShowForm(false)
    setEditData(null)
    setNamaFasilitas('')
    setFormError('')
  }

  return (
    <div className="flex flex-col gap-6">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Kelola Fasilitas
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Master fasilitas pendukung objek wisata di Kabupaten Kampar.
          </p>
        </div>

        {!showForm && (
          <button 
            onClick={() => { setShowForm(true); setEditData(null); setNamaFasilitas(''); setFormError('') }}
            className="flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-medium text-sm transition-colors shadow-xs w-full sm:w-auto shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Fasilitas</span>
          </button>
        )}
      </div>

      {/* Form Section */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-md overflow-hidden transition-all animate-in fade-in duration-200">
          <div className="p-6">
            <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-100">
              <h3 className="text-lg font-bold font-[Sora] text-slate-800">
                {editData ? 'Edit Data Fasilitas' : 'Tambah Fasilitas Baru'}
              </h3>
              <button onClick={resetForm} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {formError && (
              <div className="mb-5 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm font-medium">
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-stretch sm:items-end">
              <div className="w-full sm:flex-1">
                <label className="block text-sm font-semibold text-slate-700 mb-2">Nama Fasilitas *</label>
                <div className="flex items-center gap-2.5">
                  <div 
                    className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border transition-all ${getFasilitasIcon(namaFasilitas).bg}`}
                    title="Pratinjau ikon otomatis"
                  >
                    {(() => {
                      const { Icon } = getFasilitasIcon(namaFasilitas);
                      return <Icon className="w-5 h-5" />;
                    })()}
                  </div>
                  <input
                    type="text"
                    placeholder="Contoh: Spot Foto, Pantai, Mushola, Gazebo..."
                    value={namaFasilitas}
                    onChange={(e) => setNamaFasilitas(e.target.value)}
                    disabled={saving}
                    required
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all disabled:opacity-50 text-sm font-medium"
                  />
                </div>
              </div>
              <div className="flex flex-col-reverse sm:flex-row gap-2.5 sm:gap-3 w-full sm:w-auto">
                <button 
                  type="button" 
                  onClick={resetForm} 
                  disabled={saving}
                  className="w-full sm:w-auto px-6 py-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold rounded-xl transition-colors disabled:opacity-70 text-sm"
                >
                  Batal
                </button>
                <button 
                  type="submit" 
                  disabled={saving}
                  className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all shadow-md shadow-blue-500/20 disabled:opacity-70 text-sm"
                >
                  {saving ? 'Menyimpan...' : (editData ? 'Simpan Perubahan' : 'Tambah Fasilitas')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Table Section */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 sm:p-5 border-b border-slate-200/80 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50/70">
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-bold font-[Sora] text-slate-900">Daftar Fasilitas</h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100/70 text-emerald-800">
              {filteredFasilitas.length} Data
            </span>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Cari fasilitas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-xs"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-12 text-center text-slate-500">Memuat data...</div>
          ) : (
            <table className="w-full text-left border-collapse min-w-[500px]">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80">
                  <th className="py-3.5 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider w-16 text-center">No</th>
                  <th className="py-3.5 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Nama Fasilitas</th>
                  <th className="py-3.5 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center w-40">Terhubung Di</th>
                  <th className="py-3.5 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredFasilitas.length > 0 ? filteredFasilitas.map((item, index) => {
                  const { Icon, bg } = getFasilitasIcon(item.nama_fasilitas)
                  const usageCount = item.wisata_fasilitas?.length || 0
                  return (
                  <tr key={item.id_fasilitas} className="hover:bg-blue-50/20 transition-colors group">
                    <td className="py-4 px-4 text-center text-slate-400 text-sm font-medium">{index + 1}</td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${bg} shadow-xs`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <span className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{item.nama_fasilitas}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className="inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200/70">
                        {usageCount} Objek Wisata
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => handleEdit(item)}
                          className="p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors duration-150"
                          title="Edit Fasilitas"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDeleteClick(item.id_fasilitas)}
                          className="p-2 text-red-500 bg-red-50 hover:bg-red-100 rounded-lg transition-colors duration-150"
                          title="Hapus Fasilitas"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )}) : (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-slate-500">
                      {searchTerm ? 'Tidak ada fasilitas yang cocok dengan pencarian.' : 'Belum ada data fasilitas.'}
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
        title="Hapus fasilitas ini?"
        description="Hubungan fasilitas ini ke semua tempat wisata juga akan dihapus permanen."
        confirmText="Hapus"
      />
    </div>
  )
}
