from fastapi import APIRouter
from app.utils.database import get_connection

router = APIRouter()

DEFAULT_PANDUAN = [
    {"id": 1, "urutan": 1, "judul": "Cara Menggunakan Simulasi",
     "isi": (
         "1. Buka halaman Simulasi.\n"
         "2. Klik salah satu kecamatan dari daftar di sisi kiri peta, atau klik langsung "
         "pada wilayah kecamatan di peta.\n"
         "3. Simak informasi Sebaran Jenis Pohon dan Sebaran Jenis Tanah di panel kanan.\n"
         "4. Atur intensitas curah hujan menggunakan slider.\n"
         "5. Klik tombol Mulai Simulasi.\n"
         "6. Hasil prediksi per sektor tampil otomatis di halaman Hasil."
     )},
    {"id": 2, "urutan": 2, "judul": "Interval Tingkat Potensi Longsor",
     "isi": (
         "Sangat Rendah : < 20%\n"
         "Rendah        : 20% \u2013 40%\n"
         "Sedang        : 40% \u2013 60%\n"
         "Tinggi        : 60% \u2013 80%\n"
         "Sangat Tinggi : \u2265 80%"
     )},
    {"id": 3, "urutan": 3, "judul": "Sumber Data",
     "isi": (
         "- GADM Level 3 (batas administrasi kecamatan)\n"
         "- Peta Jenis Tanah Kabupaten Semarang\n"
         "- Data Vegetasi Kabupaten Semarang (4 layer)\n"
         "- Kemiringan Lereng Kabupaten Semarang\n"
         "- Curah Hujan & Hari Hujan 2018\u20132024 (BPS Kabupaten Semarang)\n"
         "- Rekam Bencana Longsor (BPS Kabupaten Semarang)"
     )},
    {"id": 4, "urutan": 4, "judul": "Tentang Model",
     "isi": (
         "Sistem menggunakan algoritma Random Forest dengan 10 fitur prediksi:\n"
         "jenis tanah, tutupan vegetasi, skor risiko vegetasi, proporsi luas sektor,\n"
         "skor tekstur tanah, skor kemiringan lereng, kode kelas lereng,\n"
         "curah hujan (dari input pengguna), hari hujan rerata, dan tinggi tempat."
     )},
]

@router.get("/")
def get_panduan():
    try:
        conn = get_connection()
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM panduan ORDER BY urutan ASC")
            rows = list(cur.fetchall())
        conn.close()
        if rows:
            return {"panduan": rows}
    except Exception:
        pass
    return {"panduan": DEFAULT_PANDUAN}
