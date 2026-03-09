# A_Landslide_Simulator_Website_Folder v5

Website Simulasi Prediksi Potensi Longsor — Kabupaten Semarang

## Stack
- Frontend  : React + Leaflet + Tailwind → Vercel
- Backend   : FastAPI + Python → Railway
- Database  : PostgreSQL → Supabase
- Model     : Random Forest (.pkl dari GColab)

## File yang harus diisi manual (kewajiban eksternal)
Jalankan GColab Divisi 3, lalu salin:
- backend/app/model/trained/  : rf_model.pkl, le_tanah.pkl, le_veg.pkl
- backend/app/data/geojson_export/ : 62 file GeoJSON
- frontend/public/assets/images/   : logo_uksw.png, logo_fsm_uksw.png, dan gambar slideshow

## Panduan deploy lengkap
Lihat docs/PANDUAN_DEPLOY_LENGKAP.docx
