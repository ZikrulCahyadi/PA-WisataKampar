import { useState, useEffect, useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useToast } from '../context/ToastContext'
import { MapPin, CheckCircle2, Save, Layers, Sparkles, Search, CheckSquare, Square, X } from 'lucide-react'
import { dataCache } from '../utils/dataCache'

const KATEGORI_OPTIONS = ['Semua', 'Alam', 'Budaya', 'Sejarah']

export default function WisataFasilitas() {
  const location = useLocation()
  const { showToast } = useToast()
  const [wisataList, setWisataList] = useState(() => dataCache.get('wf_wisata') || [])
  const [fasilitasList, setFasilitasList] = useState(() => dataCache.get('wf_fasilitas') || [])
  const [relasi, setRelasi] = useState(() => dataCache.get('wf_relasi') || [])
  const [selectedWisata, setSelectedWisata] = useState(null)
  const [checkedFasilitas, setCheckedFasilitas] = useState([])
  const [loading, setLoading] = useState(() => !dataCache.has('wf_relasi'))
  const [saving, setSaving] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('Semua')
  const [statusFilter, setStatusFilter] = useState('Semua') // 'Semua' | 'Ada' | 'Kosong'

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    if (!dataCache.has('wf_relasi')) {
      setLoading(true)
    }
    const [w, f, r] = await Promise.all([
      supabase.from('wisata').select('id_wisata, nama_wisata, kategori').order('id_wisata'),
      supabase.from('fasilitas').select('*').order('id_fasilitas'),
      supabase.from('wisata_fasilitas').select('*'),
    ])
    const wList = w.data || []
    const fList = f.data || []
    const rList = r.data || []
    setWisataList(wList); dataCache.set('wf_wisata', wList)
    setFasilitasList(fList); dataCache.set('wf_fasilitas', fList)
    setRelasi(rList); dataCache.set('wf_relasi', rList)

    // Jika datang dari tombol 'Hubungkan Fasilitas' di Kelola Wisata
    if (location.state?.selectId) {
      const target = wList.find(item => item.id_wisata === location.state.selectId)
      if (target) {
        setSelectedWisata(target)
        const current = rList
          .filter(rel => rel.id_wisata === target.id_wisata)
          .map(rel => rel.id_fasilitas)
        setCheckedFasilitas(current)
      }
    }

    setLoading(false)
  }

  const handleSelectWisata = (wisata) => {
    setSelectedWisata(wisata)
    const current = relasi
      .filter(r => r.id_wisata === wisata.id_wisata)
      .map(r => r.id_fasilitas)
    setCheckedFasilitas(current)
  }

  const toggleFasilitas = (id) => {
    setCheckedFasilitas(prev =>
      prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
    )
  }

  const handleSelectAll = () => {
    setCheckedFasilitas(fasilitasList.map(f => f.id_fasilitas))
  }

  const handleDeselectAll = () => {
    setCheckedFasilitas([])
  }

  const handleSave = async () => {
    if (!selectedWisata) return
    setSaving(true)

    try {
      const { error: delError } = await supabase.from('wisata_fasilitas').delete().eq('id_wisata', selectedWisata.id_wisata)
      if (delError) throw delError

      if (checkedFasilitas.length > 0) {
        const inserts = checkedFasilitas.map(id_fasilitas => ({
          id_wisata: selectedWisata.id_wisata,
          id_fasilitas
        }))
        const { error: insError } = await supabase.from('wisata_fasilitas').insert(inserts)
        if (insError) throw insError
      }

      showToast(`Fasilitas untuk ${selectedWisata.nama_wisata} berhasil disimpan`, 'success')
      dataCache.invalidate('wf_relasi')
      dataCache.invalidate('fasilitas')
      await fetchData()
    } catch (err) {
      showToast('Gagal menyimpan fasilitas: ' + err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const getFasilitasNama = (id_wisata) => {
    const ids = relasi.filter(r => r.id_wisata === id_wisata).map(r => r.id_fasilitas)
    return fasilitasList.filter(f => ids.includes(f.id_fasilitas)).map(f => f.nama_fasilitas)
  }

  const counts = useMemo(() => {
    let ada = 0
    let kosong = 0
    wisataList.forEach(w => {
      const hasFas = relasi.some(r => r.id_wisata === w.id_wisata)
      if (hasFas) ada++
      else kosong++
    })
    return { total: wisataList.length, ada, kosong }
  }, [wisataList, relasi])

  const filteredWisataList = useMemo(() => {
    return wisataList.filter(w => {
      const matchSearch = !searchTerm || w.nama_wisata.toLowerCase().includes(searchTerm.toLowerCase())
      const matchCategory = selectedCategory === 'Semua' || w.kategori === selectedCategory
      const hasFas = relasi.some(r => r.id_wisata === w.id_wisata)
      const matchStatus = 
        statusFilter === 'Semua' ? true :
        statusFilter === 'Ada' ? hasFas :
        !hasFas

      return matchSearch && matchCategory && matchStatus
    })
  }, [wisataList, relasi, searchTerm, selectedCategory, statusFilter])

  return (
    <div className="flex flex-col gap-6">
      
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          Wisata - Fasilitas
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Hubungkan ketersediaan fasilitas pada setiap destinasi wisata Kabupaten Kampar.
        </p>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-500">Memuat data...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column: Wisata List */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm flex flex-col overflow-hidden h-[480px] lg:h-[calc(100vh-220px)] lg:min-h-[540px]">
            <div className="p-4 border-b border-slate-200/80 bg-slate-50/70 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold font-[Sora] text-slate-900">Pilih Objek Wisata</h2>
                  <p className="text-slate-500 text-xs mt-0.5">Klik wisata untuk mengatur fasilitasnya</p>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100/70 text-blue-800">
                  {filteredWisataList.length} dari {wisataList.length}
                </span>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari nama wisata..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-2xs"
                />
                {searchTerm && (
                  <button 
                    onClick={() => setSearchTerm('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-full"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Category Pills */}
              <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
                {KATEGORI_OPTIONS.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all shrink-0 ${
                      selectedCategory === cat
                        ? 'bg-blue-600 text-white shadow-2xs'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Status Filter Tabs */}
              <div className="flex items-center gap-1.5 p-1 bg-slate-200/60 rounded-xl text-xs font-semibold">
                <button
                  onClick={() => setStatusFilter('Semua')}
                  className={`flex-1 py-1 px-2 rounded-lg transition-all text-center ${
                    statusFilter === 'Semua'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Semua ({counts.total})
                </button>
                <button
                  onClick={() => setStatusFilter('Ada')}
                  className={`flex-1 py-1 px-2 rounded-lg transition-all text-center flex items-center justify-center gap-1.5 ${
                    statusFilter === 'Ada'
                      ? 'bg-white text-emerald-700 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
                  <span>Terpasang ({counts.ada})</span>
                </button>
                <button
                  onClick={() => setStatusFilter('Kosong')}
                  className={`flex-1 py-1 px-2 rounded-lg transition-all text-center flex items-center justify-center gap-1.5 ${
                    statusFilter === 'Kosong'
                      ? 'bg-white text-amber-700 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0"></span>
                  <span>Belum Terpasang ({counts.kosong})</span>
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {filteredWisataList.length > 0 ? (
                filteredWisataList.map((w) => {
                  const fasNama = getFasilitasNama(w.id_wisata)
                  const isSelected = selectedWisata?.id_wisata === w.id_wisata
                  
                  return (
                    <div 
                      key={w.id_wisata} 
                      onClick={() => handleSelectWisata(w)}
                      className={`p-3.5 rounded-xl cursor-pointer transition-all border ${
                        isSelected 
                          ? 'bg-blue-50/80 border-blue-400 shadow-md shadow-blue-500/10' 
                          : 'bg-white border-slate-200/70 hover:bg-slate-50 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                            <MapPin className="w-4 h-4" />
                          </div>
                          <h3 className={`font-bold text-sm truncate ${isSelected ? 'text-blue-700' : 'text-slate-800'}`}>
                            {w.nama_wisata}
                          </h3>
                        </div>
                        {fasNama.length > 0 ? (
                          <span className="shrink-0 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                            {fasNama.length} Fasilitas
                          </span>
                        ) : (
                          <span className="shrink-0 px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-400">
                            Kosong
                          </span>
                        )}
                      </div>
                      
                      <div className="flex flex-wrap gap-1.5 pl-10.5">
                        {fasNama.length > 0 ? fasNama.map(n => (
                          <span key={n} className="px-2 py-0.5 text-[11px] font-semibold bg-white text-slate-700 border border-slate-200 rounded-md shadow-2xs">
                            {n}
                          </span>
                        )) : (
                          <span className="text-xs text-slate-400 italic">Belum ada fasilitas terpasang</span>
                        )}
                      </div>
                    </div>
                  )
                })
              ) : (
                <div className="p-8 text-center text-slate-500 text-sm">
                  Tidak ada wisata yang cocok dengan filter.
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Fasilitas Selection */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm flex flex-col overflow-hidden h-[480px] lg:h-[calc(100vh-220px)] lg:min-h-[540px]">
            <div className="p-4 sm:p-5 border-b border-slate-200/80 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold font-[Sora] text-slate-900 truncate">
                  {selectedWisata ? `Fasilitas: ${selectedWisata.nama_wisata}` : 'Pilih Wisata Terlebih Dahulu'}
                </h2>
                <p className="text-slate-500 text-xs mt-0.5">
                  {selectedWisata ? `${checkedFasilitas.length} fasilitas dipilih` : 'Klik salah satu wisata di panel sebelah kiri'}
                </p>
              </div>

              {selectedWisata && fasilitasList.length > 0 && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    disabled={saving}
                    className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold rounded-lg transition-colors"
                  >
                    Pilih Semua
                  </button>
                  <button
                    type="button"
                    onClick={handleDeselectAll}
                    disabled={saving}
                    className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold rounded-lg transition-colors"
                  >
                    Batal Semua
                  </button>
                </div>
              )}
            </div>

            {selectedWisata ? (
              <>
                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                  {fasilitasList.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 text-sm">
                      Belum ada data fasilitas — tambahkan dulu di halaman Kelola Fasilitas.
                    </div>
                  ) : (
                    fasilitasList.map(f => {
                      const isChecked = checkedFasilitas.includes(f.id_fasilitas)
                      return (
                        <label 
                          key={f.id_fasilitas} 
                          className={`flex items-center gap-3 p-3.5 rounded-xl cursor-pointer border transition-all ${
                            isChecked 
                              ? 'bg-blue-50/70 border-blue-400 shadow-xs' 
                              : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          <div className={`flex items-center justify-center w-5 h-5 rounded-md border transition-colors ${
                            isChecked ? 'bg-blue-600 border-blue-600' : 'bg-white border-slate-300'
                          }`}>
                            {isChecked && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                          </div>
                          
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleFasilitas(f.id_fasilitas)}
                            disabled={saving}
                            className="hidden"
                          />
                          
                          <span className={`text-sm font-semibold ${isChecked ? 'text-blue-900' : 'text-slate-700'}`}>
                            {f.nama_fasilitas}
                          </span>
                        </label>
                      )
                    })
                  )}
                </div>
                
                <div className="p-4 border-t border-slate-200/80 bg-slate-50/70">
                  <button 
                    onClick={handleSave} 
                    disabled={saving} 
                    className="flex items-center justify-center gap-2 w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold rounded-xl transition-all disabled:opacity-70 shadow-md shadow-blue-500/20 text-sm"
                  >
                    <Save className="w-4 h-4" />
                    <span>{saving ? 'Menyimpan...' : 'Simpan Fasilitas Wisata'}</span>
                  </button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
                <MapPin className="w-12 h-12 mb-3 text-slate-300" />
                <p className="text-sm font-medium text-slate-500">Pilih objek wisata di sebelah kiri<br/>untuk mengatur ketersediaan fasilitas</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
