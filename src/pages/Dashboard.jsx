import { useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { MapPin, Route, Building, Star, ArrowRight, UserPlus, MessageSquare, User, Calendar, Plus, Sparkles, TrendingUp, Users, PieChart, Compass } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { dataCache } from '../utils/dataCache'

export default function Dashboard() {
  const navigate = useNavigate()
  const admin = JSON.parse(localStorage.getItem('admin') || 'null')
  
  const cachedDash = dataCache.get('dashboard_data')
  const [loading, setLoading] = useState(() => !cachedDash)
  const [stats, setStats] = useState(() => cachedDash?.stats || { wisata: 0, graf: 0, fasilitas: 0, review: 0, wisatawan: 0 })
  const [kategoriCounts, setKategoriCounts] = useState(() => cachedDash?.kategoriCounts || { Alam: 0, Budaya: 0, Sejarah: 0 })
  const [latestReviews, setLatestReviews] = useState(() => cachedDash?.latestReviews || [])
  const [newWisatawan, setNewWisatawan] = useState(() => cachedDash?.newWisatawan || [])
  const [chartData, setChartData] = useState(() => cachedDash?.chartData || [])

  useEffect(() => { 
    fetchDashboardData() 
  }, [])

  const fetchDashboardData = async () => {
    if (!dataCache.has('dashboard_data')) {
      setLoading(true)
    }
    
    // 1. Fetch Stats & Categories
    const [wData, g, f, r, wst] = await Promise.all([
      supabase.from('wisata').select('id_wisata, kategori'),
      supabase.from('graf').select('*', { count: 'exact', head: true }),
      supabase.from('fasilitas').select('*', { count: 'exact', head: true }),
      supabase.from('review').select('*', { count: 'exact', head: true }),
      supabase.from('wisatawan').select('*', { count: 'exact', head: true }),
    ])

    const wisataList = wData.data || []
    const katCounts = {
      Alam: wisataList.filter(item => item.kategori === 'Alam').length,
      Budaya: wisataList.filter(item => item.kategori === 'Budaya').length,
      Sejarah: wisataList.filter(item => item.kategori === 'Sejarah').length,
    }
    setKategoriCounts(katCounts)
    
    // 2. Fetch Latest Reviews
    const { data: reviews } = await supabase
      .from('review')
      .select('id_review, rating, komentar, tanggal, wisatawan(nama_wisatawan), wisata(nama_wisata)')
      .order('tanggal', { ascending: false })
      .limit(5)
      
    // 3. Fetch New Wisatawan
    const { data: wisatawan, error: wstError } = await supabase
      .from('wisatawan')
      .select('id_wisatawan, nama_wisatawan, email')
      .order('id_wisatawan', { ascending: false })
      .limit(5)
      
    if (wstError) {
      console.error('Gagal mengambil data wisatawan di dashboard:', wstError)
    }
      
    // 4. Fetch All Reviews for Chart
    const { data: allReviews } = await supabase
      .from('review')
      .select('tanggal')
      
    // Process chart data (last 6 months)
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des']
    const counts = {}
    
    const today = new Date()
    for(let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1)
      const key = `${monthNames[d.getMonth()]} ${d.getFullYear()}`
      counts[key] = 0
    }
    
    if (allReviews) {
      allReviews.forEach(rev => {
        if (!rev.tanggal) return
        const d = new Date(rev.tanggal)
        const key = `${monthNames[d.getMonth()]} ${d.getFullYear()}`
        if (counts[key] !== undefined) {
          counts[key] += 1
        }
      })
    }
    
    const processedChartData = Object.keys(counts).map(key => ({
      name: key,
      Total: counts[key]
    }))

    const newStats = { 
      wisata: wisataList.length, 
      graf: g.count || 0, 
      fasilitas: f.count || 0, 
      review: r.count || 0, 
      wisatawan: wst.count || 0 
    }

    setStats(newStats)
    setLatestReviews(reviews || [])
    setNewWisatawan(wisatawan || [])
    setChartData(processedChartData)

    dataCache.set('dashboard_data', {
      stats: newStats,
      kategoriCounts: katCounts,
      latestReviews: reviews || [],
      newWisatawan: wisatawan || [],
      chartData: processedChartData
    })

    setLoading(false)
  }

  const statCards = [
    { 
      label: 'Total Wisata', 
      sublabel: 'Destinasi terdaftar',
      value: stats.wisata, 
      icon: MapPin, 
      iconBg: 'bg-blue-50 text-blue-600 border border-blue-100',
      path: '/wisata'
    },
    { 
      label: 'Jalur Graf', 
      sublabel: 'Rute Dijkstra',
      value: stats.graf, 
      icon: Route, 
      iconBg: 'bg-indigo-50 text-indigo-600 border border-indigo-100',
      path: '/graf'
    },
    { 
      label: 'Master Fasilitas', 
      sublabel: 'Fasilitas aktif',
      value: stats.fasilitas, 
      icon: Building, 
      iconBg: 'bg-emerald-50 text-emerald-600 border border-emerald-100',
      path: '/fasilitas'
    },
    { 
      label: 'Data Wisatawan', 
      sublabel: 'Akun terdaftar',
      value: stats.wisatawan, 
      icon: Users, 
      iconBg: 'bg-cyan-50 text-cyan-600 border border-cyan-100',
      path: '/wisatawan'
    },
    { 
      label: 'Ulasan Masuk', 
      sublabel: 'Rating & komentar',
      value: stats.review, 
      icon: Star, 
      iconBg: 'bg-amber-50 text-amber-600 border border-amber-100',
      path: '/review'
    },
  ]

  const getRelativeTime = (dateString) => {
    if (!dateString) return 'Belum lama ini'
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now - date
    if (diffMs < 0) return 'Baru saja'
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)
    
    if (diffMins < 60) return `${diffMins || 1} menit lalu`
    if (diffHours < 24) return `${diffHours} jam lalu`
    if (diffDays === 1) return 'Kemarin'
    if (diffDays < 7) return `${diffDays} hari lalu`
    if (diffDays < 30) return `${Math.floor(diffDays/7)} minggu lalu`
    if (diffDays < 365) return `${Math.floor(diffDays/30)} bulan lalu`
    return date.toLocaleDateString('id-ID')
  }

  const getAvatarColor = (name) => {
    if (!name) return 'bg-slate-100 text-slate-500'
    const colors = [
      'bg-blue-100 text-blue-700', 'bg-indigo-100 text-indigo-700',
      'bg-purple-100 text-purple-700', 'bg-pink-100 text-pink-700',
      'bg-rose-100 text-rose-700', 'bg-emerald-100 text-emerald-700',
      'bg-teal-100 text-teal-700', 'bg-cyan-100 text-cyan-700'
    ]
    const charCode = name.charCodeAt(0)
    return colors[charCode % colors.length]
  }

  const getStarColor = (rating) => {
    if (rating >= 5) return 'text-amber-500 fill-amber-500'
    if (rating >= 4) return 'text-amber-400 fill-amber-400'
    if (rating >= 3) return 'text-amber-300 fill-amber-300'
    return 'text-amber-200 fill-amber-200'
  }

  const todayStr = new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  return (
    <div className="flex flex-col gap-6 pb-10">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Dashboard Overview</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Selamat datang kembali, <strong className="text-slate-800 font-semibold">{admin?.nama_admin || 'Admin'}</strong>. Ringkasan sistem informasi pariwisata Kabupaten Kampar.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <div className="hidden sm:flex items-center gap-2 text-xs font-medium text-slate-600 bg-white border border-slate-200/90 px-3.5 py-2 rounded-xl shadow-2xs">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>{todayStr}</span>
          </div>
          <button 
            onClick={() => navigate('/wisata', { state: { openForm: true } })}
            className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl text-sm transition-colors shadow-xs w-full sm:w-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Wisata</span>
          </button>
        </div>
      </div>

      {/* Stats Cards (5 Clickable Cards) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4">
        {statCards.map((s) => {
          const Icon = s.icon;
          return (
            <div 
              key={s.label} 
              onClick={() => navigate(s.path)}
              className="bg-white rounded-2xl p-3.5 sm:p-5 border border-slate-200/80 shadow-xs flex items-center justify-between gap-2.5 sm:gap-3 hover:border-blue-400 hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer group"
              title={`Buka ${s.label}`}
            >
              <div className="min-w-0 flex-1">
                <span className="text-xs font-medium text-slate-500 block mb-1 group-hover:text-blue-600 transition-colors truncate">
                  {s.label}
                </span>
                {loading ? (
                  <div className="h-7 w-16 bg-slate-100 animate-pulse rounded my-1"></div>
                ) : (
                  <p className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                    {s.value}
                  </p>
                )}
                <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5 truncate hidden xs:block">
                  {s.sublabel}
                </p>
              </div>
              <div className={`w-9 h-9 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center shrink-0 ${s.iconBg} group-hover:scale-105 transition-transform`}>
                <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Middle Section: Chart (60%) & Category Breakdown (40%) */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        
        {/* Left: Trend Chart (60%) */}
        <div className="lg:col-span-3 bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 mb-6">
            <div>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-600" />
                <h3 className="text-base sm:text-lg font-bold font-[Sora] text-slate-900 tracking-tight">Tren Ulasan Wisatawan</h3>
              </div>
              <p className="text-slate-500 text-xs mt-0.5">Aktivitas ulasan yang masuk 6 bulan terakhir</p>
            </div>
            <span className="px-2.5 py-1 bg-blue-50 border border-blue-200/60 text-blue-700 rounded-full text-xs font-semibold self-start sm:self-auto">
              Real-time
            </span>
          </div>

          {loading ? (
            <div className="h-[220px] w-full bg-slate-50 animate-pulse rounded-xl border border-slate-100"></div>
          ) : chartData.length > 0 ? (
            <div className="h-[220px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 10 }}>
                  <defs>
                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.35}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={8} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} allowDecimals={false} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '4 4' }}
                  />
                  <Area type="monotone" dataKey="Total" stroke="#2563eb" strokeWidth={2.5} fillOpacity={1} fill="url(#colorTotal)" activeDot={{ r: 5, strokeWidth: 2, stroke: '#ffffff', fill: '#2563eb' }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[220px] flex flex-col items-center justify-center text-slate-400">
              <MessageSquare className="w-8 h-8 mb-2 opacity-50" />
              <p className="text-sm">Belum ada data review</p>
            </div>
          )}
        </div>

        {/* Right: Kategori Wisata Skripsi (40%) */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-5">
            <div>
              <div className="flex items-center gap-2">
                <Compass className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base sm:text-lg font-bold font-[Sora] text-slate-900 tracking-tight">Kategori Wisata</h3>
              </div>
              <p className="text-slate-500 text-xs mt-0.5">3 Kategori Objek Wisata Skripsi</p>
            </div>
            <button 
              onClick={() => navigate('/wisata')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline"
            >
              Lihat Detail
            </button>
          </div>

          <div className="space-y-4 my-auto">
            {/* Alam */}
            <div>
              <div className="flex justify-between items-center text-xs mb-1.5">
                <span className="font-bold text-slate-700 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                  Wisata Alam
                </span>
                <span className="font-bold text-slate-900">
                  {kategoriCounts.Alam} Destinasi ({stats.wisata > 0 ? Math.round((kategoriCounts.Alam / stats.wisata) * 100) : 0}%)
                </span>
              </div>
              <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-emerald-500 rounded-full transition-all duration-500" 
                  style={{ width: `${stats.wisata > 0 ? (kategoriCounts.Alam / stats.wisata) * 100 : 0}%` }}
                ></div>
              </div>
            </div>

            {/* Budaya */}
            <div>
              <div className="flex justify-between items-center text-xs mb-1.5">
                <span className="font-bold text-slate-700 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                  Wisata Budaya
                </span>
                <span className="font-bold text-slate-900">
                  {kategoriCounts.Budaya} Destinasi ({stats.wisata > 0 ? Math.round((kategoriCounts.Budaya / stats.wisata) * 100) : 0}%)
                </span>
              </div>
              <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-amber-500 rounded-full transition-all duration-500" 
                  style={{ width: `${stats.wisata > 0 ? (kategoriCounts.Budaya / stats.wisata) * 100 : 0}%` }}
                ></div>
              </div>
            </div>

            {/* Sejarah */}
            <div>
              <div className="flex justify-between items-center text-xs mb-1.5">
                <span className="font-bold text-slate-700 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span>
                  Wisata Sejarah
                </span>
                <span className="font-bold text-slate-900">
                  {kategoriCounts.Sejarah} Destinasi ({stats.wisata > 0 ? Math.round((kategoriCounts.Sejarah / stats.wisata) * 100) : 0}%)
                </span>
              </div>
              <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-purple-500 rounded-full transition-all duration-500" 
                  style={{ width: `${stats.wisata > 0 ? (kategoriCounts.Sejarah / stats.wisata) * 100 : 0}%` }}
                ></div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 mt-2">
            <span>Total Cakupan Wisata:</span>
            <span className="font-bold text-slate-800">{stats.wisata} Tempat Wisata</span>
          </div>
        </div>

      </div>

      {/* 2 Columns: Latest Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        
        {/* Left Column: Recent Reviews (60%) */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col h-full">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/70">
            <div>
              <h3 className="font-bold font-[Sora] text-slate-800 text-base tracking-tight">Review Terbaru</h3>
              <p className="text-xs text-slate-500 mt-0.5">Ulasan terkini dari pengunjung</p>
            </div>
            <button onClick={() => navigate('/review')} className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 group px-2.5 py-1.5 rounded-lg hover:bg-blue-50 transition-colors">
              Lihat semua <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
          <div className="flex-1 flex flex-col">
            {loading ? (
              [1,2,3].map(i => (
                <div key={i} className="p-5 border-b border-slate-50 flex gap-4 animate-pulse">
                  <div className="w-10 h-10 bg-slate-200 rounded-full shrink-0"></div>
                  <div className="flex-1 space-y-2 py-1"><div className="h-4 bg-slate-200 rounded w-1/3"></div><div className="h-3 bg-slate-100 rounded w-full"></div></div>
                </div>
              ))
            ) : latestReviews.length > 0 ? (
              <div className="divide-y divide-slate-100 flex-1">
                {latestReviews.map(review => {
                  const isAnonim = !review.wisatawan?.nama_wisatawan
                  const avatarColor = getAvatarColor(review.wisatawan?.nama_wisatawan || 'Anonim')
                  return (
                  <div key={review.id_review} className="p-5 hover:bg-slate-50/80 transition-colors cursor-pointer group/item">
                    <div className="flex items-start justify-between gap-4 mb-2.5">
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 shadow-xs ${isAnonim ? 'bg-slate-100 text-slate-400 border border-slate-200' : avatarColor}`}>
                          {isAnonim ? <User className="w-5 h-5" /> : review.wisatawan.nama_wisatawan.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-800 hover:text-blue-600 transition-colors mb-0.5" onClick={(e) => { e.stopPropagation(); navigate('/wisata') }}>
                            {review.wisata?.nama_wisata || 'Tempat Wisata'}
                          </p>
                          <p className="text-xs text-slate-500 flex items-center gap-1.5">
                            <span className={isAnonim ? "text-slate-400 italic" : "text-slate-700 font-medium"}>{isAnonim ? 'Wisatawan' : review.wisatawan.nama_wisatawan}</span>
                            <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                            <span className="text-[11px] text-slate-400 font-medium">{getRelativeTime(review.tanggal)}</span>
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-0.5 shrink-0 px-2 py-1 rounded-lg bg-amber-50 border border-amber-100">
                        {Array.from({length: 5}).map((_, i) => (
                          <Star key={i} className={`w-3.5 h-3.5 ${i < review.rating ? getStarColor(review.rating) : 'text-slate-200'}`} />
                        ))}
                      </div>
                    </div>
                    <div className="ml-13 pl-3.5 border-l-2 border-slate-200 text-slate-600 text-sm leading-relaxed italic bg-slate-50/50 py-1.5 rounded-r-lg">
                      "{review.komentar}"
                    </div>
                  </div>
                )})}
              </div>
            ) : (
              <div className="p-10 flex flex-col items-center justify-center text-slate-400 flex-1">
                 <MessageSquare className="w-8 h-8 mb-2 opacity-50" />
                 <p className="text-sm">Belum ada review terbaru</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: New Wisatawan (40%) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col h-full">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/70">
            <div>
              <h3 className="font-bold font-[Sora] text-slate-800 text-base tracking-tight">Wisatawan Baru</h3>
              <p className="text-xs text-slate-500 mt-0.5">Pengguna yang baru bergabung</p>
            </div>
            <button onClick={() => navigate('/wisatawan')} className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 group px-2.5 py-1.5 rounded-lg hover:bg-blue-50 transition-colors">
              Lihat semua <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
          <div className="flex flex-col flex-1">
            <div className="flex-1 flex flex-col">
              {loading ? (
                [1,2,3,4].map(i => (
                  <div key={i} className="p-5 flex gap-3 animate-pulse">
                    <div className="w-10 h-10 bg-slate-200 rounded-full shrink-0"></div>
                    <div className="flex-1 space-y-2 py-1"><div className="h-4 bg-slate-200 rounded w-1/2"></div><div className="h-3 bg-slate-100 rounded w-3/4"></div></div>
                  </div>
                ))
              ) : newWisatawan.length > 0 ? (
                <div className="divide-y divide-slate-100">
                  {newWisatawan.map(user => (
                    <div 
                      key={user.id_wisatawan} 
                      onClick={() => navigate('/wisatawan')}
                      className="p-4 sm:p-5 flex items-center gap-3.5 hover:bg-slate-50/80 transition-colors cursor-pointer group/user"
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 shadow-xs ${getAvatarColor(user.nama_wisatawan)}`}>
                        {user.nama_wisatawan?.charAt(0).toUpperCase() || '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-800 truncate group-hover/user:text-blue-600 transition-colors">{user.nama_wisatawan}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5 truncate">{user.email || 'Akun Wisatawan'}</p>
                      </div>
                      <div className="shrink-0 flex flex-col items-end gap-1">
                        <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold tracking-wider uppercase rounded-md border border-emerald-200/70">
                          Aktif
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-10 flex flex-col items-center justify-center text-slate-400 flex-1">
                   <UserPlus className="w-8 h-8 mb-2 opacity-50" />
                   <p className="text-sm">Belum ada pendaftar</p>
                </div>
              )}
            </div>
            
            {/* Footer */}
            {!loading && (
              <div className="p-4 bg-slate-50/70 border-t border-slate-100 mt-auto text-center">
                <span className="text-xs font-medium text-slate-500">
                  Total terdaftar: <strong className="text-slate-800 font-semibold">{stats.wisatawan} wisatawan</strong>
                </span>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
