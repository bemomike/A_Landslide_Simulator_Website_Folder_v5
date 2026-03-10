import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet'
import L from 'leaflet'
import axios from 'axios'
import 'leaflet/dist/leaflet.css'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const KEC_LIST = [
  'GETASAN','TENGARAN','SUSUKAN','SURUH','PABELAN',
  'TUNTANG','BANYUBIRU','JAMBU','SUMOWONO','AMBARAWA',
  'BAWEN','BRINGIN','BANCAK','PRINGAPUS','BERGAS',
  'UNGARAN BARAT','UNGARAN TIMUR','BANDUNGAN','KALIWUNGU',
]

// Warna unik tiap kecamatan — konsisten dengan Sel 1A RF (tab20)
const WARNA_KEC = [
  '#1f77b4','#ff7f0e','#2ca02c','#d62728','#9467bd',
  '#8c564b','#e377c2','#7f7f7f','#bcbd22','#17becf',
  '#aec7e8','#ffbb78','#98df8a','#ff9896','#c5b0d5',
  '#c49c94','#f7b6d2','#c7c7c7','#dbdb8d','#9edae5',
]

const warnaBorderPohon = '#2d6a4f'
const warnaBorderTanah = '#8B4513'

function FitBounds({ geo }) {
  const map = useMap()
  useEffect(() => {
    if (!geo) return
    try {
      const layer = L.geoJSON(geo)
      if (layer.getBounds().isValid())
        map.fitBounds(layer.getBounds(), { padding: [40, 40] })
    } catch {}
  }, [geo, map])
  return null
}

export default function Simulasi() {
  const navigate = useNavigate()

  const [kec,        setKec]        = useState('')
  const [curahHujan, setCurahHujan] = useState(1500)
  const [infoMode,   setInfoMode]   = useState(null)   // 'pohon' | 'tanah' | null
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState('')

  const [geoKec,      setGeoKec]      = useState(null)
  const [geoVegetasi, setGeoVegetasi] = useState(null)
  const [geoTanah,    setGeoTanah]    = useState(null)
  const [geoSektor,   setGeoSektor]   = useState(null)
  const [infoLereng,  setInfoLereng]  = useState(null)

  // Muat batas kecamatan sekali saat mount
  useEffect(() => {
    axios.get(`${API}/api/geojson/kecamatan`).then(r => setGeoKec(r.data)).catch(() => {})
  }, [])

  // Muat data saat kecamatan dipilih
  useEffect(() => {
    if (!kec) {
      setGeoVegetasi(null); setGeoTanah(null)
      setGeoSektor(null);   setInfoLereng(null)
      setInfoMode(null);    return
    }
    // Vegetasi
    axios.get(`${API}/api/geojson/vegetasi/${kec}`)
      .then(r => setGeoVegetasi(r.data)).catch(() => setGeoVegetasi(null))
    // Tanah
    axios.get(`${API}/api/geojson/tanah/${kec}`)
      .then(r => setGeoTanah(r.data)).catch(() => setGeoTanah(null))
    // Sektor (untuk info lereng)
    axios.get(`${API}/api/geojson/sektor/${kec}`)
      .then(r => {
        setGeoSektor(r.data)
        const p = r.data?.features?.[0]?.properties
        if (p) setInfoLereng({
          skor:     p.SKOR_LERENG,
          gridcode: p.GRIDCODE_LERENG,
          kelas: (() => {
            const g = Number(p.GRIDCODE_LERENG)
            if (g === 1) return 'Datar (0–8%)'
            if (g === 2) return 'Landai (8–15%)'
            if (g === 3) return 'Agak Curam (15–25%)'
            if (g === 4) return 'Curam (25–45%)'
            return 'Sangat Curam (>45%)'
          })()
        })
      }).catch(() => { setGeoSektor(null); setInfoLereng(null) })
  }, [kec])

  // Style batas kecamatan — warna berbeda tiap kecamatan, transparan
  const styleKec = useCallback((feat) => {
    const nama    = feat?.properties?.NAME_3?.toUpperCase()
    const i       = KEC_LIST.indexOf(nama)
    const warna   = i >= 0 ? WARNA_KEC[i] : '#888888'
    const dipilih = nama === kec
    return {
      fillColor:   warna,
      fillOpacity: dipilih ? 0.30 : 0.08,
      color:       dipilih ? '#1a3a2a' : '#555555',
      weight:      dipilih ? 2.5 : 1.0,
    }
  }, [kec])

  const onEachKec = useCallback((feat, layer) => {
    const nama = feat?.properties?.NAME_3 || ''
    // Tooltip nama kecamatan muncul saat kursor di atasnya
    layer.bindTooltip(
      `<strong>${nama.charAt(0) + nama.slice(1).toLowerCase()}</strong>`,
      { sticky: true, className: 'text-xs' }
    )
    layer.on('mouseover', () => layer.setStyle({ fillOpacity: 0.35 }))
    layer.on('mouseout',  () => layer.setStyle(styleKec(feat)))
    layer.on('click',     () => { setKec(nama.toUpperCase()); setInfoMode(null) })
  }, [styleKec])

  // Style layer vegetasi
  const styleVeg = useCallback(() => ({
    fillColor: '#52b788', fillOpacity: 0.70, color: '#1b4332', weight: 0.7,
  }), [])

  // Style layer tanah
  const WARNA_TANAH_MAP = {
    'Latosol': '#8B4513', 'Andosol': '#D2691E', 'Regosol': '#DEB887',
    'Grumusol': '#A0522D', 'Alluvial': '#CD853F', 'Mediteran': '#B8860B',
  }
  const styleTanah = useCallback((feat) => {
    const jt    = feat?.properties?.MACAM_TANA || ''
    const warna = Object.entries(WARNA_TANAH_MAP).find(([k]) => jt.includes(k))?.[1] || '#8B5E3C'
    return { fillColor: warna, fillOpacity: 0.70, color: '#5c3d11', weight: 0.7 }
  }, [])

  // Legenda pohon dari GeoJSON
  const legendaPohon = geoVegetasi?.features
    ? [...new Set(geoVegetasi.features.map(f =>
        f.properties?.LABEL_VEG || f.properties?.REMARK || f.properties?.NAMOBJ || '-'
      ))].filter(Boolean).slice(0, 12)
    : []

  // Legenda tanah dari GeoJSON
  const legendaTanah = geoTanah?.features
    ? [...new Set(geoTanah.features.map(f => f.properties?.MACAM_TANA || '-'))].filter(Boolean)
    : []

  const handleSimulasi = async () => {
    if (!kec) { setError('Pilih kecamatan terlebih dahulu.'); return }
    setError(''); setLoading(true)
    try {
      const r = await axios.post(`${API}/api/simulasi/jalankan`, {
        kecamatan: kec, curah_hujan: curahHujan,
      })
      sessionStorage.clear()
      sessionStorage.setItem('hasil_simulasi', JSON.stringify(r.data))
      // Beri waktu browser menyimpan sebelum navigate
      await new Promise(res => setTimeout(res, 150))
      navigate('/hasil', { replace: true })
    } catch (e) {
      const msg = e?.response?.data?.detail || 'Gagal menghubungi server. Periksa koneksi.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const tinggiLayar = 'calc(100vh - 88px)'

  return (
    <div className="flex overflow-hidden" style={{ height: tinggiLayar }}>

      {/* ══ KIRI: Daftar 19 kecamatan ══ */}
      <div
        className="w-48 flex-shrink-0 flex flex-col border-r border-gray-200 bg-white shadow-md"
        style={{ zIndex: 20 }}
      >
        <div className="px-3 py-2 border-b border-gray-100" style={{ background: '#1a3a2a' }}>
          <p className="text-xs font-bold text-green-200 uppercase tracking-wide">
            19 Kecamatan
          </p>
        </div>
        <div className="flex-1 overflow-y-auto py-1">
          {KEC_LIST.map((k, i) => {
            const dipilih = kec === k
            return (
              <button
                key={k}
                onClick={() => { setKec(k); setInfoMode(null) }}
                className="w-full text-left px-3 py-2 text-xs transition-colors hover:bg-green-50"
                style={{
                  borderLeft:  `4px solid ${dipilih ? WARNA_KEC[i] : 'transparent'}`,
                  background:  dipilih ? '#f0fdf4' : 'white',
                  fontWeight:  dipilih ? 700 : 400,
                  color:       dipilih ? '#1a3a2a' : '#374151',
                }}
              >
                {k.charAt(0) + k.slice(1).toLowerCase()}
              </button>
            )
          })}
        </div>
      </div>

      {/* ══ TENGAH: Peta Leaflet ══ */}
      <div className="flex-1 relative">
        <MapContainer
          center={[-7.15, 110.45]}
          zoom={10}
          className="w-full h-full"
          zoomControl
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="© OpenStreetMap contributors"
          />

          {/* Batas kecamatan selalu tampil — warna berbeda, transparan */}
          {geoKec && (
            <GeoJSON
              key={`kec-${kec}`}
              data={geoKec}
              style={styleKec}
              onEachFeature={onEachKec}
            />
          )}

          {/* Layer vegetasi — muncul saat tombol Pohon aktif */}
          {infoMode === 'pohon' && geoVegetasi && (
            <GeoJSON key="veg" data={geoVegetasi} style={styleVeg} />
          )}

          {/* Layer tanah — muncul saat tombol Tanah aktif */}
          {infoMode === 'tanah' && geoTanah && (
            <GeoJSON key="tanah" data={geoTanah} style={styleTanah} />
          )}

          {/* Zoom otomatis ke kecamatan terpilih */}
          {geoSektor && <FitBounds geo={geoSektor} />}
        </MapContainer>
      </div>

      {/* ══ KANAN: Panel statis — urutan dari atas ke bawah sesuai ajuan ══ */}
      <div
        className="panel-simulasi-kanan w-72 flex-shrink-0 border-l border-gray-200 shadow-lg"
        style={{ height: tinggiLayar }}
      >
        <div className="p-4 space-y-3">

          {/* 1. Tombol Informasi Sebaran Jenis Pohon */}
          <button
            className="btn-toggle"
            disabled={!kec}
            onClick={() => setInfoMode(m => m === 'pohon' ? null : 'pohon')}
            style={{
              background:   infoMode === 'pohon' ? warnaBorderPohon : 'white',
              color:        infoMode === 'pohon' ? 'white' : warnaBorderPohon,
              borderColor:  warnaBorderPohon,
              opacity:      kec ? 1 : 0.4,
              cursor:       kec ? 'pointer' : 'not-allowed',
            }}
          >
            {infoMode === 'pohon' ? '▼ ' : '▶ '}Informasi Sebaran Jenis Pohon
          </button>

          {/* 2. Legenda Sebaran Jenis Pohon */}
          {kec && (
            <div className="legenda-panel">
              <p className="text-xs font-bold text-gray-700 mb-2">Sebaran Jenis Pohon / Vegetasi</p>
              {legendaPohon.length > 0 ? (
                <div className="space-y-1 max-h-28 overflow-y-auto">
                  {legendaPohon.map((item, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="w-4 h-3 rounded-sm border border-gray-200 flex-shrink-0"
                           style={{ background: '#52b788' }} />
                      <span className="text-xs text-gray-700 truncate">{item}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-400 italic">Memuat data vegetasi…</p>
              )}
            </div>
          )}

          {/* 3. Tombol Informasi Sebaran Jenis Tanah */}
          <button
            className="btn-toggle"
            disabled={!kec}
            onClick={() => setInfoMode(m => m === 'tanah' ? null : 'tanah')}
            style={{
              background:  infoMode === 'tanah' ? warnaBorderTanah : 'white',
              color:       infoMode === 'tanah' ? 'white' : warnaBorderTanah,
              borderColor: warnaBorderTanah,
              opacity:     kec ? 1 : 0.4,
              cursor:      kec ? 'pointer' : 'not-allowed',
            }}
          >
            {infoMode === 'tanah' ? '▼ ' : '▶ '}Informasi Sebaran Jenis Tanah
          </button>

          {/* 4. Legenda Sebaran Jenis Tanah */}
          {kec && (
            <div className="legenda-panel">
              <p className="text-xs font-bold text-gray-700 mb-2">Sebaran Jenis Tanah</p>
              {legendaTanah.length > 0 ? (
                <div className="space-y-1 max-h-28 overflow-y-auto">
                  {legendaTanah.map((item, i) => {
                    const w = Object.entries(WARNA_TANAH_MAP).find(([k]) => item.includes(k))?.[1] || '#8B5E3C'
                    return (
                      <div key={i} className="flex items-center gap-2">
                        <div className="w-4 h-3 rounded-sm border border-gray-200 flex-shrink-0"
                             style={{ background: w }} />
                        <span className="text-xs text-gray-700 truncate">{item}</span>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-xs text-gray-400 italic">Memuat data tanah…</p>
              )}
            </div>
          )}

          {/* 5. Legenda Kemiringan Lereng */}
          {kec && (
            <div className="legenda-panel">
              <p className="text-xs font-bold text-blue-800 mb-2">Kemiringan Lereng</p>
              {infoLereng ? (
                <div className="text-xs text-gray-700 space-y-0.5">
                  <p>Kelas: <strong>{infoLereng.kelas}</strong></p>
                  <p>Skor lereng: <strong>{infoLereng.skor ?? '–'}</strong></p>
                  <p>Kode gridcode: <strong>{infoLereng.gridcode ?? '–'}</strong></p>
                </div>
              ) : (
                <p className="text-xs text-gray-400 italic">Memuat data lereng…</p>
              )}
            </div>
          )}

          {/* 6. Nama kecamatan terpilih */}
          <div
            className="rounded-lg p-3 border text-center"
            style={{ background: '#f0fdf4', borderColor: '#86efac' }}
          >
            <p className="text-xs text-gray-500 mb-0.5">Kecamatan Terpilih</p>
            <p
              className="font-bold text-base"
              style={{ color: kec ? '#1a3a2a' : '#9ca3af' }}
            >
              {kec
                ? kec.charAt(0) + kec.slice(1).toLowerCase()
                : '— Pilih di peta atau daftar kiri —'}
            </p>
          </div>

          {/* 7. Slider curah hujan */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-bold text-gray-600 uppercase tracking-wide">
                Intensitas Curah Hujan
              </p>
              <span className="text-sm font-bold" style={{ color: '#1a3a2a' }}>
                {curahHujan} mm
              </span>
            </div>
            <input
              type="range"
              min={0} max={5000} step={50}
              value={curahHujan}
              onChange={e => setCurahHujan(Number(e.target.value))}
              className="w-full"
              style={{ accentColor: '#2d6a4f' }}
            />
            <div className="flex justify-between text-xs text-gray-400 mt-0.5">
              <span>0 mm</span>
              <span>5000 mm</span>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div
              className="text-xs rounded-lg p-2 border"
              style={{ color: '#7f1d1d', background: '#fef2f2', borderColor: '#fca5a5' }}
            >
              {error}
            </div>
          )}

          {/* 8. Tombol Mulai Simulasi */}
          <button
            onClick={handleSimulasi}
            disabled={loading || !kec}
            className="w-full py-3 rounded-xl font-bold text-sm transition-all shadow-md"
            style={{
              background: loading || !kec ? '#e5e7eb' : '#1a3a2a',
              color:      loading || !kec ? '#9ca3af' : 'white',
              cursor:     loading || !kec ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? '⏳ Memproses…' : 'Mulai Simulasi'}
          </button>

          {!kec && (
            <p className="text-xs text-gray-400 text-center italic">
              Klik kecamatan di peta atau dari daftar kiri untuk memulai
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
