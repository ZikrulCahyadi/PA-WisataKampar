import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useToast } from '../context/ToastContext'
import { Search, Plus, Edit2, Trash2, Image as ImageIcon, Link, MapPin, X, Filter, Clock, Tag } from 'lucide-react'
import ConfirmModal from '../components/ConfirmModal'
import GaleriModal from '../components/GaleriModal'
import MapPickerModal from '../components/MapPickerModal'
import { dataCache } from '../utils/dataCache'

const KATEGORI_OPTIONS = ['Alam', 'Budaya', 'Sejarah']

const emptyForm = {
  nama_wisata: '', kategori: '', deskripsi: '',
  alamat: '', latitude: '', longitude: '',
  jam_buka: '', jam_tutup: '', harga_tiket: '',
  biaya_parkir_motor: '', biaya_parkir_mobil: '', gambar: ''
}

export default function Wisata() {
  const navigate = useNavigate()
  const location = useLocation()
  const { showToast } = useToast()
  const [wisataList, setWisataList] = useState(() => dataCache.get('wisata') || [])
  const [loading, setLoading] = useState(() => !dataCache.has('wisata'))
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, id: null })
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editData, setEditData] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [formError, setFormError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('Semua')
  const [selectedFile, setSelectedFile] = useState(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [imageInputMode, setImageInputMode] = useState('upload') // 'upload' | 'url'
  const [galeriModal, setGaleriModal] = useState({ isOpen: false, wisataId: null, wisataName: '' })
  const [isMapPickerOpen, setIsMapPickerOpen] = useState(false)

  const handleSelectCoordinatesFromMap = ({ latitude, longitude }) => {
    setForm(prev => ({ ...prev, latitude, longitude }))
    showToast(`Titik koordinat berhasil diterapkan: (${latitude}, ${longitude})`, 'success')
  }

  const handleLatitudePaste = (e) => {
    const text = e.clipboardData?.getData('text')
    if (!text) return
    const match = text.trim().match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/)
    if (match) {
      e.preventDefault()
      setForm(prev => ({ ...prev, latitude: match[1], longitude: match[2] }))
      showToast(`Koordinat berhasil dipisah otomatis: Lat ${match[1]}, Lng ${match[2]}`, 'success')
    }
  }

  useEffect(() => { fetchWisata() }, [])

  useEffect(() => {
    if (location.state?.openForm) {
      setShowForm(true)
      setEditData(null)
      setForm(emptyForm)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [location.state])

  const fetchWisata = async () => {
    if (!dataCache.has('wisata')) {
      setLoading(true)
    }
    const { data } = await supabase.from('wisata').select('*').order('id_wisata')
    if (data) {
      setWisataList(data)
      dataCache.set('wisata', data)
    }
    setLoading(false)
  }

  const filteredWisata = useMemo(() => {
    return wisataList.filter(w => {
      const matchSearch = !searchTerm || 
        w.nama_wisata?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        w.kategori?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        w.alamat?.toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchCat = selectedCategory === 'Semua' || w.kategori === selectedCategory
      return matchSearch && matchCat
    })
  }, [wisataList, searchTerm, selectedCategory])

  const validateForm = () => {
    if (!form.nama_wisata.trim()) return 'Nama wisata wajib diisi'
    if (!form.kategori) return 'Kategori wajib dipilih'
    if (!form.alamat.trim()) return 'Alamat wajib diisi'
    if (form.latitude !== '' && (Number(form.latitude) < -90 || Number(form.latitude) > 90)) {
      return 'Latitude harus di antara -90 sampai 90'
    }
    if (form.longitude !== '' && (Number(form.longitude) < -180 || Number(form.longitude) > 180)) {
      return 'Longitude harus di antara -180 sampai 180'
    }
    if (form.harga_tiket !== '' && Number(form.harga_tiket) < 0) return 'Harga tiket tidak boleh negatif'
    if (form.biaya_parkir_motor !== '' && Number(form.biaya_parkir_motor) < 0) return 'Biaya parkir motor tidak boleh negatif'
    if (form.biaya_parkir_mobil !== '' && Number(form.biaya_parkir_mobil) < 0) return 'Biaya parkir mobil tidak boleh negatif'
    if (form.gambar?.trim() && !selectedFile && !/^https?:\/\//i.test(form.gambar.trim())) {
      return 'URL gambar harus diawali dengan http:// atau https://'
    }
    return ''
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const err = validateForm()
    if (err) { setFormError(err); return }
    setFormError('')
    setSaving(true)

    try {
      let imageUrl = form.gambar || ''

      if (selectedFile) {
        setUploadingImage(true)
        const fileExt = selectedFile.name.split('.').pop()
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
        
        const { error: uploadError } = await supabase.storage
          .from('Foto')
          .upload(fileName, selectedFile)

        if (uploadError) {
          throw new Error('Gagal upload gambar: ' + uploadError.message)
        }

        const { data: { publicUrl } } = supabase.storage
          .from('Foto')
          .getPublicUrl(fileName)

        imageUrl = publicUrl
        setUploadingImage(false)
      }

      const payload = {
        ...form,
        nama_wisata: form.nama_wisata.trim(),
        alamat: form.alamat.trim(),
        deskripsi: form.deskripsi?.trim() || null,
        latitude: form.latitude === '' || isNaN(Number(form.latitude)) ? null : Number(form.latitude),
        longitude: form.longitude === '' || isNaN(Number(form.longitude)) ? null : Number(form.longitude),
        harga_tiket: form.harga_tiket === '' || isNaN(Number(form.harga_tiket)) ? 0 : Number(form.harga_tiket),
        biaya_parkir_motor: form.biaya_parkir_motor === '' || isNaN(Number(form.biaya_parkir_motor)) ? 0 : Number(form.biaya_parkir_motor),
        biaya_parkir_mobil: form.biaya_parkir_mobil === '' || isNaN(Number(form.biaya_parkir_mobil)) ? 0 : Number(form.biaya_parkir_mobil),
        jam_buka: form.jam_buka?.trim() || null,
        jam_tutup: form.jam_tutup?.trim() || null,
        gambar: imageUrl.trim() || null,
      }

      if (editData) {
        const { error: updateError } = await supabase.from('wisata').update(payload).eq('id_wisata', editData.id_wisata)
        if (updateError) throw updateError
        showToast('Data wisata berhasil diperbarui', 'success')
      } else {
        const { error: insertError } = await supabase.from('wisata').insert([payload])
        if (insertError) throw insertError
        showToast('Wisata baru berhasil ditambahkan', 'success')
      }
      resetForm()
      dataCache.invalidate('wisata')
      dataCache.invalidate('wisata_simple')
      dataCache.invalidate('wf_wisata')
      dataCache.invalidate('dashboard_data')
      await fetchWisata()
    } catch (err) {
      setFormError('Gagal menyimpan data: ' + err.message)
      showToast('Gagal menyimpan data: ' + err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (item) => {
    setEditData(item)
    setForm({
      nama_wisata: item.nama_wisata || '',
      kategori: item.kategori || '',
      deskripsi: item.deskripsi || '',
      alamat: item.alamat || '',
      latitude: item.latitude ?? '',
      longitude: item.longitude ?? '',
      jam_buka: item.jam_buka || '',
      jam_tutup: item.jam_tutup || '',
      harga_tiket: item.harga_tiket ?? '',
      biaya_parkir_motor: item.biaya_parkir_motor ?? '',
      biaya_parkir_mobil: item.biaya_parkir_mobil ?? '',
      gambar: item.gambar || ''
    })
    setFormError('')
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDeleteClick = (id) => {
    setDeleteConfirm({ isOpen: true, id })
  }

  const confirmDelete = async () => {
    const { id } = deleteConfirm
    if (!id) return

    try {
      // Bersihkan data relasi terlebih dahulu agar tidak terkendala foreign key
      await supabase.from('wisata_fasilitas').delete().eq('id_wisata', id)
      await supabase.from('galeri_wisata').delete().eq('id_wisata', id)
      await supabase.from('itinerary_wisata').delete().eq('id_wisata', id)
      await supabase.from('graf').delete().or(`titik_awal.eq.${id},titik_tujuan.eq.${id}`)
      await supabase.from('review').delete().eq('id_wisata', id)

      const { error } = await supabase.from('wisata').delete().eq('id_wisata', id)
      if (error) throw error

      showToast('Data wisata berhasil dihapus', 'success')
      dataCache.invalidate('wisata')
      dataCache.invalidate('wisata_simple')
      dataCache.invalidate('wf_wisata')
      dataCache.invalidate('wf_relasi')
      dataCache.invalidate('fasilitas')
      dataCache.invalidate('graf')
      dataCache.invalidate('review')
      dataCache.invalidate('dashboard_data')
      fetchWisata()
    } catch (err) {
      showToast('Gagal menghapus wisata: ' + err.message, 'error')
    } finally {
      setDeleteConfirm({ isOpen: false, id: null })
    }
  }

  const resetForm = () => {
    setShowForm(false)
    setEditData(null)
    setForm(emptyForm)
    setFormError('')
    setSelectedFile(null)
  }

  const getKategoriBadge = (kategori) => {
    switch (kategori) {
      case 'Alam':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200/80';
      case 'Budaya':
        return 'bg-amber-50 text-amber-700 border-amber-200/80';
      case 'Sejarah':
        return 'bg-purple-50 text-purple-700 border-purple-200/80';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  }

  return (
    <div className="flex flex-col gap-6">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Kelola Wisata
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Kelola data destinasi, koordinat lokasi, tarif masuk, dan jadwal operasional wisata.
          </p>
        </div>

        {!showForm && (
          <button 
            onClick={() => { setShowForm(true); setEditData(null); setForm(emptyForm); setFormError('') }}
            className="flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-medium text-sm transition-colors shadow-xs w-full sm:w-auto shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Wisata</span>
          </button>
        )}
      </div>

      {/* Form Section */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-md overflow-hidden transition-all animate-in fade-in duration-200">
          <div className="p-6 sm:p-7">
            <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-100">
              <div>
                <h3 className="text-lg sm:text-xl font-bold font-[Sora] text-slate-800">
                  {editData ? 'Edit Data Wisata' : 'Tambah Destinasi Wisata Baru'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Lengkapi formulir di bawah ini dengan informasi yang valid.</p>
              </div>
              <button 
                onClick={resetForm}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                title="Tutup Form"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {formError && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm font-medium flex items-center gap-2">
                <span>⚠️</span>
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Nama Wisata *</label>
                  <input
                    type="text"
                    placeholder="Contoh: Danau PLTA Koto Panjang"
                    value={form.nama_wisata}
                    onChange={(e) => setForm({ ...form, nama_wisata: e.target.value })}
                    disabled={saving}
                    required
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all disabled:opacity-50 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Kategori *</label>
                  <select
                    value={form.kategori}
                    onChange={(e) => setForm({ ...form, kategori: e.target.value })}
                    disabled={saving}
                    required
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all disabled:opacity-50 text-sm"
                  >
                    <option value="">Pilih kategori wisata</option>
                    {KATEGORI_OPTIONS.map(k => <option key={k} value={k}>{k}</option>)}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Alamat Lengkap *</label>
                  <input
                    type="text"
                    placeholder="Contoh: Desa Merangin, Kec. Kuok, Kabupaten Kampar"
                    value={form.alamat}
                    onChange={(e) => setForm({ ...form, alamat: e.target.value })}
                    disabled={saving}
                    required
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all disabled:opacity-50 text-sm"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-semibold text-slate-700">Foto Utama Wisata</label>
                    {!form.gambar && !selectedFile && (
                      <div className="inline-flex p-0.5 bg-slate-100 rounded-lg text-xs">
                        <button
                          type="button"
                          onClick={() => setImageInputMode('upload')}
                          className={`px-2 py-0.5 rounded-md font-medium transition-all ${
                            imageInputMode === 'upload' ? 'bg-white text-blue-600 shadow-2xs' : 'text-slate-500 hover:text-slate-700'
                          }`}
                        >
                          Upload File
                        </button>
                        <button
                          type="button"
                          onClick={() => setImageInputMode('url')}
                          className={`px-2 py-0.5 rounded-md font-medium transition-all ${
                            imageInputMode === 'url' ? 'bg-white text-blue-600 shadow-2xs' : 'text-slate-500 hover:text-slate-700'
                          }`}
                        >
                          Link URL
                        </button>
                      </div>
                    )}
                  </div>

                  {form.gambar && !selectedFile && (
                    <div className="mb-2 relative w-full h-36 rounded-xl overflow-hidden border border-slate-200 group">
                      <img src={form.gambar} alt="Preview" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      <button 
                        type="button"
                        onClick={() => setForm({...form, gambar: ''})}
                        className="absolute top-2 right-2 p-1.5 bg-red-500/90 hover:bg-red-600 text-white rounded-lg backdrop-blur-sm transition-colors shadow-sm"
                        title="Hapus Gambar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {selectedFile && (
                    <div className="mb-2 p-3 bg-blue-50/50 rounded-xl text-sm flex justify-between items-center border border-blue-200">
                      <span className="truncate max-w-[200px] font-medium text-slate-700">{selectedFile.name}</span>
                      <button 
                        type="button"
                        onClick={() => setSelectedFile(null)}
                        className="text-red-500 hover:text-red-700 font-semibold text-xs px-2.5 py-1 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                      >
                        Batal
                      </button>
                    </div>
                  )}

                  {!form.gambar && !selectedFile && (
                    imageInputMode === 'upload' ? (
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            setSelectedFile(e.target.files[0]);
                          }
                        }}
                        disabled={saving || uploadingImage}
                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all disabled:opacity-50 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer text-xs"
                      />
                    ) : (
                      <div className="space-y-2">
                        <div className="relative">
                          <Link className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <input
                            type="url"
                            placeholder="https://... (URL gambar langsung)"
                            value={form.gambar}
                            onChange={(e) => setForm({ ...form, gambar: e.target.value })}
                            disabled={saving}
                            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all disabled:opacity-50 text-xs"
                          />
                        </div>
                      </div>
                    )
                  )}
                </div>
                <div className="md:col-span-2 p-4 bg-slate-50/90 border border-slate-200 rounded-2xl space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-4 h-4 text-blue-600" />
                        <label className="text-sm font-bold text-slate-800">
                          Titik Koordinat GPS
                        </label>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Diperlukan untuk kalkulasi rute terdekat Djikstra dan peta navigasi wisatawan.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsMapPickerOpen(true)}
                      disabled={saving}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition-colors shadow-xs"
                      title="Buka peta interaktif untuk memilih titik wisata"
                    >
                      <MapPin className="w-3.5 h-3.5" />
                      <span>Buka Peta Lokasi</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-semibold text-slate-700">Latitude</span>
                        <span className="text-[10px] text-slate-400">Rentang: -90 s/d 90</span>
                      </div>
                      <input
                        type="number"
                        step="any"
                        placeholder="Contoh: 0.334125"
                        value={form.latitude}
                        onChange={(e) => setForm({ ...form, latitude: e.target.value })}
                        onPaste={handleLatitudePaste}
                        disabled={saving}
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm font-mono transition-all"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-semibold text-slate-700">Longitude</span>
                        <span className="text-[10px] text-slate-400">Rentang: -180 s/d 180</span>
                      </div>
                      <input
                        type="number"
                        step="any"
                        placeholder="Contoh: 101.023412"
                        value={form.longitude}
                        onChange={(e) => setForm({ ...form, longitude: e.target.value })}
                        disabled={saving}
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm font-mono transition-all"
                      />
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-200/60 text-xs text-slate-500 text-[11px]">
                    Gunakan tombol Buka Peta Lokasi di atas untuk menentukan titik langsung dari peta.
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Jam Buka</label>
                    <input
                      type="time"
                      value={form.jam_buka}
                      onChange={(e) => setForm({ ...form, jam_buka: e.target.value })}
                      disabled={saving}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all disabled:opacity-50 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Jam Tutup</label>
                    <input
                      type="time"
                      value={form.jam_tutup}
                      onChange={(e) => setForm({ ...form, jam_tutup: e.target.value })}
                      disabled={saving}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all disabled:opacity-50 text-sm"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:col-span-2">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-semibold text-slate-700">Tiket Masuk (Rp)</label>
                      {form.harga_tiket !== '' && (
                        <span className="text-xs font-bold text-blue-600">
                          {Number(form.harga_tiket) === 0 ? 'Gratis' : `Rp ${Number(form.harga_tiket).toLocaleString('id-ID')}`}
                        </span>
                      )}
                    </div>
                    <input
                      type="number" min="0" placeholder="0 jika gratis"
                      value={form.harga_tiket}
                      onChange={(e) => setForm({ ...form, harga_tiket: e.target.value })}
                      disabled={saving}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all disabled:opacity-50 text-sm font-medium"
                    />
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {[0, 5000, 10000, 15000, 20000, 35000].map(val => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setForm(prev => ({ ...prev, harga_tiket: val }))}
                          className={`px-2 py-0.5 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                            Number(form.harga_tiket) === val && form.harga_tiket !== ''
                              ? 'bg-blue-600 text-white shadow-2xs'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {val === 0 ? 'Gratis' : `${val / 1000}rb`}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-semibold text-slate-700">Parkir Motor (Rp)</label>
                      {form.biaya_parkir_motor !== '' && (
                        <span className="text-xs font-bold text-blue-600">
                          {Number(form.biaya_parkir_motor) === 0 ? 'Gratis' : `Rp ${Number(form.biaya_parkir_motor).toLocaleString('id-ID')}`}
                        </span>
                      )}
                    </div>
                    <input
                      type="number" min="0" placeholder="0 jika gratis"
                      value={form.biaya_parkir_motor}
                      onChange={(e) => setForm({ ...form, biaya_parkir_motor: e.target.value })}
                      disabled={saving}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all disabled:opacity-50 text-sm font-medium"
                    />
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {[0, 2000, 3000, 5000].map(val => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setForm(prev => ({ ...prev, biaya_parkir_motor: val }))}
                          className={`px-2 py-0.5 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                            Number(form.biaya_parkir_motor) === val && form.biaya_parkir_motor !== ''
                              ? 'bg-blue-600 text-white shadow-2xs'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {val === 0 ? 'Gratis' : `${val / 1000}rb`}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-semibold text-slate-700">Parkir Mobil (Rp)</label>
                      {form.biaya_parkir_mobil !== '' && (
                        <span className="text-xs font-bold text-blue-600">
                          {Number(form.biaya_parkir_mobil) === 0 ? 'Gratis' : `Rp ${Number(form.biaya_parkir_mobil).toLocaleString('id-ID')}`}
                        </span>
                      )}
                    </div>
                    <input
                      type="number" min="0" placeholder="0 jika gratis"
                      value={form.biaya_parkir_mobil}
                      onChange={(e) => setForm({ ...form, biaya_parkir_mobil: e.target.value })}
                      disabled={saving}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all disabled:opacity-50 text-sm font-medium"
                    />
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {[0, 5000, 10000, 15000].map(val => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setForm(prev => ({ ...prev, biaya_parkir_mobil: val }))}
                          className={`px-2 py-0.5 rounded-md text-[11px] font-semibold transition-all cursor-pointer ${
                            Number(form.biaya_parkir_mobil) === val && form.biaya_parkir_mobil !== ''
                              ? 'bg-blue-600 text-white shadow-2xs'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {val === 0 ? 'Gratis' : `${val / 1000}rb`}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Deskripsi Tempat Wisata</label>
                  <textarea
                    rows="3"
                    placeholder="Ceritakan keindahan, daya tarik, atau sejarah singkat tempat ini..."
                    value={form.deskripsi}
                    onChange={(e) => setForm({ ...form, deskripsi: e.target.value })}
                    disabled={saving}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all disabled:opacity-50 resize-none text-sm"
                  />
                </div>
              </div>

              <div className="flex flex-col-reverse sm:flex-row gap-2.5 sm:gap-3 pt-4 border-t border-slate-100">
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
                  disabled={saving || uploadingImage}
                  className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all shadow-md shadow-blue-500/20 disabled:opacity-70 text-sm"
                >
                  {uploadingImage ? 'Mengupload Gambar...' : (saving ? 'Menyimpan...' : (editData ? 'Simpan Perubahan' : 'Tambah Data Wisata'))}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Category Quick Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {['Semua', ...KATEGORI_OPTIONS].map(cat => {
          const count = cat === 'Semua' ? wisataList.length : wisataList.filter(w => w.kategori === cat).length;
          const isSelected = selectedCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                isSelected
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25'
                  : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200/80 hover:text-slate-900'
              }`}
            >
              <span>{cat}</span>
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 sm:p-5 border-b border-slate-200/80 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50/70">
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-bold font-[Sora] text-slate-900">Daftar Wisata</h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100/70 text-blue-700">
              {filteredWisata.length} dari {wisataList.length}
            </span>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Cari wisata, alamat, atau kategori..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-xs"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-12 text-center text-slate-500">Memuat data wisata...</div>
          ) : (
            <table className="w-full text-left border-collapse min-w-[760px]">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80">
                  <th className="py-3.5 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider w-16 text-center">No</th>
                  <th className="py-3.5 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Info Wisata</th>
                  <th className="py-3.5 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Kategori</th>
                  <th className="py-3.5 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">Lokasi</th>
                  <th className="py-3.5 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden lg:table-cell">Harga Tiket</th>
                  <th className="py-3.5 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden lg:table-cell">Biaya Parkir</th>
                  <th className="py-3.5 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredWisata.length > 0 ? filteredWisata.map((item, index) => (
                  <tr key={item.id_wisata} className="hover:bg-blue-50/20 transition-colors group">
                    <td className="py-4 px-4 text-center text-slate-400 text-sm font-medium">{index + 1}</td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3.5">
                        {item.gambar ? (
                          <img src={item.gambar} alt={item.nama_wisata} className="w-12 h-12 rounded-xl object-cover border border-slate-200 shrink-0 shadow-xs group-hover:scale-105 transition-transform duration-200" />
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center border border-slate-200 text-slate-400 shrink-0">
                            <ImageIcon className="w-5 h-5" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{item.nama_wisata}</p>
                          <p className="text-xs text-slate-500 truncate max-w-[200px] sm:max-w-xs">{item.alamat}</p>
                          <div className="flex flex-wrap items-center gap-1.5 mt-1 sm:hidden text-[10px] text-slate-500">
                            <span className="font-semibold text-slate-700">Tiket: {Number(item.harga_tiket || 0) === 0 ? 'Gratis' : `Rp ${Number(item.harga_tiket).toLocaleString('id-ID')}`}</span>
                            <span>•</span>
                            <span>Parkir: {Number(item.biaya_parkir_motor || 0) === 0 ? 'Gratis' : `Rp ${Number(item.biaya_parkir_motor).toLocaleString('id-ID')}`} / {Number(item.biaya_parkir_mobil || 0) === 0 ? 'Gratis' : `Rp ${Number(item.biaya_parkir_mobil).toLocaleString('id-ID')}`}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getKategoriBadge(item.kategori)}`}>
                        {item.kategori}
                      </span>
                    </td>
                    <td className="py-4 px-4 hidden md:table-cell">
                      <div className="text-xs text-slate-600 space-y-0.5 font-mono">
                        <p>Lat: <span className="font-semibold text-slate-900">{item.latitude ?? '-'}</span></p>
                        <p>Lng: <span className="font-semibold text-slate-900">{item.longitude ?? '-'}</span></p>
                      </div>
                    </td>
                    <td className="py-4 px-4 hidden lg:table-cell font-medium text-sm text-slate-800">
                      {Number(item.harga_tiket || 0) === 0 ? (
                        <span className="text-emerald-700 font-semibold text-xs px-2.5 py-1 bg-emerald-50 border border-emerald-200/80 rounded-lg">Gratis</span>
                      ) : (
                        `Rp ${Number(item.harga_tiket).toLocaleString('id-ID')}`
                      )}
                    </td>
                    <td className="py-4 px-4 hidden lg:table-cell">
                      <div className="text-xs space-y-0.5 text-slate-700">
                        <p><span className="text-slate-400 font-medium">Motor:</span> {Number(item.biaya_parkir_motor || 0) === 0 ? 'Gratis' : `Rp ${Number(item.biaya_parkir_motor).toLocaleString('id-ID')}`}</p>
                        <p><span className="text-slate-400 font-medium">Mobil:</span> {Number(item.biaya_parkir_mobil || 0) === 0 ? 'Gratis' : `Rp ${Number(item.biaya_parkir_mobil).toLocaleString('id-ID')}`}</p>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button 
                          onClick={() => setGaleriModal({ isOpen: true, wisataId: item.id_wisata, wisataName: item.nama_wisata })}
                          className="p-2 text-purple-600 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors duration-150"
                          title="Galeri Foto Wisata"
                        >
                          <ImageIcon className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleEdit(item)}
                          className="p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors duration-150"
                          title="Edit Wisata"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDeleteClick(item.id_wisata)}
                          className="p-2 text-red-500 bg-red-50 hover:bg-red-100 rounded-lg transition-colors duration-150"
                          title="Hapus Wisata"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-500">
                      {searchTerm || selectedCategory !== 'Semua' ? 'Tidak ada wisata yang cocok dengan filter / pencarian.' : 'Belum ada data wisata.'}
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
        title="Hapus data wisata?"
        description="Data wisata akan dihapus permanen. Data graf/fasilitas yang terhubung juga bisa ikut terpengaruh."
        confirmText="Hapus"
      />

      <GaleriModal
        isOpen={galeriModal.isOpen}
        wisataId={galeriModal.wisataId}
        wisataName={galeriModal.wisataName}
        onClose={() => setGaleriModal({ isOpen: false, wisataId: null, wisataName: '' })}
      />

      <MapPickerModal
        isOpen={isMapPickerOpen}
        onClose={() => setIsMapPickerOpen(false)}
        onSelect={handleSelectCoordinatesFromMap}
        initialLat={form.latitude}
        initialLng={form.longitude}
      />
    </div>
  )
}
