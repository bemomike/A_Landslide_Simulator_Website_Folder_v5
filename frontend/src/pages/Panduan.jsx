import { useEffect, useState } from 'react'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export default function Panduan() {
  const [panduan, setPanduan] = useState([])

  useEffect(() => {
    axios.get(`${API}/api/panduan/`)
      .then(r => setPanduan(r.data.panduan || []))
      .catch(() => setPanduan([]))
  }, [])

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">

      {/* Header */}
      <div className="py-8 px-6 text-white" style={{ background: '#1a3a2a' }}>
        <div className="max-w-3xl mx-auto">
          <h1
            className="font-bold text-2xl"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Panduan Penggunaan
          </h1>
          <p className="text-green-200 mt-1 text-sm">
            Petunjuk lengkap penggunaan sistem simulasi prediksi potensi longsor.
          </p>
        </div>
      </div>

      {/* Konten */}
      <div className="max-w-3xl mx-auto px-6 py-8 space-y-4 flex-1 w-full">
        {panduan.map((p, i) => (
          <div
            key={p.id || i}
            className="bg-white rounded-xl shadow-sm p-6 border border-gray-100"
          >
            <h2
              className="font-bold text-base mb-2"
              style={{ color: '#1a3a2a', fontFamily: "'Playfair Display', serif" }}
            >
              {p.judul}
            </h2>
            <p className="text-gray-700 text-sm whitespace-pre-line leading-relaxed">
              {p.isi}
            </p>
          </div>
        ))}

        {panduan.length === 0 && (
          <p className="text-gray-400 text-sm text-center py-12">
            Memuat panduan…
          </p>
        )}
      </div>

      <footer
        className="text-center text-xs py-4"
        style={{ background: '#1a3a2a', color: '#86efac' }}
      >
        © 2025 Fakultas Sains dan Matematika — Universitas Kristen Satya Wacana
      </footer>
    </div>
  )
}
