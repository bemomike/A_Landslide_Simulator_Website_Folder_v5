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
  'Rendah':        '20% - 40%',
  'Sedang':        '40% - 60%',
  'Tinggi':        '60% - 80%',
  'Sangat Tinggi': '>= 80%',
}

function warnaTeks(hex) {
  return hex === '#ffffbf' ? '#857f00' : hex
}

export default function Hasil() {
  const navigate              = useNavigate()
  const [data,      setData]  = useState(null)
  const [loading,   setLoad]  = useState(true)
  const [unduhLoad, setUnduh] = useState(false)

  // =========================================================
  // SEMUA HOOKS WAJIB DI ATAS conditional return — Rules of Hooks
  // =========================================================
  const sektor = data?.sektor ?? []

  const geoData = useMemo(() => ({
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
          luas:  s.luas_ha,
          ch:    s.curah_hujan,
        }
      }))
  }), [sektor])

  const styleSektor = useCallback((feat) => ({
    fillColor:   feat.properties?.warna || '#ccc',
    fillOpacity: 0.80,
    color:       '#333',
    weight:      0.8,
  }), [])

  const onEachSektor = useCallback((feat, layer) => {
    const p = feat.properties
    layer.bindTooltip(
      `<strong>${p.id}</strong><br/>${p.label} - ${p.pct}%<br/>Tanah: ${p.tanah}<br/>Vegetasi: ${p.veg}`,
      { sticky: true }
    )
  }, [])

  useEffect(() => {
    const raw = sessionStorage.getItem('hasil_simulasi')
    if (raw) {
      try {
        const parsed = JSON.parse(raw)
        if (parsed?.kecamatan) { setData(parsed); setLoad(false); return }
      } catch {}
    }
    fetch(`${API}/api/hasil/terakhir`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.kecamatan) setData(d) })
      .catch(() => {})
      .finally(() => setLoad(false))
  }, [])

  // =========================================================
  // Setelah semua hooks — baru boleh conditional return
  // =========================================================

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'80vh' }}>
      <p style={{ color:'#888', fontSize:'14px' }}>Memuat hasil simulasi...</p>
    </div>
  )

  if (!data) return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center',
                  justifyContent:'center', minHeight:'80vh', gap:'16px' }}>
      <div style={{ background:'white', border:'1px solid #e5e7eb', borderRadius:'12px',
                    padding:'32px', textAlign:'center', maxWidth:'360px', boxShadow:'0 1px 3px rgba(0,0,0,0.1)' }}>
        <p style={{ fontSize:'32px', marginBottom:'12px' }}>🔒</p>
        <p style={{ fontWeight:'700', color:'#111', marginBottom:'6px' }}>Hasil Belum Tersedia</p>
        <p style={{ fontSize:'13px', color:'#666', marginBottom:'20px' }}>
          Jalankan simulasi terlebih dahulu dari halaman Simulasi.
        </p>
        <button
          onClick={() => navigate('/simulasi')}
          style={{ background:'#2d5a27', color:'white', border:'none', borderRadius:'8px',
                   padding:'8px 24px', fontWeight:'600', fontSize:'13px', cursor:'pointer' }}
        >
          Ke Halaman Simulasi
        </button>
      </div>
    </div>
  )

  const { id: sim_id, kecamatan, curah_hujan, tanggal, ringkasan = {} } = data
  const kecTitle     = kecamatan.charAt(0).toUpperCase() + kecamatan.slice(1).toLowerCase()
  const tglFmt       = tanggal
    ? new Date(tanggal).toLocaleDateString('id-ID', { day:'2-digit', month:'long', year:'numeric' })
    : '-'
  const sektorTinggi = sektor.filter(s => (s.prediksi_pct || 0) >= 60).length

  const unduh = async () => {
    if (!sim_id) return
    setUnduh(true)
    try {
      const r = await axios.get(`${API}/api/hasil/unduh/xlsx/${sim_id}`, { responseType:'blob' })
      const url = URL.createObjectURL(r.data)
      const a   = Object.assign(document.createElement('a'), {
        href:     url,
        download: `Simulasi_Longsor_${kecTitle}_${(tanggal||'').slice(0,10)}.xlsx`
      })
      a.click()
      URL.revokeObjectURL(url)
    } catch { alert('Gagal mengunduh. Coba beberapa saat lagi.') }
    finally { setUnduh(false) }
  }

  return (
    <div style={{ background:'#fff', minHeight:'100vh' }}>

      {/* HEADER */}
      <div style={{ background:'#4a7c3f', padding:'20px 24px',
                    display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:'16px' }}>
        <div>
          <p style={{ color:'rgba(255,255,255,0.75)', fontSize:'11px',
                      textTransform:'uppercase', letterSpacing:'2px', marginBottom:'4px' }}>
            Hasil Simulasi Prediksi Potensi Longsor
          </p>
          <h1 style={{ color:'white', fontWeight:'700', fontSize:'20px', margin:0, lineHeight:1.3 }}>
            Wilayah Kecamatan {kecTitle}
          </h1>
          <p style={{ color:'rgba(255,255,255,0.7)', fontSize:'12px', marginTop:'4px' }}>
            Tanggal: {tglFmt} &nbsp;|&nbsp; Curah Hujan Input: {curah_hujan} mm
          </p>
        </div>
        {sim_id && (
          <button onClick={unduh} disabled={unduhLoad}
            style={{ background:'white', color:'#2d5a27', border:'2px solid white',
                     borderRadius:'8px', padding:'8px 20px', fontWeight:'700',
                     fontSize:'13px', cursor:'pointer', whiteSpace:'nowrap', flexShrink:0 }}>
            {unduhLoad ? 'Mengunduh...' : 'Unduh Hasil Simulasi'}
          </button>
        )}
      </div>

      {/* KONTEN */}
      <div style={{ padding:'24px', maxWidth:'1100px', margin:'0 auto' }}>

        {/* BARIS 1: Peta + Ringkasan */}
        <div style={{ display:'flex', gap:'20px', marginBottom:'24px', alignItems:'flex-start' }}>

          {/* Peta kecil */}
          <div style={{ width:'280px', height:'240px', flexShrink:0,
                        border:'1px solid #ddd', borderRadius:'8px', overflow:'hidden' }}>
            <MapContainer center={[-7.15, 110.45]} zoom={11}
              style={{ width:'100%', height:'100%' }} key={kecamatan} scrollWheelZoom={false}>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                         attribution="OpenStreetMap" />
              {geoData.features.length > 0 && (
                <GeoJSON key={`geo-${sim_id}`} data={geoData}
                         style={styleSektor} onEachFeature={onEachSektor} />
              )}
            </MapContainer>
          </div>

          {/* Ringkasan + legenda */}
          <div style={{ flex:1 }}>
            <div style={{ background:'#f8fdf6', border:'1px solid #d4edda',
                          borderRadius:'8px', padding:'16px', fontSize:'14px',
                          color:'#374151', lineHeight:1.7, marginBottom:'16px' }}>
              <strong style={{ color:'#2d5a27' }}>Kecamatan {kecTitle}</strong> memiliki
              rerata potensi longsor sebesar <strong>{ringkasan.rerata_potensi}%</strong> dengan
              label potensi dominan{' '}
              <strong style={{ color: warnaTeks(WARNA[ringkasan.label_dominan] || '#666') }}>
                {ringkasan.label_dominan}
              </strong>.
              Total {ringkasan.total_sektor} sektor dianalisis,
              dengan {sektorTinggi} sektor berpotensi tinggi-sangat tinggi (>= 60%).
            </div>

            {/* Kotak legenda 5 tingkat */}
            <div style={{ display:'flex', gap:'8px', flexWrap:'wrap', marginBottom:'12px' }}>
              {Object.entries(WARNA).map(([lbl, warna]) => (
                <div key={lbl} style={{ display:'flex', flexDirection:'column',
                                        alignItems:'center', gap:'4px' }}>
                  <div style={{ background:warna, border:'1px solid #ccc', borderRadius:'6px',
                                padding:'8px 12px', minWidth:'90px', textAlign:'center',
                                fontWeight:'700', fontSize:'12px', color: warnaTeks(warna) }}>
                    {INTERVAL[lbl]}
                  </div>
                  <span style={{ fontSize:'11px', color:'#666', textAlign:'center' }}>{lbl}</span>
                </div>
              ))}
            </div>

            <p style={{ fontSize:'11px', color:'#9ca3af', borderTop:'1px solid #e5e7eb', paddingTop:'8px' }}>
              Interval: Sangat Rendah &lt;20% | Rendah 20-40% | Sedang 40-60% | Tinggi 60-80% | Sangat Tinggi &gt;=80%
            </p>
          </div>
        </div>

        {/* TABEL SEKTOR */}
        <div style={{ marginBottom:'24px' }}>
          <p style={{ fontSize:'13px', fontWeight:'700', textTransform:'uppercase',
                      letterSpacing:'1px', color:'#2d5a27', marginBottom:'10px' }}>
            Detail Prediksi per Sektor - Kecamatan {kecTitle}
          </p>

          <div style={{ overflowX:'auto', borderRadius:'8px', border:'1px solid #e5e7eb',
                        boxShadow:'0 1px 3px rgba(0,0,0,0.08)' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'12px' }}>
              <thead>
                <tr style={{ background:'#2d5a27', color:'white' }}>
                  {['ID Sektor','Jenis Tanah','Pohon / Vegetasi',
                    'Luas (Ha)','Curah Hujan (mm)','Potensi (%)','Label Potensi']
                    .map(h => (
                      <th key={h} style={{ padding:'10px 12px', textAlign:'left',
                                           fontWeight:'600', whiteSpace:'nowrap',
                                           borderRight:'1px solid rgba(255,255,255,0.2)' }}>
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
                      <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#f9fafb',
                                           borderBottom:'1px solid #e5e7eb' }}>
                        <td style={{ padding:'8px 12px', fontWeight:'600', color:'#111',
                                     whiteSpace:'nowrap' }}>{s.id_sektor}</td>
                        <td style={{ padding:'8px 12px', color:'#374151' }}>{s.jenis_tanah}</td>
                        <td style={{ padding:'8px 12px', color:'#374151' }}>{s.vegetasi}</td>
                        <td style={{ padding:'8px 12px', textAlign:'right', color:'#374151' }}>
                          {typeof s.luas_ha === 'number' ? s.luas_ha.toFixed(2) : s.luas_ha}
                        </td>
                        <td style={{ padding:'8px 12px', textAlign:'right', color:'#374151' }}>
                          {s.curah_hujan}
                        </td>
                        <td style={{ padding:'8px 12px', textAlign:'right',
                                     fontWeight:'700', color: wTxt }}>
                          {s.prediksi_pct}%
                        </td>
                        <td style={{ padding:'8px 12px' }}>
                          <span style={{ background: wTxt, color:'white', borderRadius:'999px',
                                         padding:'2px 10px', fontSize:'11px', fontWeight:'600',
                                         whiteSpace:'nowrap' }}>
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
          <div style={{ display:'flex', gap:'24px', marginTop:'8px',
                        fontSize:'12px', color:'#6b7280' }}>
            <span>Rerata potensi: <strong>{ringkasan.rerata_potensi}%</strong></span>
            <span>Sektor risiko tinggi (>= 60%): <strong>{sektorTinggi} dari {ringkasan.total_sektor} sektor</strong></span>
          </div>
        </div>

        {/* TOMBOL BAWAH */}
        <div style={{ display:'flex', gap:'12px', paddingBottom:'32px' }}>
          <button onClick={() => navigate('/simulasi')}
            style={{ padding:'10px 24px', borderRadius:'8px', fontWeight:'600',
                     fontSize:'13px', border:'2px solid #2d5a27', color:'#2d5a27',
                     background:'white', cursor:'pointer' }}>
            Simulasi Baru
          </button>
          {sim_id && (
            <button onClick={unduh} disabled={unduhLoad}
              style={{ padding:'10px 24px', borderRadius:'8px', fontWeight:'600',
                       fontSize:'13px', border:'none', background:'#2d5a27',
                       color:'white', cursor:'pointer' }}>
              {unduhLoad ? 'Mengunduh...' : 'Unduh Hasil (.xlsx)'}
            </button>
          )}
        </div>

      </div>
    </div>
  )
}
