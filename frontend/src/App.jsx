import { Routes, Route, Navigate } from 'react-router-dom'
import LogoBar  from './components/layout/LogoBar.jsx'
import Navbar   from './components/layout/Navbar.jsx'
import Beranda  from './pages/Beranda.jsx'
import Panduan  from './pages/Panduan.jsx'
import Simulasi from './pages/Simulasi.jsx'
import Hasil    from './pages/Hasil.jsx'

export default function App() {
  return (
    <div className="min-h-screen flex flex-col" style={{ fontFamily: "'Source Sans 3', sans-serif" }}>
      <LogoBar />
      <Navbar />
      <main className="flex-1">
        <Routes>
          <Route path="/"         element={<Beranda />} />
          <Route path="/panduan"  element={<Panduan />} />
          <Route path="/simulasi" element={<Simulasi />} />
          <Route path="/hasil"    element={<Hasil />} />
          <Route path="*"         element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  )
}
