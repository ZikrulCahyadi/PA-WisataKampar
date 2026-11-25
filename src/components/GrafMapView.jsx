import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

/**
 * Peta interaktif jaringan graf wisata Kabupaten Kampar.
 * Menampilkan seluruh titik wisata dan garis koneksi antar simpul graf.
 */
export default function GrafMapView({ wisataList, grafList, isolatedIds = new Set(), onSelectWisata }) {
  const mapContainerRef = useRef(null)
  const mapInstanceRef = useRef(null)

  useEffect(() => {
    if (!mapContainerRef.current) return

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove()
      mapInstanceRef.current = null
    }

    const DEFAULT_LAT = 0.334125
    const DEFAULT_LNG = 101.023412

    const map = L.map(mapContainerRef.current, {
      center: [DEFAULT_LAT, DEFAULT_LNG],
      zoom: 10
    })

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(map)

    const wisataMap = new Map()
    wisataList.forEach(w => {
      if (w.latitude != null && w.longitude != null && !isNaN(Number(w.latitude)) && !isNaN(Number(w.longitude))) {
        wisataMap.set(Number(w.id_wisata), w)
      }
    })

    // Gambar garis rute (deduplikasi pasangan A-B & B-A agar peta bersih)
    const drawnPairs = new Set()
    grafList.forEach(g => {
      const a = Number(g.titik_awal)
      const b = Number(g.titik_tujuan)
      const pairKey = a < b ? `${a}-${b}` : `${b}-${a}`
      if (drawnPairs.has(pairKey)) return
      drawnPairs.add(pairKey)

      const wA = wisataMap.get(a)
      const wB = wisataMap.get(b)
      if (!wA || !wB) return

      const hasReverse = grafList.some(r => Number(r.titik_awal) === b && Number(r.titik_tujuan) === a)

      const line = L.polyline(
        [
          [Number(wA.latitude), Number(wA.longitude)],
          [Number(wB.latitude), Number(wB.longitude)]
        ],
        {
          color: hasReverse ? '#4f46e5' : '#d97706',
          weight: hasReverse ? 3 : 2.5,
          opacity: 0.78,
          dashArray: hasReverse ? null : '6, 6'
        }
      ).addTo(map)

      line.bindTooltip(
        `<div style="font-size:12px;"><b>${wA.nama_wisata}</b> ${hasReverse ? '⇄' : '➔'} <b>${wB.nama_wisata}</b><br/>Jarak: <b>${g.jarak} km</b> (${hasReverse ? '2 Arah' : '1 Arah'})</div>`,
        { sticky: true }
      )
    })

    // Gambar marker setiap titik wisata
    const bounds = []
    wisataMap.forEach((w, id) => {
      const lat = Number(w.latitude)
      const lng = Number(w.longitude)
      bounds.push([lat, lng])

      const isIsolated = isolatedIds.has(id)
      const color = isIsolated ? '#dc2626' : '#2563eb'

      const marker = L.circleMarker([lat, lng], {
        radius: isIsolated ? 8 : 6.5,
        fillColor: color,
        color: '#ffffff',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.95
      }).addTo(map)

      const routeCount = grafList.filter(g => Number(g.titik_awal) === id || Number(g.titik_tujuan) === id).length

      marker.bindPopup(`
        <div style="font-family: inherit; min-width: 170px;">
          <div style="font-weight: 700; color: #0f172a; font-size: 13px; margin-bottom: 2px;">${w.nama_wisata}</div>
          <div style="font-size: 11px; color: ${isIsolated ? '#dc2626' : '#475569'}; margin-bottom: 6px;">
            ${isIsolated ? 'Belum terhubung ke jaringan utama' : `${routeCount} entri jalur terhubung`}
          </div>
          <button
            type="button"
            data-wisata-id="${id}"
            class="graf-map-filter-btn"
            style="width: 100%; padding: 5px 8px; background: #2563eb; color: #fff; border: none; border-radius: 6px; font-size: 11px; font-weight: 600; cursor: pointer;"
          >
            Filter Jalur Wisata Ini
          </button>
        </div>
      `)

      marker.on('popupopen', (e) => {
        const popupEl = e.popup.getElement()
        const btn = popupEl?.querySelector('.graf-map-filter-btn')
        if (btn && onSelectWisata) {
          btn.onclick = () => {
            onSelectWisata(String(id))
          }
        }
      })
    })

    if (bounds.length > 0) {
      map.fitBounds(bounds, { padding: [32, 32], maxZoom: 13 })
    }

    mapInstanceRef.current = map

    setTimeout(() => {
      map.invalidateSize()
    }, 150)

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [wisataList, grafList, isolatedIds, onSelectWisata])

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden animate-in fade-in duration-200">
      <div className="px-4 sm:px-5 py-3 border-b border-slate-200/80 bg-slate-50/70 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold text-slate-800">Peta Visualisasi Jaringan Graf</h3>
          <p className="text-[11px] text-slate-500">Klik garis untuk melihat jarak, atau klik titik wisata untuk memfilter tabel.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-[11px] font-medium text-slate-600">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block" /> Terhubung
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-600 inline-block" /> Terisolasi
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-4 h-0.5 bg-indigo-600 inline-block" /> 2 Arah
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-4 h-0.5 border-b-2 border-dashed border-amber-600 inline-block" /> 1 Arah
          </span>
        </div>
      </div>
      <div ref={mapContainerRef} className="w-full h-[360px] sm:h-[420px] bg-slate-100 z-10" />
    </div>
  )
}
