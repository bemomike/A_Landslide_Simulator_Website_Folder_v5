import { useEffect, useState, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet'
import axios from 'axios'
import 'leaflet/dist/leaflet.css'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const WARNA = {
  'Sangat Rendah': '#1a9641',
  'Rendah':        '#a6d96a',
  'Sedang':        '#ffffbf',
  'Tinggi':        '#fdae61',
  'Sangat Tinggi': '#d7191c',
}
const INTERVAL = {
  'Sangat Rendah': '< 20%',
  'Rendah':        '20% – 40%',
  'Sedang':        '40% – 60%',
  'Tinggi':        '60% – 80%',
  'Sangat Tinggi': '≥ 80%',
}

// Warna teks aman (kuning perlu digelapkan agar terbaca)
function warnaTeks(hex) {
  return hex === '#ffffbf' ? '#857f00' : hex
}

export default function Hasil() {
  const navigate = useNavigate()
  const [data,      setData]      = useState(null)
  const [loading,   setLoading]   = useState(true)
  const [unduhLoad, setUnduhLoad] = useState(false)

  useEffect(() => {
    // 1. Coba sessionStorage
    const raw = sessionStorage.getItem('hasil_simulasi')
    if (raw) {
      try {
        const parsed = JSON.parse(raw)
        if (parsed?.kecamatan) { setData(parsed); setLoading(false); return }
      } catch {}
    }
    // 2. Fallback: ambil hasil terakhir dari Railway
    fetch(`${API}/api/hasil/terakhir`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.kecamatan) setData(d) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  // ── Halaman terkunci ────────────────────────────────────────────────────
  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <p className="text-gray-400 text-sm animate-pulse">Memuat hasil simulasi…</p>
    </div>
  )

  if (!data) return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4 bg-gray-50">
      <div className="rounded-xl p-8 text-center shadow border border-gray-100 bg-white max-w-sm">
        <p className="text-3xl mb-3">🔒</p>
        <p className="font-bold text-gray-800 mb-1">Hasil Belum Tersedia</p>
        <p className="text-sm text-gray-500 mb-5">
          Jalankan simulasi terlebih dahulu dari halaman Simulasi.
        </p>
        <button
          onClick={() => navigate('/simulasi')}
          className="px-6 py-2 rounded-lg text-white text-sm font-semibold"
          style={{ background: '#2d5a27' }}
        >
          Ke Halaman Simulasi
        </button>
      </div>
    </div>
  )

  const {
    id: simulasi_id,
    kecamatan,
    curah_hujan,
    tanggal,
    sektor    = [],
    ringkasan = {}
  } = data

  const kecTitle    = kecamatan.charAt(0).toUpperCase() + kecamatan.slice(1).toLowerCase()
  const tglFmt      = tanggal ? new Date(tanggal).toLocaleDateString('id-ID',
                        { day:'2-digit', month:'long', year:'numeric' }) : '—'
  const sektorTinggi = sektor.filter(s => (s.prediksi_pct || 0) >= 60).length

  // ── GeoJSON (useMemo agar tidak re-render terus) ─────────────────────────
  const geoData = useMemo(() => ({
    type: 'FeatureCollection',
    features: sektor.filter(s => s.geometry).map(s => ({
      type: 'Feature',
      geometry: s.geometry,
      properties: {
        id:    s.id_sektor,
        label: s.label_potensi,
        pct:   s.prediksi_pct,
        warna: s.warna,
        tanah: s.jenis_tanah,
        veg:   s.vegetasi,
        luas:  s.luas_ha,
        ch:    s.curah_hujan,
      }
    }))
  }), [sektor])

  const styleSektor = useCallback((feat) => ({
    fillColor:   feat.properties?.warna || '#cccccc',
    fillOpacity: 0.80,
    color:       '#333',
    weight:      0.8,
  }), [])

  const onEachSektor = useCallback((feat, layer) => {
    const p = feat.properties
    layer.bindTooltip(
      `<strong>${p.id}</strong><br/>
       ${p.label} — ${p.pct}%<br/>
       Tanah: ${p.tanah}<br/>
       Vegetasi: ${p.veg}`,
      { sticky: true }
    )
  }, [])

  const unduh = async () => {
    if (!simulasi_id) return
    setUnduhLoad(true)
    try {
      const r = await axios.get(`${API}/api/hasil/unduh/xlsx/${simulasi_id}`, {
        responseType: 'blob'
      })
      const url = URL.createObjectURL(r.data)
      const a   = document.createElement('a')
      a.href     = url
      a.download = `Simulasi_Longsor_${kecTitle}_${tanggal?.slice(0,10) || 'hasil'}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      alert('Gagal mengunduh file. Coba beberapa saat lagi.')
    } finally {
      setUnduhLoad(false)
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-white">

      {/* ══ HEADER JUDUL + TOMBOL UNDUH ══ */}
      <div className="px-6 py-5 flex items-start justify-between gap-4"
           style={{ background: '#4a7c3f' }}>
        <div>
          <p className="text-white text-xs font-semibold uppercase tracking-widest mb-1 opacity-75">
            Hasil Simulasi Prediksi Potensi Longsor
          </p>
          <h1 className="text-white font-bold text-xl leading-tight">
            Wilayah Kecamatan {kecTitle}
          </h1>
          <p className="text-white text-xs opacity-70 mt-1">
            Tanggal Simulasi: {tglFmt} &nbsp;|&nbsp; Curah Hujan Input: {curah_hujan} mm
          </p>
        </div>
        {simulasi_id && (
          <button
            onClick={unduh}
            disabled={unduhLoad}
            className="flex-shrink-0 px-5 py-2.5 rounded-lg font-bold text-sm border-2 border-white text-white
                       hover:bg-white transition-all"
            style={{ color: unduhLoad ? 'white' : 'white' }}
            onMouseEnter={e => { e.currentTarget.style.color='#2d5a27'; e.currentTarget.style.background='white' }}
            onMouseLeave={e => { e.currentTarget.style.color='white'; e.currentTarget.style.background='transparent' }}
          >
            {unduhLoad ? '⏳ Mengunduh…' : '⬇ Unduh Hasil Simulasi'}
          </button>
        )}
      </div>

      {/* ══ KONTEN UTAMA ══ */}
      <div className="px-6 py-4 max-w-6xl mx-auto space-y-6">

        {/* ── BARIS 1: Peta kecil + Ringkasan narasi + Legenda ── */}
        <div className="flex gap-5 items-start">

          {/* Peta kecamatan terpilih */}
          <div className="flex-shrink-0 rounded-lg overflow-hidden border border-gray-200 shadow-sm"
               style={{ width: '280px', height: '240px' }}>
            <MapContainer
              center={[-7.15, 110.45]}
              zoom={11}
              className="w-full h-full"
              key={kecamatan}
              zoomControl={true}
              scrollWheelZoom={false}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution="© OpenStreetMap"
              />
              {geoData.features.length > 0 && (
                <GeoJSON
                  key={`geo-${simulasi_id}`}
                  data={geoData}
                  style={styleSektor}
                  onEachFeature={onEachSektor}
                />
              )}
            </MapContainer>
          </div>

          {/* Ringkasan narasi + legenda */}
          <div className="flex-1 space-y-3">

            {/* Narasi ringkasan */}
            <div className="rounded-lg p-4 text-sm leading-relaxed text-gray-700 border border-gray-200"
                 style={{ background: '#f8fdf6' }}>
              <span className="font-bold" style={{ color: '#2d5a27' }}>
                Kecamatan {kecTitle}
              </span>{' '}
              memiliki rerata potensi longsor sebesar{' '}
              <span className="font-bold">{ringkasan.rerata_potensi}%</span>
              {' '}dengan label potensi dominan{' '}
              <span className="font-bold"
                    style={{ color: warnaTeks(WARNA[ringkasan.label_dominan] || '#666') }}>
                {ringkasan.label_dominan}
              </span>.
              {' '}Total {ringkasan.total_sektor} sektor dianalisis,
              dengan {sektorTinggi} sektor berpotensi tinggi–sangat tinggi (≥ 60%).
            </div>

            {/* Kotak legenda 5 tingkat */}
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-2">
                Tingkat Potensi Longsor
              </p>
              <div className="flex gap-2 flex-wrap">
                {Object.entries(WARNA).map(([lbl, warna]) => (
                  <div key={lbl} className="flex flex-col items-center gap-1">
                    <div
                      className="rounded border border-gray-300 flex items-center justify-center
                                 font-bold text-xs px-2 py-2 min-w-16 text-center"
                      style={{ background: warna, color: warnaTeks(warna), minWidth: '90px' }}
                    >
                      {INTERVAL[lbl]}
                    </div>
                    <span className="text-xs text-gray-600 text-center">{lbl}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Baris interval teks */}
            <p className="text-xs text-gray-400 border-t pt-2">
              Interval: Sangat Rendah &lt;20% &nbsp;|&nbsp; Rendah 20–40% &nbsp;|&nbsp;
              Sedang 40–60% &nbsp;|&nbsp; Tinggi 60–80% &nbsp;|&nbsp; Sangat Tinggi ≥80%
            </p>
          </div>
        </div>

        {/* ══ TABEL SEKTOR ══ */}
        <div>
          <p className="text-sm font-bold uppercase tracking-wide mb-2"
             style={{ color: '#2d5a27' }}>
            Detail Prediksi per Sektor — Kecamatan {kecTitle}
          </p>

          <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr style={{ background: '#2d5a27', color: 'white' }}>
                  {['ID Sektor', 'Jenis Tanah', 'Pohon / Vegetasi',
                    'Luas (Ha)', 'Curah Hujan (mm)', 'Potensi (%)', 'Label Potensi']
                    .map(h => (
                      <th key={h} className="px-3 py-2.5 text-left font-semibold
                                             border border-green-900 whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                </tr>
              </thead>
              <tbody>
                {[...sektor]
                  .sort((a, b) => b.prediksi_pct - a.prediksi_pct)
                  .map((s, i) => {
                    const wBg  = s.warna || '#eee'
                    const wTxt = warnaTeks(wBg)
                    return (
                      <tr key={i}
                          className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                          style={{ borderBottom: '1px solid #e5e7eb' }}>
                        <td className="px-3 py-2 font-semibold text-gray-800 whitespace-nowrap">
                          {s.id_sektor}
                        </td>
                        <td className="px-3 py-2 text-gray-700">{s.jenis_tanah}</td>
                        <td className="px-3 py-2 text-gray-700">{s.vegetasi}</td>
                        <td className="px-3 py-2 text-right text-gray-700">
                          {typeof s.luas_ha === 'number' ? s.luas_ha.toFixed(2) : s.luas_ha}
                        </td>
                        <td className="px-3 py-2 text-right text-gray-700">{s.curah_hujan}</td>
                        <td className="px-3 py-2 text-right font-bold"
                            style={{ color: wTxt }}>
                          {s.prediksi_pct}%
                        </td>
                        <td className="px-3 py-2">
                          <span className="px-2 py-0.5 rounded-full text-white text-xs font-semibold"
                                style={{ background: wTxt }}>
                            {s.label_potensi}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
              </tbody>
            </table>
          </div>

          {/* Footer tabel */}
          <div className="mt-2 flex gap-6 text-xs text-gray-500">
            <span>
              Rerata potensi: <strong>{ringkasan.rerata_potensi}%</strong>
            </span>
            <span>
              Sektor risiko tinggi (≥60%): <strong>{sektorTinggi} dari {ringkasan.total_sektor} sektor</strong>
            </span>
          </div>
        </div>

        {/* ══ TOMBOL BAWAH ══ */}
        <div className="flex gap-3 pb-6">
          <button
            onClick={() => navigate('/simulasi')}
            className="px-6 py-2.5 rounded-lg text-sm font-semibold border-2 transition-all"
            style={{ borderColor: '#2d5a27', color: '#2d5a27' }}
          >
            ← Simulasi Baru
          </button>
          {simulasi_id && (
            <button
              onClick={unduh}
              disabled={unduhLoad}
              className="px-6 py-2.5 rounded-lg text-sm font-semibold text-white transition-all"
              style={{ background: '#2d5a27' }}
            >
              {unduhLoad ? '⏳ Mengunduh…' : '⬇ Unduh Hasil (.xlsx)'}
            </button>
          )}
        </div>

      </div>
    </div>
  )
}
