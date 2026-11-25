import { useState, useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { X, Check, MapPin, Navigation, Search, Loader2 } from 'lucide-react'

// Custom DivIcon agar tidak ada masalah asset path Leaflet di Vite
const customMarkerIcon = L.divIcon({
  className: 'custom-map-pin',
  html: `
    <div style="position: relative; display: flex; flex-direction: column; align-items: center; cursor: grab;">
      <div style="background: #2563eb; color: #ffffff; width: 34px; height: 34px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(37,99,235,0.45); border: 2.5px solid #ffffff;">
        <svg style="transform: rotate(45deg); width: 16px; height: 16px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
          <circle cx="12" cy="10" r="3"/>
        </svg>
      </div>
      <div style="width: 10px; height: 4px; background: rgba(0,0,0,0.25); border-radius: 50%; filter: blur(1px); margin-top: 1px;"></div>
    </div>
  `,
  iconSize: [34, 40],
  iconAnchor: [17, 38],
  popupAnchor: [0, -38]
})

export default function MapPickerModal({ isOpen, onClose, onSelect, initialLat, initialLng }) {
  const mapContainerRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const markerRef = useRef(null)

  // Default titik tengah: Kabupaten Kampar, Riau
  const DEFAULT_LAT = 0.334125
  const DEFAULT_LNG = 101.023412

  const [position, setPosition] = useState({
    lat: initialLat ? Number(initialLat) : DEFAULT_LAT,
    lng: initialLng ? Number(initialLng) : DEFAULT_LNG
  })
  const [gettingLocation, setGettingLocation] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [searchResults, setSearchResults] = useState([])
  const [searchError, setSearchError] = useState('')

  useEffect(() => {
    if (isOpen) {
      const validLat = initialLat && !isNaN(Number(initialLat)) ? Number(initialLat) : DEFAULT_LAT
      const validLng = initialLng && !isNaN(Number(initialLng)) ? Number(initialLng) : DEFAULT_LNG
      setPosition({ lat: validLat, lng: validLng })
      setSearchQuery('')
      setSearchResults([])
      setSearchError('')
    }
  }, [isOpen, initialLat, initialLng])

  useEffect(() => {
    if (!isOpen) return

    // Timeout kecil untuk memastikan container modal sudah di-render ke DOM
    const timer = setTimeout(() => {
      if (!mapContainerRef.current) return

      // Bersihkan instance map lama jika ada
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }

      const initialZoom = initialLat && initialLng ? 14 : 11
      const startLat = initialLat && !isNaN(Number(initialLat)) ? Number(initialLat) : DEFAULT_LAT
      const startLng = initialLng && !isNaN(Number(initialLng)) ? Number(initialLng) : DEFAULT_LNG

      const map = L.map(mapContainerRef.current, {
        center: [startLat, startLng],
        zoom: initialZoom,
        zoomControl: false // Kita buat custom control atau posisikan
      })

      // Tambahkan tile layer OpenStreetMap
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19
      }).addTo(map)

      // Tambahkan marker draggable
      const marker = L.marker([startLat, startLng], {
        icon: customMarkerIcon,
        draggable: true
      }).addTo(map)

      marker.bindPopup(`
        <div style="font-family: inherit; font-size: 12px; text-align: center; padding: 2px;">
          <b style="color: #1e293b;">Titik Terpilih</b><br/>
          <span style="color: #64748b; font-family: monospace;">${startLat.toFixed(6)}, ${startLng.toFixed(6)}</span><br/>
          <small style="color: #2563eb;">Geser marker atau klik di mana saja</small>
        </div>
      `).openPopup()

      // Event saat marker digeser
      marker.on('dragend', () => {
        const newPos = marker.getLatLng()
        const lat = Number(newPos.lat.toFixed(6))
        const lng = Number(newPos.lng.toFixed(6))
        setPosition({ lat, lng })
        marker.setPopupContent(`
          <div style="font-family: inherit; font-size: 12px; text-align: center; padding: 2px;">
            <b style="color: #1e293b;">Titik Terpilih</b><br/>
            <span style="color: #64748b; font-family: monospace;">${lat}, ${lng}</span>
          </div>
        `).openPopup()
      })

      // Event saat peta diklik di mana saja
      map.on('click', (e) => {
        const lat = Number(e.latlng.lat.toFixed(6))
        const lng = Number(e.latlng.lng.toFixed(6))
        marker.setLatLng([lat, lng])
        setPosition({ lat, lng })
        marker.setPopupContent(`
          <div style="font-family: inherit; font-size: 12px; text-align: center; padding: 2px;">
            <b style="color: #1e293b;">Titik Terpilih</b><br/>
            <span style="color: #64748b; font-family: monospace;">${lat}, ${lng}</span>
          </div>
        `).openPopup()
      })

      mapInstanceRef.current = map
      markerRef.current = marker

      // Pastikan ukuran map ter-render penuh
      setTimeout(() => {
        map.invalidateSize()
      }, 200)
    }, 50)

    return () => {
      clearTimeout(timer)
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [isOpen])

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Browser Anda tidak mendukung geolokasi.')
      return
    }

    setGettingLocation(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(6))
        const lng = Number(pos.coords.longitude.toFixed(6))
        setPosition({ lat, lng })

        if (mapInstanceRef.current && markerRef.current) {
          mapInstanceRef.current.flyTo([lat, lng], 15, { duration: 1.2 })
          markerRef.current.setLatLng([lat, lng])
          markerRef.current.setPopupContent(`
            <div style="font-family: inherit; font-size: 12px; text-align: center; padding: 2px;">
              <b style="color: #1e293b;">Lokasi Perangkat Anda</b><br/>
              <span style="color: #64748b; font-family: monospace;">${lat}, ${lng}</span>
            </div>
          `).openPopup()
        }
        setGettingLocation(false)
      },
      (err) => {
        setGettingLocation(false)
        alert('Gagal mendeteksi lokasi: ' + (err.message || 'Izin akses ditolak.'))
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  const handleSearchLocation = async () => {
    const q = searchQuery.trim()
    if (!q) return

    setSearching(true)
    setSearchError('')
    setSearchResults([])

    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&countrycodes=id&limit=5`
      const res = await fetch(url, {
        headers: { 'Accept-Language': 'id' }
      })
      const data = await res.json()

      if (!data || data.length === 0) {
        setSearchError('Lokasi tidak ditemukan. Coba tambah kata "Kampar" atau "Riau".')
      } else {
        setSearchResults(data)
      }
    } catch (err) {
      setSearchError('Gagal mencari lokasi. Periksa koneksi internet Anda.')
    } finally {
      setSearching(false)
    }
  }

  const handleSelectSearchResult = (item) => {
    const lat = Number(Number(item.lat).toFixed(6))
    const lng = Number(Number(item.lon).toFixed(6))
    setPosition({ lat, lng })
    setSearchResults([])
    setSearchError('')

    if (mapInstanceRef.current && markerRef.current) {
      mapInstanceRef.current.flyTo([lat, lng], 15, { duration: 1.2 })
      markerRef.current.setLatLng([lat, lng])
      markerRef.current.setPopupContent(`
        <div style="font-family: inherit; font-size: 12px; text-align: center; padding: 2px; max-width: 220px;">
          <b style="color: #1e293b;">${item.display_name.split(',')[0]}</b><br/>
          <span style="color: #64748b; font-family: monospace;">${lat}, ${lng}</span>
        </div>
      `).openPopup()
    }
  }

  const handleConfirm = () => {
    onSelect({
      latitude: position.lat,
      longitude: position.lng
    })
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-2xl max-w-4xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col h-[85vh] max-h-[700px] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200/80 flex items-center justify-between bg-slate-50/70 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-base font-[Sora]">
                Pilih Titik Lokasi Wisata
              </h3>
              <p className="text-xs text-slate-500">
                Klik pada peta atau geser penanda pin untuk menentukan lokasi yang presisi.
              </p>
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            title="Tutup Peta"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Map Container */}
        <div className="relative flex-1 w-full bg-slate-100 min-h-[300px]">
          <div ref={mapContainerRef} className="absolute inset-0 w-full h-full z-10" />

          {/* Search Bar & Quick Floating Map Controls */}
          <div className="absolute top-3 left-3 right-3 z-20 flex flex-col sm:flex-row items-stretch sm:items-start justify-between gap-2 pointer-events-none">
            {/* Search Box */}
            <div className="relative w-full sm:max-w-xs pointer-events-auto">
              <div className="flex items-center bg-white/95 backdrop-blur-sm border border-slate-200/90 rounded-xl shadow-md overflow-hidden">
                <Search className="w-4 h-4 text-slate-400 ml-3 shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value)
                    if (searchError) setSearchError('')
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleSearchLocation()
                    }
                  }}
                  placeholder="Cari desa, kecamatan, wisata..."
                  className="w-full px-2.5 py-2 text-xs text-slate-800 bg-transparent outline-none placeholder:text-slate-400"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('')
                      setSearchResults([])
                      setSearchError('')
                    }}
                    className="p-1 text-slate-400 hover:text-slate-600"
                    title="Bersihkan pencarian"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleSearchLocation}
                  disabled={searching || !searchQuery.trim()}
                  className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors disabled:opacity-50 shrink-0 flex items-center gap-1"
                >
                  {searching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Cari'}
                </button>
              </div>

              {searchError && (
                <div className="mt-1.5 px-3 py-2 bg-red-50/95 border border-red-200 text-red-700 rounded-xl shadow-md text-[11px] font-medium backdrop-blur-sm">
                  {searchError}
                </div>
              )}

              {searchResults.length > 0 && (
                <div className="mt-1.5 bg-white/95 backdrop-blur-sm border border-slate-200 rounded-xl shadow-lg overflow-hidden max-h-48 overflow-y-auto divide-y divide-slate-100">
                  {searchResults.map((item) => (
                    <button
                      key={item.place_id}
                      type="button"
                      onClick={() => handleSelectSearchResult(item)}
                      className="w-full text-left px-3 py-2 hover:bg-blue-50/80 transition-colors flex items-start gap-2"
                    >
                      <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                      <span className="text-[11px] text-slate-700 leading-snug line-clamp-2">
                        {item.display_name}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* My Location Button */}
            <button
              type="button"
              onClick={handleGetCurrentLocation}
              disabled={gettingLocation}
              className="self-end sm:self-auto pointer-events-auto flex items-center gap-1.5 px-3 py-2 bg-white/95 hover:bg-white text-blue-600 border border-slate-200/90 rounded-xl shadow-md text-xs font-semibold backdrop-blur-sm transition-all disabled:opacity-50 shrink-0"
              title="Arahkan peta ke posisi GPS Anda saat ini"
            >
              <Navigation className={`w-3.5 h-3.5 ${gettingLocation ? 'animate-spin' : ''}`} />
              <span>{gettingLocation ? 'Mencari...' : 'Lokasi Saya'}</span>
            </button>
          </div>

          <div className="hidden sm:flex absolute bottom-3 left-3 z-20 bg-white/95 backdrop-blur-sm px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm text-[11px] text-slate-600 items-center gap-1.5">
            <span className="font-bold text-blue-700">Petunjuk:</span>
            <span>Klik area peta atau geser penanda pin ke titik wisata.</span>
          </div>
        </div>

        {/* Footer with Selected Coordinates & Action Buttons */}
        <div className="px-4 sm:px-5 py-3 border-t border-slate-200/80 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <div className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs">
              <span className="text-slate-500 font-medium">Latitude: </span>
              <span className="font-mono font-bold text-slate-800">{position.lat}</span>
            </div>
            <div className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs">
              <span className="text-slate-500 font-medium">Longitude: </span>
              <span className="font-mono font-bold text-slate-800">{position.lng}</span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-initial px-4 py-2 text-xs sm:text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors text-center"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold rounded-xl transition-colors shadow-xs"
            >
              <Check className="w-4 h-4" />
              <span>Gunakan Titik Ini</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
