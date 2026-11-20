import { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, MapPin, Route, Building, Star, Users, ChevronLeft, ChevronRight, ShieldCheck, Layers, Settings, X } from 'lucide-react';
import ProfileModal from './ProfileModal';

export default function Sidebar({ isOpen, setIsOpen, isCollapsed, setIsCollapsed }) {
  const [admin, setAdmin] = useState(() => JSON.parse(localStorage.getItem('admin') || 'null'));
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  useEffect(() => {
    const handleUpdate = () => {
      setAdmin(JSON.parse(localStorage.getItem('admin') || 'null'));
    };
    window.addEventListener('admin-updated', handleUpdate);
    return () => window.removeEventListener('admin-updated', handleUpdate);
  }, []);

  const menuItems = [
    { title: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { title: 'Kelola Wisata', path: '/wisata', icon: MapPin },
    { title: 'Kelola Graf', path: '/graf', icon: Route },
    { title: 'Master Fasilitas', path: '/fasilitas', icon: Building },
    { title: 'Fasilitas Wisata', path: '/wisata-fasilitas', icon: Layers },
    { title: 'Kelola Review', path: '/review', icon: Star },
    { title: 'Data Wisatawan', path: '/wisatawan', icon: Users },
  ];

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-slate-950/60 lg:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 bg-[#0f172a] text-slate-300 border-r border-slate-800/80 transform transition-all duration-300 w-64 ${isCollapsed ? 'lg:w-20' : 'lg:w-64'} lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'} shadow-2xl shadow-black/20`}>
        <div className="flex flex-col h-full relative">
          
          {/* Toggle Button for Desktop */}
          <button 
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden lg:flex absolute -right-3 top-6 w-6 h-6 bg-slate-800 border border-slate-700 rounded-full items-center justify-center text-slate-300 hover:text-white hover:bg-blue-600 hover:border-blue-500 shadow-md z-10 transition-colors"
            title={isCollapsed ? "Buka Sidebar" : "Ciutkan Sidebar"}
          >
            {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
          </button>

          {/* Logo/Header */}
          <div className={`h-16 flex items-center justify-between px-4 border-b border-slate-800 transition-all ${isCollapsed ? 'lg:justify-center lg:px-0' : 'lg:px-5'}`}>
            {/* Desktop collapsed icon */}
            <div className={`hidden ${isCollapsed ? 'lg:flex' : 'hidden'} items-center justify-center w-full`}>
              <div className="w-9 h-9 bg-white/10 rounded-xl flex items-center justify-center p-1.5" title="Wisata Kampar Admin">
                <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
              </div>
            </div>

            {/* Desktop uncollapsed & Mobile full brand */}
            <div className={`flex items-center gap-3 ${isCollapsed ? 'lg:hidden' : 'flex'}`}>
              <div className="w-9 h-9 bg-white/10 rounded-xl flex items-center justify-center p-1.5 shrink-0">
                <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
              </div>
              <div className="truncate">
                <h1 className="text-sm font-bold text-white tracking-tight leading-snug">
                  Wisata Kampar
                </h1>
                <span className="text-[10px] font-medium text-slate-400 block">
                  Admin Panel
                </span>
              </div>
            </div>

            {/* Mobile close button */}
            <button
              onClick={() => setIsOpen(false)}
              className="lg:hidden p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors ml-auto"
              title="Tutup Menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation */}
          <div className="px-4 pt-4 pb-1">
            <p className={`text-[10px] font-bold uppercase tracking-wider text-slate-500 ${isCollapsed ? 'lg:hidden' : 'block'}`}>
              Menu Utama
            </p>
          </div>

          <nav className="flex-1 overflow-y-auto py-2 px-3 space-y-1 scrollbar-thin">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  title={isCollapsed ? item.title : ""}
                  onClick={() => setIsOpen(false)}
                  className={({ isActive }) => 
                    `flex items-center ${isCollapsed ? 'lg:justify-center gap-3 lg:gap-0' : 'gap-3'} px-3 py-2.5 rounded-xl text-sm transition-colors ${
                      isActive 
                        ? 'bg-blue-600 text-white font-medium shadow-xs' 
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/80 font-normal'
                    }`
                  }
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isCollapsed ? 'lg:w-5 lg:h-5' : ''}`} />
                  <span className={`truncate ${isCollapsed ? 'lg:hidden' : 'block'}`}>{item.title}</span>
                </NavLink>
              );
            })}
          </nav>

          {/* Profile Card Footer */}
          <div className="p-3 border-t border-slate-800 bg-slate-950/30">
            <button
              onClick={() => setIsProfileModalOpen(true)}
              className={`w-full flex items-center ${isCollapsed ? 'lg:justify-center gap-3 lg:gap-0 px-2 lg:px-0' : 'gap-3 px-2'} py-2 rounded-xl hover:bg-slate-800/60 transition-colors text-left group`}
              title="Kelola Profil & Kata Sandi Akun"
            >
              <div className="relative shrink-0">
                <div className="w-8 h-8 rounded-lg bg-blue-600 group-hover:bg-blue-500 flex items-center justify-center text-white font-semibold text-xs transition-colors">
                  {admin?.nama_admin?.charAt(0).toUpperCase() || 'A'}
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-emerald-500 border border-slate-900 rounded-full" />
              </div>
              <div className={`flex-1 min-w-0 ${isCollapsed ? 'lg:hidden' : 'block'}`}>
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-white group-hover:text-blue-300 truncate leading-tight transition-colors">
                    {admin?.nama_admin || 'Administrator'}
                  </p>
                  <Settings className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300 transition-colors shrink-0 ml-1" />
                </div>
                <p className="text-[10px] text-slate-400 truncate mt-0.5">Pengaturan Akun</p>
              </div>
            </button>
          </div>
        </div>
      </aside>

      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />
    </>
  );
}
