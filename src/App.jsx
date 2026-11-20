import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ToastProvider } from './context/ToastContext'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Wisata from './pages/Wisata'
import Graf from './pages/Graf'
import Fasilitas from './pages/Fasilitas'
import WisataFasilitas from './pages/WisataFasilitas'
import Review from './pages/Review'
import Wisatawan from './pages/Wisatawan'
import Layout from './components/Layout'

function getValidAdmin() {
  try {
    const raw = localStorage.getItem('admin')
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object' && parsed.id_admin && parsed.email) {
      return parsed
    }
    localStorage.removeItem('admin')
    return null
  } catch {
    localStorage.removeItem('admin')
    return null
  }
}

function ProtectedRoute({ children }) {
  const admin = getValidAdmin()
  return admin ? <Layout>{children}</Layout> : <Navigate to="/" replace />
}

function PublicRoute({ children }) {
  const admin = getValidAdmin()
  return admin ? <Navigate to="/dashboard" replace /> : children
}

export default function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/wisata" element={<ProtectedRoute><Wisata /></ProtectedRoute>} />
          <Route path="/graf" element={<ProtectedRoute><Graf /></ProtectedRoute>} />
          <Route path="/fasilitas" element={<ProtectedRoute><Fasilitas /></ProtectedRoute>} />
          <Route path="/wisata-fasilitas" element={<ProtectedRoute><WisataFasilitas /></ProtectedRoute>} />
          <Route path="/review" element={<ProtectedRoute><Review /></ProtectedRoute>} />
          <Route path="/wisatawan" element={<ProtectedRoute><Wisatawan /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  )
}