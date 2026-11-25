import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import { supabase } from '../supabaseClient';
import { dataCache } from '../utils/dataCache';

export default function Layout({ children }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const location = useLocation();

  useEffect(() => {
    // Background prefetch data agar perpindahan halaman berlangsung seketika (0ms)
    if (!dataCache.has('wisata')) {
      supabase.from('wisata').select('*').order('id_wisata').then(({ data }) => {
        if (data) dataCache.set('wisata', data)
      })
    }
    if (!dataCache.has('graf')) {
      supabase.from('graf').select('*').order('id_graf').then(({ data }) => {
        if (data) dataCache.set('graf', data)
      })
    }
    if (!dataCache.has('fasilitas')) {
      supabase.from('fasilitas').select('*, wisata_fasilitas(id_wisata)').order('id_fasilitas').then(({ data }) => {
        if (data) dataCache.set('fasilitas', data)
      })
    }
  }, []);

  const getPageTitle = (pathname) => {
    switch(pathname) {
      case '/dashboard': return 'Dashboard';
      case '/wisata': return 'Kelola Wisata';
      case '/graf': return 'Kelola Graf';
      case '/fasilitas': return 'Master Fasilitas';
      case '/wisata-fasilitas': return 'Fasilitas Wisata';
      case '/review': return 'Kelola Review';
      case '/wisatawan': return 'Data Wisatawan';
      default: return 'Admin Panel';
    }
  }

  const title = getPageTitle(location.pathname);

  return (
    <div className="min-h-screen bg-slate-100/60 flex relative text-slate-800 overflow-x-hidden">
      <Sidebar 
        isOpen={isSidebarOpen} 
        setIsOpen={setIsSidebarOpen}
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
      />
      
      <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${isSidebarCollapsed ? 'lg:pl-20' : 'lg:pl-64'}`}>
        <Navbar 
          onMenuClick={() => setIsSidebarOpen(true)} 
          title={title}
          pathname={location.pathname}
        />
        
        <main className="flex-1 p-3.5 sm:p-5 md:p-7 max-w-7xl w-full mx-auto">
          <div className="w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
