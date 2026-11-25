import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../supabaseClient'
import { useToast } from '../context/ToastContext'
import { Search, Plus, Edit2, Trash2, MapPin, Flag, Route, ArrowRight, ArrowLeftRight, X, ChevronLeft, ChevronRight, Zap, CheckCircle2, AlertTriangle, Map as MapIcon, Anchor } from 'lucide-react'
import ConfirmModal from '../components/ConfirmModal'
import GrafMapView from '../components/GrafMapView'
import AutoConnectGrafModal from '../components/AutoConnectGrafModal'
import { dataCache } from '../utils/dataCache'

const emptyForm = { titik_awal: '', titik_tujuan: '', jarak: '' }

export default function Graf() {
  const { showToast } = useToast()
  const [grafList, setGrafList] = useState(() => dataCache.get('graf') || [])
  const [wisataList, setWisataList] = useState(() => dataCache.get('wisata_simple') || [])
  const [loading, setLoading] = useState(() => !dataCache.has('graf'))
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, item: null, hasReverse: false })
  const [saving, setSaving] = useState(false)
  const [calculatingDistance, setCalculatingDistance] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editData, setEditData] = useState(null)
  const [isTwoWay, setIsTwoWay] = useState(true)
  const [form, setForm] = useState(emptyForm)
  const [formError, setFormError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [filterWisataId, setFilterWisataId] = useState('')
  const [showMap, setShowMap] = useState(false)
  const [autoConnectModal, setAutoConnectModal] = useState({ isOpen: false, wisataId: '' })
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 15

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    if (!dataCache.has('graf')) {
      setLoading(true)
    }
    const [grafRes, wisataRes] = await Promise.all([
      supabase.from('graf').select('*').order('id_graf'),
      supabase.from('wisata').select('id_wisata, nama_wisata, latitude, longitude').order('id_wisata')
    ])
    if (grafRes.data) {
      setGrafList(grafRes.data)
      dataCache.set('graf', grafRes.data)
    }
    if (wisataRes.data) {
      setWisataList(wisataRes.data)
      dataCache.set('wisata_simple', wisataRes.data)
    }
    setLoading(false)
  }

  const handleAutoCalculateDistance = async () => {
    if (!form.titik_awal || !form.titik_tujuan) {
      showToast('Pilih titik awal dan titik tujuan terlebih dahulu', 'error')
      return
    }
    if (form.titik_awal === form.titik_tujuan) {
      showToast('Titik awal dan titik tujuan tidak boleh sama', 'error')
      return
    }

    const wAwal = wisataList.find(w => w.id_wisata === Number(form.titik_awal))
    const wTujuan = wisataList.find(w => w.id_wisata === Number(form.titik_tujuan))

    if (!wAwal?.latitude || !wAwal?.longitude || !wTujuan?.latitude || !wTujuan?.longitude) {
      showToast('Koordinat GPS salah satu wisata belum lengkap di database', 'error')
      return
    }

    setCalculatingDistance(true)

    const getHaversine = () => {
      const R = 6371
      const dLat = (wTujuan.latitude - wAwal.latitude) * Math.PI / 180
      const dLng = (wTujuan.longitude - wAwal.longitude) * Math.PI / 180
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(wAwal.latitude * Math.PI / 180) * Math.cos(wTujuan.latitude * Math.PI / 180) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2)
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
      return Number((R * c * 1.25).toFixed(1))
    }

    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${wAwal.longitude},${wAwal.latitude};${wTujuan.longitude},${wTujuan.latitude}?overview=false`
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 4000)

      const res = await fetch(url, { signal: controller.signal })
      clearTimeout(timeoutId)
      const json = await res.json()

      if (json.code === 'Ok' && json.routes && json.routes[0]) {
        const km = Number((json.routes[0].distance / 1000).toFixed(1))
        setForm(prev => ({ ...prev, jarak: km }))
        showToast(`Jarak rute berhasil dihitung: ${km} km`, 'success')
        setCalculatingDistance(false)
        return
      }
    } catch (err) {
      console.warn('OSRM error, using haversine fallback:', err)
    }

    const fallbackKm = getHaversine()
    setForm(prev => ({ ...prev, jarak: fallbackKm }))
    showToast(`Jarak estimasi berhasil dihitung: ${fallbackKm} km`, 'success')
    setCalculatingDistance(false)
  }

  const getNamaWisata = (id) => wisataList.find(w => w.id_wisata === id)?.nama_wisata || '-'

  const handleDirectBoatDistance = () => {
    if (!form.titik_awal || !form.titik_tujuan || form.titik_awal === form.titik_tujuan) {
      showToast('Pilih titik awal dan tujuan yang berbeda terlebih dahulu', 'error')
      return
    }
    const wAwal = wisataList.find(w => w.id_wisata === Number(form.titik_awal))
    const wTujuan = wisataList.find(w => w.id_wisata === Number(form.titik_tujuan))
    if (!wAwal?.latitude || !wAwal?.longitude || !wTujuan?.latitude || !wTujuan?.longitude) {
      showToast('Koordinat GPS salah satu wisata belum lengkap', 'error')
      return
    }
    const R = 6371
    const dLat = (wTujuan.latitude - wAwal.latitude) * Math.PI / 180
    const dLng = (wTujuan.longitude - wAwal.longitude) * Math.PI / 180
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(wAwal.latitude * Math.PI / 180) * Math.cos(wTujuan.latitude * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    const km = Number(Math.max(0.1, R * c).toFixed(1))
    setForm(prev => ({ ...prev, jarak: km }))
    showToast(`Jarak langsung (perairan/boat) dihitung: ${km} km`, 'success')
  }

  const hasReverseRoute = (titikAwal, titikTujuan) => {
    return grafList.some(g => g.titik_awal === titikTujuan && g.titik_tujuan === titikAwal)
  }

  const connectivityStatus = useMemo(() => {
    if (wisataList.length === 0) {
      return { total: 0, connected: 0, isFullyConnected: true, unconnectedList: [], islandCount: 0, isolatedIds: new Set(), islandNodes: [] }
    }

    const adj = new Map()
    wisataList.forEach(w => adj.set(Number(w.id_wisata), new Set()))

    const connectedIds = new Set()
    grafList.forEach(g => {
      const a = Number(g.titik_awal)
      const b = Number(g.titik_tujuan)
      connectedIds.add(a)
      connectedIds.add(b)
      if (adj.has(a)) adj.get(a).add(b)
      if (adj.has(b)) adj.get(b).add(a)
    })

    const unconnectedList = wisataList.filter(w => !connectedIds.has(Number(w.id_wisata)))
    const connected = wisataList.length - unconnectedList.length

    // BFS untuk mendeteksi pulau graf yang terpisah (disconnected components)
    const visited = new Set()
    const components = []
    wisataList.forEach(w => {
      const id = Number(w.id_wisata)
      if (!connectedIds.has(id) || visited.has(id)) return
      const comp = []
      const queue = [id]
      visited.add(id)
      while (queue.length > 0) {
        const curr = queue.shift()
        comp.push(curr)
        const neighbors = adj.get(curr)
        if (neighbors) {
          neighbors.forEach(next => {
            if (!visited.has(next)) {
              visited.add(next)
              queue.push(next)
            }
          })
        }
      }
      components.push(comp)
    })

    // Urutkan komponen dari yang terbesar (jaringan utama)
    components.sort((a, b) => b.length - a.length)
    const isolatedIds = new Set(unconnectedList.map(w => Number(w.id_wisata)))
    const islandNodes = []
    if (components.length > 1) {
      components.slice(1).forEach(comp => {
        comp.forEach(id => {
          isolatedIds.add(id)
          const wObj = wisataList.find(w => Number(w.id_wisata) === id)
          if (wObj) islandNodes.push(wObj)
        })
      })
    }

    return {
      total: wisataList.length,
      connected,
      isFullyConnected: unconnectedList.length === 0 && components.length <= 1,
      unconnectedList,
      islandCount: components.length,
      islandNodes,
      isolatedIds
    }
  }, [wisataList, grafList])

  // Urutkan pilihan Titik Tujuan dari yang terdekat jika Titik Awal sudah dipilih
  const smartDestinationOptions = useMemo(() => {
    const startId = Number(form.titik_awal)
    const startWisata = wisataList.find(w => Number(w.id_wisata) === startId)
    const connectedFromStart = new Set(
      grafList.filter(g => Number(g.titik_awal) === startId).map(g => Number(g.titik_tujuan))
    )

    return wisataList
      .map(w => {
        const wId = Number(w.id_wisata)
        let straightKm = null
        if (startWisata && wId !== startId && startWisata.latitude != null && startWisata.longitude != null && w.latitude != null && w.longitude != null) {
          const R = 6371
          const dLat = (w.latitude - startWisata.latitude) * Math.PI / 180
          const dLng = (w.longitude - startWisata.longitude) * Math.PI / 180
          const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(startWisata.latitude * Math.PI / 180) * Math.cos(w.latitude * Math.PI / 180) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2)
          straightKm = Number((R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(1))
        }
        const alreadyExists = !editData && startId > 0 && connectedFromStart.has(wId)
        return {
          ...w,
          straightKm,
          isSame: startId > 0 && wId === startId,
          alreadyExists
        }
      })
      .sort((a, b) => {
        if (a.straightKm == null && b.straightKm == null) return 0
        if (a.straightKm == null) return 1
        if (b.straightKm == null) return -1
        return a.straightKm - b.straightKm
      })
  }, [wisataList, grafList, form.titik_awal, editData])

  const filteredGraf = useMemo(() => {
    return grafList.filter(g => {
      const matchDropdown = !filterWisataId ||
        Number(g.titik_awal) === Number(filterWisataId) ||
        Number(g.titik_tujuan) === Number(filterWisataId)
      const matchSearch = !searchTerm ||
        getNamaWisata(g.titik_awal).toLowerCase().includes(searchTerm.toLowerCase()) ||
        getNamaWisata(g.titik_tujuan).toLowerCase().includes(searchTerm.toLowerCase())
      return matchDropdown && matchSearch
    })
  }, [grafList, wisataList, searchTerm, filterWisataId])

  const totalPages = Math.ceil(filteredGraf.length / itemsPerPage) || 1

  const paginatedGraf = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return filteredGraf.slice(start, start + itemsPerPage)
  }, [filteredGraf, currentPage, itemsPerPage])

  const validateForm = () => {
    if (!form.titik_awal) return 'Titik awal wajib dipilih'
    if (!form.titik_tujuan) return 'Titik tujuan wajib dipilih'
    if (form.titik_awal === form.titik_tujuan) return 'Titik awal dan titik tujuan tidak boleh sama'
    if (form.jarak === '' || Number(form.jarak) <= 0) return 'Jarak harus lebih dari 0'

    const a = Number(form.titik_awal)
    const b = Number(form.titik_tujuan)

    // Cek duplikasi arah yang sama persis
    const duplikatSama = grafList.some(g => {
      if (editData && g.id_graf === editData.id_graf) return false
      return g.titik_awal === a && g.titik_tujuan === b
    })
    if (duplikatSama) return 'Jalur dengan titik awal dan tujuan yang sama persis sudah ada di sistem'

    return ''
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const err = validateForm()
    if (err) { setFormError(err); return }
    setFormError('')
    setSaving(true)

    const a = Number(form.titik_awal)
    const b = Number(form.titik_tujuan)
    const d = Number(form.jarak)

    try {
      if (editData) {
        // Update rute utama
        const { error } = await supabase.from('graf').update({
          titik_awal: a,
          titik_tujuan: b,
          jarak: d,
        }).eq('id_graf', editData.id_graf)
        if (error) throw error

        // Jika opsi 2 arah aktif dan ada rute sebaliknya, sinkronkan jaraknya juga
        if (isTwoWay) {
          const reverseItem = grafList.find(g => 
            g.id_graf !== editData.id_graf && 
            g.titik_awal === editData.titik_tujuan && 
            g.titik_tujuan === editData.titik_awal
          )
          if (reverseItem) {
            await supabase.from('graf').update({
              titik_awal: b,
              titik_tujuan: a,
              jarak: d,
            }).eq('id_graf', reverseItem.id_graf)
          }
        }

        showToast('Jalur graf berhasil diperbarui', 'success')
      } else {
        // Mode Tambah Baru
        const inserts = [{ titik_awal: a, titik_tujuan: b, jarak: d }]

        // Jika opsi 2 arah dicentang dan rute sebaliknya belum ada di database
        if (isTwoWay) {
          const reverseExists = grafList.some(g => g.titik_awal === b && g.titik_tujuan === a)
          if (!reverseExists) {
            inserts.push({ titik_awal: b, titik_tujuan: a, jarak: d })
          }
        }

        const { error } = await supabase.from('graf').insert(inserts)
        if (error) throw error

        const msg = inserts.length > 1 
          ? '2 Jalur bolak-balik (A ⇄ B) berhasil ditambahkan' 
          : 'Jalur graf berhasil ditambahkan'
        showToast(msg, 'success')
      }

      resetForm()
      dataCache.invalidate('graf')
      dataCache.invalidate('dashboard_data')
      await fetchData()
    } catch (err) {
      setFormError('Gagal menyimpan data: ' + err.message)
      showToast('Gagal menyimpan jalur: ' + err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (item) => {
    setEditData(item)
    setForm({
      titik_awal: String(item.titik_awal),
      titik_tujuan: String(item.titik_tujuan),
      jarak: String(item.jarak),
    })
    // Cek apakah ada rute balik
    const hasReverse = grafList.some(g => g.titik_awal === item.titik_tujuan && g.titik_tujuan === item.titik_awal)
    setIsTwoWay(hasReverse)
    setFormError('')
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDeleteClick = (item) => {
    const reverseItem = grafList.find(g => g.titik_awal === item.titik_tujuan && g.titik_tujuan === item.titik_awal)
    setDeleteConfirm({ 
      isOpen: true, 
      item, 
      hasReverse: Boolean(reverseItem),
      reverseId: reverseItem?.id_graf 
    })
  }

  const confirmDelete = async () => {
    const { item, reverseId } = deleteConfirm
    if (!item) return

    try {
      const idsToDelete = [item.id_graf]
      if (reverseId) {
        idsToDelete.push(reverseId)
      }

      const { error } = await supabase.from('graf').delete().in('id_graf', idsToDelete)
      if (error) throw error

      showToast(
        idsToDelete.length > 1 
          ? 'Jalur graf dan arah sebaliknya berhasil dihapus' 
          : 'Jalur graf berhasil dihapus', 
        'success'
      )
      dataCache.invalidate('graf')
      dataCache.invalidate('dashboard_data')
      fetchData()
    } catch (err) {
      showToast('Gagal menghapus jalur: ' + err.message, 'error')
    } finally {
      setDeleteConfirm({ isOpen: false, item: null, hasReverse: false })
    }
  }

  const resetForm = () => {
    setShowForm(false)
    setEditData(null)
    setForm(emptyForm)
    setIsTwoWay(true)
    setFormError('')
  }

  return (
    <div className="flex flex-col gap-6">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Kelola Jalur Graf
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Konfigurasi simpul rute dan jarak tempuh (km) antar destinasi wisata untuk Algoritma Dijkstra.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setShowMap(!showMap)}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-colors border shadow-2xs ${
              showMap
                ? 'bg-indigo-50 text-indigo-700 border-indigo-300'
                : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
            }`}
          >
            <MapIcon className="w-4 h-4" />
            <span>{showMap ? 'Tutup Peta' : 'Lihat Peta Graf'}</span>
          </button>

          <button
            type="button"
            onClick={() => setAutoConnectModal({ isOpen: true, wisataId: '' })}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2.5 rounded-xl font-medium text-sm transition-colors shadow-xs"
          >
            <Zap className="w-4 h-4" />
            <span>Hubungkan Otomatis</span>
          </button>

          {!showForm && (
            <button 
              onClick={() => { setShowForm(true); setEditData(null); setForm(emptyForm); setFormError('') }}
              className="w-full sm:w-auto flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-medium text-sm transition-colors shadow-xs shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Jalur Graf</span>
            </button>
          )}
        </div>
      </div>

      {/* Network Connectivity Status Bar */}
      <div className={`p-4 rounded-2xl border transition-all ${
        connectivityStatus.isFullyConnected 
          ? 'bg-emerald-50/70 border-emerald-200/80 text-emerald-900' 
          : 'bg-amber-50/90 border-amber-200 text-amber-900'
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-2xs ${
              connectivityStatus.isFullyConnected 
                ? 'bg-emerald-600 text-white' 
                : 'bg-amber-500 text-white'
            }`}>
              {connectivityStatus.isFullyConnected ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
            </div>
            <div>
              <p className="text-xs font-bold sm:text-sm">
                {connectivityStatus.isFullyConnected 
                  ? `Jaringan Graf Terhubung Penuh (${connectivityStatus.total} dari ${connectivityStatus.total} Wisata)`
                  : connectivityStatus.unconnectedList.length > 0
                    ? `Peringatan: ${connectivityStatus.unconnectedList.length} Destinasi Wisata Belum Memiliki Jalur Graf`
                    : `Peringatan: Jaringan Graf Terpecah Menjadi ${connectivityStatus.islandCount} Kelompok Terpisah`
                }
              </p>
              <p className="text-[11px] text-slate-600 mt-0.5">
                {connectivityStatus.isFullyConnected
                  ? 'Seluruh destinasi wisata saling terhubung dan siap dihitung rute tercepatnya oleh Algoritma Dijkstra.'
                  : connectivityStatus.unconnectedList.length > 0
                    ? 'Destinasi tanpa jalur tidak dapat dicari rutenya oleh wisatawan.'
                    : 'Kelompok wisata yang terisolasi dari jaringan utama tidak bisa dijangkau Dijkstra dari destinasi lain.'
                }
              </p>
            </div>
          </div>

          {!connectivityStatus.isFullyConnected && (
            <div className="flex flex-wrap items-center gap-1.5 pt-1 md:pt-0">
              <span className="text-[11px] font-semibold text-amber-800">Hubungkan otomatis:</span>
              {(connectivityStatus.unconnectedList.length > 0 ? connectivityStatus.unconnectedList : connectivityStatus.islandNodes).slice(0, 6).map(w => (
                <button
                  key={w.id_wisata}
                  type="button"
                  onClick={() => setAutoConnectModal({ isOpen: true, wisataId: w.id_wisata })}
                  className="px-2.5 py-1 bg-white hover:bg-amber-100 border border-amber-300 rounded-lg text-xs font-bold text-amber-900 transition-colors shadow-2xs cursor-pointer"
                  title={`Klik untuk hubungkan otomatis ${w.nama_wisata} ke wisata terdekat`}
                >
                  + {w.nama_wisata}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Peta Visualisasi Jaringan Graf */}
      {showMap && (
        <GrafMapView
          wisataList={wisataList}
          grafList={grafList}
          isolatedIds={connectivityStatus.isolatedIds}
          onSelectWisata={(id) => {
            setFilterWisataId(id)
            setCurrentPage(1)
          }}
        />
      )}

      {/* Form Section */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-md overflow-hidden transition-all animate-in fade-in duration-200">
          <div className="p-6 sm:p-7">
            <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-bold font-[Sora] text-slate-800">
                  {editData ? 'Edit Jalur Graf' : 'Tambah Jalur Graf Baru'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Tentukan titik asal, tujuan, dan jarak dalam km.</p>
              </div>
              <button onClick={resetForm} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {formError && (
              <div className="mb-5 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm font-medium">
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Titik Awal (Asal) *</label>
                  <select
                    value={form.titik_awal}
                    onChange={(e) => setForm({ ...form, titik_awal: e.target.value })}
                    disabled={saving}
                    required
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all disabled:opacity-50 text-sm"
                  >
                    <option value="">Pilih wisata awal</option>
                    {wisataList.map(w => (
                      <option key={w.id_wisata} value={w.id_wisata}>{w.nama_wisata}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Titik Tujuan *</label>
                  <select
                    value={form.titik_tujuan}
                    onChange={(e) => setForm({ ...form, titik_tujuan: e.target.value })}
                    disabled={saving}
                    required
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all disabled:opacity-50 text-sm"
                  >
                    <option value="">Pilih wisata tujuan</option>
                    {smartDestinationOptions.map(w => (
                      <option
                        key={w.id_wisata}
                        value={w.id_wisata}
                        disabled={w.isSame || w.alreadyExists}
                      >
                        {w.nama_wisata}
                        {w.straightKm != null ? ` (± ${w.straightKm} km)` : ''}
                        {w.isSame ? ' (Titik awal)' : w.alreadyExists ? ' (Sudah ada jalur)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <label className="block text-sm font-semibold text-slate-700">Jarak Tempuh (km) *</label>
                    {form.titik_awal && form.titik_tujuan && form.titik_awal !== form.titik_tujuan && (
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={handleDirectBoatDistance}
                          disabled={calculatingDistance || saving}
                          className="inline-flex items-center gap-1.5 px-3 py-1 bg-cyan-50 hover:bg-cyan-100 text-cyan-800 border border-cyan-200/80 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 shadow-2xs"
                          title="Hitung jarak garis lurus/perairan untuk wisata akses perahu (boat)"
                        >
                          <Anchor className="w-3.5 h-3.5" />
                          <span>Jarak Perairan (Boat)</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleAutoCalculateDistance}
                          disabled={calculatingDistance || saving}
                          className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200/80 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 shadow-2xs"
                          title="Hitung jarak rute jalan raya otomatis berdasarkan koordinat GPS"
                        >
                          <Zap className={`w-3.5 h-3.5 ${calculatingDistance ? 'animate-spin' : ''}`} />
                          <span>{calculatingDistance ? 'Menghitung Jarak...' : 'Hitung Jalan Raya (OSRM)'}</span>
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      step="any"
                      min="0.1"
                      placeholder="Contoh: 12.5"
                      value={form.jarak}
                      onChange={(e) => setForm({ ...form, jarak: e.target.value })}
                      disabled={saving}
                      required
                      className="w-full pl-4 pr-14 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all disabled:opacity-50 text-sm font-medium"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 pointer-events-none">
                      km
                    </span>
                  </div>
                </div>

                <div className="md:col-span-2 bg-blue-50/60 p-4 rounded-xl border border-blue-200/70">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isTwoWay}
                      onChange={(e) => setIsTwoWay(e.target.checked)}
                      disabled={saving}
                      className="mt-0.5 w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                    />
                    <div>
                      <span className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                        <ArrowLeftRight className="w-4 h-4 text-blue-600" />
                        Jalur 2 Arah (Bolak-balik A ⇄ B)
                      </span>
                      <p className="text-xs text-slate-600 mt-0.5">
                        {editData
                          ? 'Jika aktif, jarak rute sebaliknya (jika ada) juga akan otomatis disinkronkan.'
                          : 'Sistem akan otomatis membuat rute pergi dan rute sebaliknya dengan jarak yang sama untuk kebutuhan graf Dijkstra.'}
                      </p>
                    </div>
                  </label>
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
                  disabled={saving}
                  className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all shadow-md shadow-blue-500/20 disabled:opacity-70 text-sm"
                >
                  {saving ? 'Menyimpan...' : (editData ? 'Simpan Perubahan' : 'Tambah Jalur')}
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
            <h2 className="text-base sm:text-lg font-bold font-[Sora] text-slate-900">Daftar Jalur Graf</h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100/70 text-indigo-800">
              {filteredGraf.length} Rute
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full lg:w-auto">
            <select
              value={filterWisataId}
              onChange={(e) => {
                setFilterWisataId(e.target.value)
                setCurrentPage(1)
              }}
              className="w-full sm:w-56 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-xs"
            >
              <option value="">Semua Objek Wisata</option>
              {wisataList.map(w => (
                <option key={w.id_wisata} value={w.id_wisata}>{w.nama_wisata}</option>
              ))}
            </select>

            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Cari wisata titik awal/tujuan..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value)
                  setCurrentPage(1)
                }}
                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-xs"
              />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-500">Memuat data graf...</div>
        ) : (
          <>
            {/* Mobile Card View (< md) */}
            <div className="md:hidden divide-y divide-slate-100">
              {paginatedGraf.length > 0 ? paginatedGraf.map((item) => {
                const isBidirectional = hasReverseRoute(item.titik_awal, item.titik_tujuan)
                return (
                  <div key={item.id_graf} className="p-4 space-y-2.5 hover:bg-blue-50/20 transition-colors">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-1.5 bg-blue-50/80 text-blue-800 px-2.5 py-1.5 rounded-lg border border-blue-200/60 text-xs font-semibold">
                        <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span className="truncate">{getNamaWisata(item.titik_awal)}</span>
                      </div>
                      <div className="flex items-center gap-1.5 bg-emerald-50/80 text-emerald-800 px-2.5 py-1.5 rounded-lg border border-emerald-200/60 text-xs font-semibold">
                        <Flag className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span className="truncate">{getNamaWisata(item.titik_tujuan)}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-slate-900 font-[Sora] text-sm">{item.jarak} km</span>
                        {isBidirectional ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/70">
                            <ArrowLeftRight className="w-3 h-3 text-indigo-600" />
                            2 Arah
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200/70">
                            1 Arah
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleEdit(item)}
                          className="p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                          title="Edit Jalur"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(item)}
                          className="p-2 text-red-500 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                          title="Hapus Jalur"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              }) : (
                <div className="p-10 text-center text-sm text-slate-500">
                  {searchTerm || filterWisataId ? 'Tidak ada graf yang cocok dengan filter / pencarian.' : 'Belum ada data graf.'}
                </div>
              )}
            </div>

            {/* Desktop Table View (>= md) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200/80">
                    <th className="py-3.5 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider w-16 text-center">No</th>
                    <th className="py-3.5 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Koneksi Rute (Awal ➔ Tujuan)</th>
                    <th className="py-3.5 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Jarak Tempuh</th>
                    <th className="py-3.5 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedGraf.length > 0 ? paginatedGraf.map((item, index) => {
                    const isBidirectional = hasReverseRoute(item.titik_awal, item.titik_tujuan)
                    const itemNumber = (currentPage - 1) * itemsPerPage + index + 1
                    return (
                      <tr key={item.id_graf} className="hover:bg-blue-50/20 transition-colors group">
                        <td className="py-4 px-4 text-center text-slate-400 text-sm font-medium">{itemNumber}</td>
                        <td className="py-4 px-4">
                          <div className="flex flex-wrap items-center gap-2 text-slate-800 font-semibold text-sm">
                            <div className="flex items-center gap-1.5 bg-blue-50/80 text-blue-800 px-2.5 py-1 rounded-lg border border-blue-200/60">
                              <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                              <span>{getNamaWisata(item.titik_awal)}</span>
                            </div>
                            <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />
                            <div className="flex items-center gap-1.5 bg-emerald-50/80 text-emerald-800 px-2.5 py-1 rounded-lg border border-emerald-200/60">
                              <Flag className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span>{getNamaWisata(item.titik_tujuan)}</span>
                            </div>

                            {isBidirectional ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/70 ml-1" title="Tersedia rute bolak-balik (2 Arah)">
                                <ArrowLeftRight className="w-3 h-3 text-indigo-600" />
                                2 Arah
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200/70 ml-1" title="Hanya rute 1 arah">
                                1 Arah
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <span className="font-extrabold text-slate-900 font-[Sora]">{item.jarak}</span> <span className="text-slate-500 text-xs font-medium">km</span>
                        </td>
                        <td className="py-4 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button 
                              onClick={() => handleEdit(item)}
                              className="p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors duration-150"
                              title="Edit Jalur"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => handleDeleteClick(item)}
                              className="p-2 text-red-500 bg-red-50 hover:bg-red-100 rounded-lg transition-colors duration-150"
                              title="Hapus Jalur"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  }) : (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-slate-500">
                        {searchTerm || filterWisataId ? 'Tidak ada graf yang cocok dengan pencarian.' : 'Belum ada data graf.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Pagination Footer */}
        {!loading && filteredGraf.length > 0 && (
          <div className="p-4 border-t border-slate-200/80 bg-slate-50/70 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-slate-600">
            <div>
              Menampilkan <span className="font-semibold text-slate-900">{(currentPage - 1) * itemsPerPage + 1}</span> - <span className="font-semibold text-slate-900">{Math.min(currentPage * itemsPerPage, filteredGraf.length)}</span> dari <span className="font-semibold text-slate-900">{filteredGraf.length}</span> rute graf
            </div>

            {totalPages > 1 && (
              <div className="flex flex-wrap items-center justify-center gap-1.5">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-medium transition-colors flex items-center gap-1"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span className="hidden xs:inline">Sebelumnya</span>
                </button>

                <div className="flex flex-wrap items-center justify-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`w-7 h-7 rounded-lg text-xs font-semibold transition-colors ${
                        currentPage === page
                          ? 'bg-blue-600 text-white shadow-2xs'
                          : 'bg-white border border-slate-200 hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-medium transition-colors flex items-center gap-1"
                >
                  <span className="hidden xs:inline">Selanjutnya</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <AutoConnectGrafModal
        isOpen={autoConnectModal.isOpen}
        onClose={() => setAutoConnectModal({ isOpen: false, wisataId: '' })}
        wisataList={wisataList}
        grafList={grafList}
        initialWisataId={autoConnectModal.wisataId}
        onSuccess={fetchData}
      />

      <ConfirmModal
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, item: null, hasReverse: false })}
        onConfirm={confirmDelete}
        title={deleteConfirm.hasReverse ? "Hapus Jalur 2 Arah (Bolak-balik)?" : "Hapus Jalur Graf?"}
        description={
          deleteConfirm.item
            ? deleteConfirm.hasReverse
              ? `Jalur "${getNamaWisata(deleteConfirm.item.titik_awal)}" ⇄ "${getNamaWisata(deleteConfirm.item.titik_tujuan)}" beserta rute sebaliknya akan dihapus dari graf Dijkstra.`
              : `Jalur "${getNamaWisata(deleteConfirm.item.titik_awal)}" ➔ "${getNamaWisata(deleteConfirm.item.titik_tujuan)}" akan dihapus.`
            : 'Yakin ingin menghapus jalur graf ini?'
        }
        confirmText="Hapus"
      />
    </div>
  )
}
