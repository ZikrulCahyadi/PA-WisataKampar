import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, LogOut, Bell, ChevronRight, CheckCircle2, MessageSquare, Users, X } from 'lucide-react';
import ConfirmModal from './ConfirmModal';

export default function Navbar({ onMenuClick, title, pathname }) {
  const navigate = useNavigate();
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const notifRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setIsNotifOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogoutClick = () => {
    setIsLogoutModalOpen(true);
  };

  const confirmLogout = () => {
    localStorage.removeItem('admin');
    navigate('/');
  };

  const getBreadcrumb = () => {
    if (!pathname || pathname === '/dashboard') return null;
    return (
      <div className="flex items-center text-xs font-medium text-slate-500 mt-0.5">
        <span className="hover:text-blue-600 cursor-pointer transition-colors" onClick={() => navigate('/dashboard')}>Dashboard</span>
        <ChevronRight className="w-3 h-3 mx-1 text-slate-400" />
        <span className="text-slate-800 font-semibold">{title}</span>
      </div>
    );
  }

  return (
    <header className="h-16 bg-white border-b border-slate-200/90 sticky top-0 z-30 px-3.5 sm:px-6 flex items-center justify-between">
      <div className="flex items-center gap-2.5 sm:gap-4 min-w-0">
        <button
          onClick={onMenuClick}
          className="p-2 -ml-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg lg:hidden shrink-0"
          title="Buka Menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        {title && (
          <div className="flex flex-col justify-center min-w-0">
            <h2 className="text-sm sm:text-base font-bold text-slate-800 leading-tight truncate">
              {title}
            </h2>
            <div className="hidden sm:block">
              {getBreadcrumb()}
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
        {/* Notification Menu */}
        <div className="relative" ref={notifRef}>
          <button 
            onClick={() => setIsNotifOpen(!isNotifOpen)}
            className={`p-2 rounded-lg transition-colors relative ${isNotifOpen ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'}`} 
            title="Notifikasi Sistem"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-blue-600 rounded-full animate-pulse"></span>
          </button>

          {isNotifOpen && (
            <div className="fixed sm:absolute left-3 right-3 sm:left-auto sm:right-0 top-16 sm:top-auto sm:mt-2 w-auto sm:w-80 bg-white rounded-2xl shadow-xl border border-slate-200/90 py-3 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="px-4 pb-2.5 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-sm text-slate-800">Pusat Notifikasi</h4>
                  <p className="text-[11px] text-slate-400">Ringkasan aktivitas terkini</p>
                </div>
                <button 
                  onClick={() => setIsNotifOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="divide-y divide-slate-50 px-2 py-1 max-h-72 overflow-y-auto">
                <div 
                  onClick={() => { setIsNotifOpen(false); navigate('/review'); }}
                  className="p-2.5 hover:bg-slate-50 rounded-xl cursor-pointer transition-colors flex items-start gap-3"
                >
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-800">Ulasan Masuk</p>
                    <p className="text-[11px] text-slate-500 truncate">Pantau rating dan komentar wisatawan.</p>
                  </div>
                </div>

                <div 
                  onClick={() => { setIsNotifOpen(false); navigate('/wisatawan'); }}
                  className="p-2.5 hover:bg-slate-50 rounded-xl cursor-pointer transition-colors flex items-start gap-3"
                >
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                    <Users className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-800">Akun Wisatawan</p>
                    <p className="text-[11px] text-slate-500 truncate">Pengguna aktif terdaftar di mobile.</p>
                  </div>
                </div>

                <div className="p-2.5 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-800">Sistem Database Online</p>
                    <p className="text-[11px] text-slate-500">Koneksi Supabase aktif & tersinkronisasi.</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        
        <div className="w-px h-5 bg-slate-200 mx-1 hidden sm:block"></div>
        
        <button
          onClick={handleLogoutClick}
          className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-xl border border-slate-200/80 transition-colors"
          title="Keluar dari Admin Panel"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Keluar</span>
        </button>
      </div>

      <ConfirmModal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        onConfirm={confirmLogout}
        title="Keluar dari sistem?"
        description="Anda harus login kembali untuk mengakses admin panel."
        confirmText="Logout"
      />
    </header>
  );
}
