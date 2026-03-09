import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet'
import axios from 'axios'
import 'leaflet/dist/leaflet.css'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const WARNA_POTENSI = {
  'Sangat Rendah': '#1a9641',
  'Rendah':        '#a6d96a',
  'Sedang':        '#ffffbf',
  'Tinggi':        '#fdae61',
  'Sangat Tinggi': '#d7191c',
}

const INTERVAL_POTENSI = {
  'Sangat Rendah': '< 20%',
  'Rendah':        '20% – 40%',
  'Sedang':        '40% – 60%',
  'Tinggi':        '60% – 80%',
  'Sangat Tinggi': '≥ 80%',
}

export default function Hasil() {
  const navigate    = useNavigate()
  const [data,      setData]      = useState(null)
  const [unduhLoad, setUnduhLoad] = useState(false)

  useEffect(() => {
    const raw = sessionStorage.getItem('hasil_simulasi')
    if (raw) {
      try { setData(JSON.parse(raw)) } catch {}
    }
  }, [])

  // Belum ada data — halaman terkunci
  if (!data) return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4 bg-gray-50">
      <div
        className="rounded-xl p-8 text-center shadow-sm border border-gray-100 bg-white max-w-sm"
      >
        <p className="text-2xl mb-3">🔒</p>
        <p className="font-bold text-gray-800 mb-1">Hasil Belum Tersedia</p>
        <p className="text-sm text-gray-500 mb-5">
          Jalankan simulasi terlebih dahulu dari halaman Simulasi.
        </p>
        <button
          onClick={() => navigate('/simulasi')}
          className="px-6 py-2 rounded-lg text-white text-sm font-semibold"
          style={{ background: '#1a3a2a' }}
        >
          Ke Halaman Simulasi
        </button>
      </div>
    </div>
  )

  const { kecamatan, curah_hujan, sektor = [], ringkasan = {}, simulasi_id } = data
  const kecTitle = kecamatan.charAt(0) + kecamatan.slice(1).toLowerCase()

  // GeoJSON untuk peta hasil
  const geoHasil = {
    type: 'FeatureCollection',
    features: sektor
      .filter(s => s.geometry)
      .map(s => ({
        type: 'Feature',
        geometry: s.geometry,
        properties: {
          id:    s.id_sektor,
          label: s.label_potensi,
          pct:   s.prediksi_pct,
          warna: s.warna,
          tanah: s.jenis_tanah,
          veg:   s.vegetasi,
        },
      }))
  }

  const styleSektor = useCallback((feat) => ({
    fillColor:   feat.properties?.warna || '#cccccc',
    fillOpacity: 0.80,
    color:       '#333333',
    weight:      0.8,
  }), [])

  const onEachSektor = useCallback((feat, layer) => {
    const p = feat.properties
    layer.bindTooltip(
      `<strong>${p.id}</strong><br/>
       ${p.label} — ${p.pct}%<br/>
       Tanah: ${p.tanah}<br/>
       Vegetasi: ${p.veg}`,
      { sticky: true, className: 'text-xs' }
    )
  }, [])

  const unduh = async () => {
    if (!simulasi_id) return
    setUnduhLoad(true)
    try {
      const r = await axios.get(`${API}/api/hasil/unduh/xlsx/${simulasi_id}`, {
        responseType: 'blob'
      })
      const url  = URL.createObjectURL(r.data)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `Simulasi_Longsor_${kecTitle}_${new Date().toISOString().slice(0, 10)}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      alert('Gagal mengunduh file. Coba beberapa saat lagi.')
    } finally {
      setUnduhLoad(false)
    }
  }

  const tinggiLayar = 'calc(100vh - 88px)'

  return (
    <div className="flex overflow-hidden" style={{ height: tinggiLayar }}>

      {/* ══ KIRI/TENGAH: Peta arsiran Leaflet ══ */}
      <div className="flex-1 relative">
        <MapContainer center={[-7.15, 110.45]} zoom={11} className="w-full h-full">
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="© OpenStreetMap contributors"
          />
          {geoHasil.features.length > 0 && (
            <GeoJSON
              data={geoHasil}
              style={styleSektor}
              onEachFeature={onEachSektor}
            />
          )}
        </MapContainer>

        {/* Legenda potensi — di pojok kiri bawah peta, tidak transparan */}
        <div
          className="absolute bottom-4 left-4 z-20 legenda-panel"
          style={{ minWidth: '180px' }}
        >
          <p className="text-xs font-bold text-gray-700 mb-2">Tingkat Potensi Longsor</p>
          {Object.entries(WARNA_POTENSI).map(([lbl, warna]) => (
            <div key={lbl} className="flex items-center gap-2 mb-1">
              <div
                className="w-5 h-4 rounded-sm border border-gray-300 flex-shrink-0"
                style={{ background: warna }}
              />
              <span className="text-xs text-gray-700">
                {lbl}
                <span className="text-gray-400 ml-1">{INTERVAL_POTENSI[lbl]}</span>
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ══ KANAN: Panel hasil statis ══ */}
      <div
        className="w-80 flex-shrink-0 overflow-y-auto border-l border-gray-200 shadow-lg bg-white"
        style={{ height: tinggiLayar }}
      >
        <div className="p-4 space-y-4">

          {/* Ringkasan */}
          <div
            className="rounded-lg p-3 border"
            style={{ background: '#f0fdf4', borderColor: '#86efac' }}
          >
            <p className="text-xs font-bold uppercase tracking-wide text-green-800 mb-2">
              Hasil Simulasi
            </p>
            <p className="font-bold text-base" style={{ color: '#1a3a2a' }}>{kecTitle}</p>
            <p className="text-xs text-gray-500">
              Curah Hujan: <strong>{curah_hujan} mm</strong>
            </p>
            <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
              <div className="bg-white rounded p-2 text-center border border-gray-100">
                <div className="font-bold text-lg" style={{ color: '#2d6a4f' }}>
                  {ringkasan.total_sektor}
                </div>
                <div className="text-gray-500">Total Sektor</div>
              </div>
              <div className="bg-white rounded p-2 text-center border border-gray-100">
                <div
                  className="font-bold text-lg"
                  style={{
                    color: WARNA_POTENSI[ringkasan.label_dominan] === '#ffffbf'
                      ? '#b8b800' : (WARNA_POTENSI[ringkasan.label_dominan] || '#666')
                  }}
                >
                  {ringkasan.rerata_potensi}%
                </div>
                <div className="text-gray-500">Rerata Potensi</div>
              </div>
            </div>
            <div className="mt-2 text-center">
              <span
                className="text-xs px-3 py-1 rounded-full font-semibold text-white"
                style={{
                  background: WARNA_POTENSI[ringkasan.label_dominan] === '#ffffbf'
                    ? '#b8b800' : (WARNA_POTENSI[ringkasan.label_dominan] || '#888')
                }}
              >
                Dominan: {ringkasan.label_dominan}
              </span>
            </div>
          </div>

          {/* Sebaran per label — legenda ada di sini, bukan di Panduan */}
          <div className="legenda-panel">
            <p className="text-xs font-bold text-gray-700 mb-2">Sebaran Tingkat Potensi</p>
            {Object.entries(ringkasan.per_label || {}).map(([lbl, info]) => (
              <div key={lbl} className="flex items-center gap-2 mb-1">
                <div
                  className="w-4 h-3 rounded-sm border border-gray-300 flex-shrink-0"
                  style={{ background: WARNA_POTENSI[lbl] }}
                />
                <span className="text-xs text-gray-700 flex-1">{lbl}</span>
                <span className="text-xs font-bold text-gray-600">
                  {info.jumlah_sektor} sektor
                </span>
              </div>
            ))}
          </div>

          {/* Tabel sektor — diurutkan dari potensi tertinggi */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-2">
              Detail per Sektor
            </p>
            <div className="space-y-1.5 max-h-72 overflow-y-auto">
              {[...sektor]
                .sort((a, b) => b.prediksi_pct - a.prediksi_pct)
                .map((s, i) => {
                  const warnaTeks = s.warna === '#ffffbf' ? '#b8b800' : s.warna
                  return (
                    <div
                      key={i}
                      className="rounded-lg p-2 border text-xs"
                      style={{ borderLeft: `4px solid ${s.warna}`, background: '#fafafa' }}
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-gray-800 truncate">
                          {s.id_sektor}
                        </span>
                        <span className="font-bold ml-1" style={{ color: warnaTeks }}>
                          {s.prediksi_pct}%
                        </span>
                      </div>
                      <div className="text-gray-500 truncate">{s.jenis_tanah}</div>
                      <div className="text-gray-500 truncate">{s.vegetasi}</div>
                      <div className="text-gray-400">Luas: {s.luas_ha} Ha</div>
                      <div className="mt-0.5">
                        <span
                          className="px-1.5 py-0.5 rounded text-white text-xs font-semibold"
                          style={{ background: warnaTeks }}
                        >
                          {s.label_potensi}
                        </span>
                      </div>
                    </div>
                  )
                })}
            </div>
          </div>

          {/* Unduh XLSX */}
          {simulasi_id && (
            <button
              onClick={unduh}
              disabled={unduhLoad}
              className="w-full py-2.5 rounded-xl font-bold text-sm transition-all border-2"
              style={{ borderColor: '#1a3a2a', color: '#1a3a2a', background: 'white' }}
            >
              {unduhLoad ? '⏳ Mengunduh…' : '⬇ Unduh Hasil Simulasi (.xlsx)'}
            </button>
          )}

          {/* Simulasi baru */}
          <button
            onClick={() => navigate('/simulasi')}
            className="w-full py-2 rounded-xl font-semibold text-sm text-white"
            style={{ background: '#1a3a2a' }}
          >
            ← Simulasi Baru
          </button>
        </div>
      </div>
    </div>
  )
}
