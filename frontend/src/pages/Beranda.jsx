import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'

// Gambar slideshow — letakkan di frontend/public/assets/images/
const SLIDES = [
  '/assets/images/longsor_kab_smg.jpeg',
  '/assets/images/longsor_kab_smg2.jpeg',
]

export default function Beranda() {
  const [idx, setIdx] = useState(0)

  useEffect(() => {
    const t = setInterval(() => setIdx(i => (i + 1) % SLIDES.length), 6000)
    return () => clearInterval(t)
  }, [])

  return (
    <div className="flex flex-col min-h-screen bg-white">

      {/* ── Slideshow hero ── */}
      <section
        className="relative flex items-center justify-center overflow-hidden"
        style={{ minHeight: 'calc(100vh - 88px)' }}
      >
        {/* Lapisan gambar slideshow */}
        {SLIDES.map((src, i) => (
          <div
            key={src}
            className="absolute inset-0 bg-cover bg-center transition-opacity duration-1000"
            style={{
              backgroundImage: `url(${src})`,
              opacity: i === idx ? 1 : 0,
            }}
          />
        ))}

        {/* Overlay gelap */}
        <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.52)' }} />

        {/* Konten overlay — sesuai ajuan skrip */}
        <div className="relative z-10 text-center text-white px-6 max-w-2xl mx-auto">
          <p
            className="text-xs uppercase tracking-widest mb-4"
            style={{ color: '#86efac' }}
          >
            Universitas Kristen Satya Wacana &nbsp;·&nbsp; Fakultas Sains dan Matematika
          </p>

          <h1
            className="font-bold leading-tight mb-3"
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: '2.8rem',
            }}
          >
            Simulasi Prediksi<br />
            <span style={{ color: '#fde047' }}>Potensi Longsor</span>
          </h1>

          <p className="text-lg text-gray-200 mb-1">
            Kabupaten Semarang, Jawa Tengah
          </p>

          <p className="text-sm text-gray-300 mb-8 max-w-lg mx-auto leading-relaxed">
            Sistem prediksi berbasis <strong className="text-white">Random Forest</strong> yang
            memperkirakan tingkat potensi longsor per sektor wilayah berdasarkan kondisi
            jenis tanah, tutupan vegetasi, kemiringan lereng, dan intensitas curah hujan.
          </p>

          <div className="flex gap-4 justify-center flex-wrap">
            <Link
              to="/simulasi"
              className="font-bold px-8 py-3 rounded-lg shadow-lg transition-colors"
              style={{ background: '#fde047', color: '#1a3a2a' }}
            >
              Mulai Simulasi
            </Link>
            <Link
              to="/panduan"
              className="font-bold px-8 py-3 rounded-lg border-2 border-white text-white
                         transition-colors hover:bg-white hover:bg-opacity-10"
            >
              Baca Panduan
            </Link>
          </div>
        </div>

        {/* Indikator slide */}
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex gap-2 z-10">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => setIdx(i)}
              className="w-2.5 h-2.5 rounded-full transition-colors"
              style={{ background: i === idx ? '#fde047' : 'rgba(255,255,255,0.4)' }}
            />
          ))}
        </div>
      </section>

      <footer
        className="text-center text-xs py-4"
        style={{ background: '#1a3a2a', color: '#86efac' }}
      >
        © 2025 Fakultas Sains dan Matematika — Universitas Kristen Satya Wacana
      </footer>
    </div>
  )
}
