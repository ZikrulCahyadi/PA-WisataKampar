import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../supabaseClient'
import { useToast } from '../context/ToastContext'
import { dataCache } from '../utils/dataCache'
import { X, Zap, ArrowLeftRight, Anchor, Car, Check, Loader2 } from 'lucide-react'

function calcHaversineKm(lat1, lng1, lat2, lng2, multiplier = 1) {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return Number(Math.max(0.1, R * c * multiplier).toFixed(1))
}

/**
 * Modal untuk menghubungkan satu destinasi wisata ke beberapa tetangga terdekat secara otomatis.
 */
export default function AutoConnectGrafModal({ isOpen, onClose, wisataList, grafList, initialWisataId = '', onSuccess }) {
  const { showToast } = useToast()
  const [sourceId, setSourceId] = useState('')
  const [neighborCount, setNeighborCount] = useState(3)
  const [distanceMode, setDistanceMode] = useState('osrm') // 'osrm' | 'direct'
  const [isTwoWay, setIsTwoWay] = useState(true)
  const [candidates, setCandidates] = useState([])
  const [calculating, setCalculating] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setSourceId(initialWisataId ? String(initialWisataId) : '')
      setCandidates([])
    }
  }, [isOpen, initialWisataId])

  const sourceWisata = useMemo(
    () => wisataList.find(w => w.id_wisata === Number(sourceId)),
    [wisataList, sourceId]
  )

  // Hitung daftar kandidat tetangga terdekat setiap kali sourceId / neighborCount / distanceMode berubah
  useEffect(() => {
    if (!isOpen || !sourceWisata) {
      setCandidates([])
      return
    }

    if (sourceWisata.latitude == null || sourceWisata.longitude == null) {
      setCandidates([])
      return
    }

    let cancelled = false

    const buildCandidates = async () => {
      setCalculating(true)
      const sId = Number(sourceWisata.id_wisata)
      const sLat = Number(sourceWisata.latitude)
      const sLng = Number(sourceWisata.longitude)

      const existingTargets = new Set(
        grafList
          .filter(g => Number(g.titik_awal) === sId)
          .map(g => Number(g.titik_tujuan))
      )

      const available = wisataList
        .filter(w =>
          Number(w.id_wisata) !== sId &&
          !existingTargets.has(Number(w.id_wisata)) &&
          w.latitude != null &&
          w.longitude != null
        )
        .map(w => ({
          wisata: w,
          straightKm: calcHaversineKm(sLat, sLng, Number(w.latitude), Number(w.longitude), 1)
        }))
        .sort((a, b) => a.straightKm - b.straightKm)
        .slice(0, neighborCount)

      const initialRows = available.map(item => ({
        targetId: Number(item.wisata.id_wisata),
        targetName: item.wisata.nama_wisata,
        jarak: distanceMode === 'direct'
          ? item.straightKm
          : calcHaversineKm(sLat, sLng, Number(item.wisata.latitude), Number(item.wisata.longitude), 1.25),
        selected: true,
        source: distanceMode === 'direct' ? 'Garis Lurus' : 'Estimasi'
      }))

      if (distanceMode === 'osrm') {
        await Promise.all(
          available.map(async (item, idx) => {
            try {
              const url = `https://router.project-osrm.org/route/v1/driving/${sLng},${sLat};${item.wisata.longitude},${item.wisata.latitude}?overview=false`
              const controller = new AbortController()
              const timeoutId = setTimeout(() => controller.abort(), 3500)
              const res = await fetch(url, { signal: controller.signal })
              clearTimeout(timeoutId)
              const json = await res.json()
              if (json.code === 'Ok' && json.routes?.[0]) {
                initialRows[idx].jarak = Number(Math.max(0.1, json.routes[0].distance / 1000).toFixed(1))
                initialRows[idx].source = 'OSRM'
              }
            } catch {
              // Fallback tetap menggunakan estimasi Haversine * 1.25
            }
          })
        )
      }

      if (!cancelled) {
        setCandidates(initialRows)
        setCalculating(false)
      }
    }

    buildCandidates()
    return () => { cancelled = true }
  }, [isOpen, sourceWisata, neighborCount, distanceMode, wisataList, grafList])

  const handleToggleRow = (targetId) => {
    setCandidates(prev => prev.map(c => c.targetId === targetId ? { ...c, selected: !c.selected } : c))
  }

  const handleDistanceChange = (targetId, value) => {
    setCandidates(prev => prev.map(c => c.targetId === targetId ? { ...c, jarak: value } : c))
  }

  const handleSaveAll = async () => {
    const chosen = candidates.filter(c => c.selected)
    if (!sourceId || chosen.length === 0) {
      showToast('Pilih minimal 1 jalur tujuan untuk disimpan', 'error')
      return
    }

    const invalidRow = chosen.find(c => c.jarak === '' || Number(c.jarak) <= 0)
    if (invalidRow) {
      showToast(`Jarak menuju "${invalidRow.targetName}" harus lebih dari 0 km`, 'error')
      return
    }

    setSaving(true)
    try {
      const sId = Number(sourceId)
      const inserts = []

      chosen.forEach(c => {
        const d = Number(c.jarak)
        const existsForward = grafList.some(g => Number(g.titik_awal) === sId && Number(g.titik_tujuan) === c.targetId)
        if (!existsForward) {
          inserts.push({ titik_awal: sId, titik_tujuan: c.targetId, jarak: d })
        }

        if (isTwoWay) {
          const existsReverse = grafList.some(g => Number(g.titik_awal) === c.targetId && Number(g.titik_tujuan) === sId)
          if (!existsReverse) {
            inserts.push({ titik_awal: c.targetId, titik_tujuan: sId, jarak: d })
          }
        }
      })

      if (inserts.length === 0) {
        showToast('Semua jalur yang dipilih sudah ada di database', 'info')
        onClose()
        return
      }

      const { error } = await supabase.from('graf').insert(inserts)
      if (error) throw error

      showToast(`${inserts.length} entri jalur graf berhasil ditambahkan`, 'success')
      dataCache.invalidate('graf')
      dataCache.invalidate('dashboard_data')
      await onSuccess?.()
      onClose()
    } catch (err) {
      showToast('Gagal menyimpan jalur otomatis: ' + err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  const selectedCount = candidates.filter(c => c.selected).length

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-slate-200/80 flex items-center justify-between bg-slate-50/70 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-base font-[Sora]">Hubungkan ke Wisata Terdekat</h3>
              <p className="text-xs text-slate-500">Buat beberapa jalur graf sekaligus secara otomatis berdasarkan koordinat GPS.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Pilih Objek Wisata *</label>
              <select
                value={sourceId}
                onChange={(e) => setSourceId(e.target.value)}
                disabled={saving}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="">-- Pilih wisata yang akan dihubungkan --</option>
                {wisataList.map(w => (
                  <option key={w.id_wisata} value={w.id_wisata}>{w.nama_wisata}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Jumlah Tetangga</label>
              <select
                value={neighborCount}
                onChange={(e) => setNeighborCount(Number(e.target.value))}
                disabled={saving}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              >
                {[2, 3, 4, 5].map(n => (
                  <option key={n} value={n}>{n} Wisata Terdekat</option>
                ))}
              </select>
            </div>
          </div>

          {/* Mode Hitung Jarak */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => setDistanceMode('osrm')}
              disabled={saving}
              className={`p-3 rounded-xl border text-left transition-all flex items-start gap-2.5 ${
                distanceMode === 'osrm'
                  ? 'bg-blue-50/80 border-blue-400 text-blue-900 shadow-2xs'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Car className={`w-4 h-4 shrink-0 mt-0.5 ${distanceMode === 'osrm' ? 'text-blue-600' : 'text-slate-400'}`} />
              <div>
                <p className="text-xs font-bold">Rute Jalan Raya (OSRM)</p>
                <p className="text-[11px] opacity-80 mt-0.5">Mengikuti jalur jalan darat di peta.</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setDistanceMode('direct')}
              disabled={saving}
              className={`p-3 rounded-xl border text-left transition-all flex items-start gap-2.5 ${
                distanceMode === 'direct'
                  ? 'bg-cyan-50/80 border-cyan-400 text-cyan-900 shadow-2xs'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Anchor className={`w-4 h-4 shrink-0 mt-0.5 ${distanceMode === 'direct' ? 'text-cyan-600' : 'text-slate-400'}`} />
              <div>
                <p className="text-xs font-bold">Jarak Langsung / Perairan (Boat)</p>
                <p className="text-[11px] opacity-80 mt-0.5">Cocok untuk wisata pulau atau akses perahu.</p>
              </div>
            </button>
          </div>

          {/* Preview Daftar Kandidat */}
          {sourceId && (
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">
                  Rekomendasi Jalur Terdekat ({candidates.length})
                </span>
                {calculating && (
                  <span className="text-xs text-blue-600 font-medium flex items-center gap-1.5">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Menghitung jarak...
                  </span>
                )}
              </div>

              {!sourceWisata?.latitude || !sourceWisata?.longitude ? (
                <div className="p-6 text-center text-xs text-red-600">
                  Koordinat GPS untuk wisata ini belum lengkap. Lengkapi latitude & longitude di Kelola Wisata terlebih dahulu.
                </div>
              ) : candidates.length === 0 && !calculating ? (
                <div className="p-6 text-center text-xs text-slate-500">
                  Semua wisata lain sudah terhubung dengan {sourceWisata?.nama_wisata}.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {candidates.map(c => (
                    <div key={c.targetId} className={`px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${c.selected ? 'bg-white' : 'bg-slate-50/60 opacity-60'}`}>
                      <label className="flex items-center gap-2.5 cursor-pointer flex-1 min-w-0">
                        <input
                          type="checkbox"
                          checked={c.selected}
                          onChange={() => handleToggleRow(c.targetId)}
                          className="w-4 h-4 text-blue-600 rounded border-slate-300 cursor-pointer shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="text-xs sm:text-sm font-semibold text-slate-800 truncate">{c.targetName}</p>
                          <p className="text-[11px] text-slate-400">Sumber jarak: {c.source} (bisa diubah manual)</p>
                        </div>
                      </label>

                      <div className="flex items-center gap-1.5 pl-6 sm:pl-0 shrink-0">
                        <input
                          type="number"
                          step="any"
                          min="0.1"
                          value={c.jarak}
                          onChange={(e) => handleDistanceChange(c.targetId, e.target.value)}
                          disabled={!c.selected || saving}
                          className="w-24 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 text-right focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                        <span className="text-xs font-semibold text-slate-500">km</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <label className="flex items-center gap-2.5 p-3 bg-blue-50/60 border border-blue-200/70 rounded-xl cursor-pointer">
            <input
              type="checkbox"
              checked={isTwoWay}
              onChange={(e) => setIsTwoWay(e.target.checked)}
              disabled={saving}
              className="w-4 h-4 text-blue-600 rounded border-slate-300 cursor-pointer"
            />
            <span className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
              <ArrowLeftRight className="w-3.5 h-3.5 text-blue-600" />
              Buat otomatis 2 Arah (Bolak-balik A ⇄ B)
            </span>
          </label>
        </div>

        <div className="px-5 py-3.5 border-t border-slate-200/80 bg-slate-50/70 flex flex-col-reverse sm:flex-row justify-end gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="w-full sm:w-auto px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-semibold rounded-xl transition-colors"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleSaveAll}
            disabled={saving || calculating || selectedCount === 0}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold rounded-xl transition-colors shadow-xs disabled:opacity-50"
          >
            <Check className="w-4 h-4" />
            <span>{saving ? 'Menyimpan...' : `Simpan ${selectedCount} Jalur`}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
