import os, json
import numpy as np
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from app.services.model_loader import get_model
from app.utils.database import get_connection

router = APIRouter()

KEC_VALID = [
    "GETASAN","TENGARAN","SUSUKAN","SURUH","PABELAN",
    "TUNTANG","BANYUBIRU","JAMBU","SUMOWONO","AMBARAWA",
    "BAWEN","BRINGIN","BANCAK","PRINGAPUS","BERGAS",
    "UNGARAN BARAT","UNGARAN TIMUR","BANDUNGAN","KALIWUNGU"
]

WARNA_POTENSI = {
    "Sangat Rendah": "#1a9641",
    "Rendah":        "#a6d96a",
    "Sedang":        "#ffffbf",
    "Tinggi":        "#fdae61",
    "Sangat Tinggi": "#d7191c",
}

def label_potensi(p: float) -> str:
    if p < 20:  return "Sangat Rendah"
    if p < 40:  return "Rendah"
    if p < 60:  return "Sedang"
    if p < 80:  return "Tinggi"
    return "Sangat Tinggi"

class SimInput(BaseModel):
    kecamatan:   str
    curah_hujan: float = Field(..., ge=0, le=5000,
                               description="Intensitas curah hujan dalam mm — dari input pengguna")

@router.post("/jalankan")
def jalankan(data: SimInput):
    kec = data.kecamatan.upper().strip()
    if kec not in KEC_VALID:
        raise HTTPException(400,
            f"Kecamatan '{kec}' tidak valid. Pilih dari 19 kecamatan Kabupaten Semarang.")

    rf, le_tanah, le_veg = get_model()

    base = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    path = os.path.join(base, "app", "data", "geojson_export", f"{kec}.geojson")

    if not os.path.exists(path):
        raise HTTPException(404,
            f"File {kec}.geojson belum ada di backend. "
            f"Jalankan Divisi 3 GColab (Sel Export-2) lalu salin hasilnya ke "
            f"backend/app/data/geojson_export/")

    with open(path, "r", encoding="utf-8") as f:
        gj = json.load(f)

    sektor = []
    for feat in gj.get("features", []):
        p = feat.get("properties", {})

        try:    tanah_enc = int(le_tanah.transform([str(p.get("MACAM_TANA", "NA"))])[0])
        except: tanah_enc = 0
        try:    veg_enc   = int(le_veg.transform([str(p.get("LABEL_VEG",   "NA"))])[0])
        except: veg_enc   = 0

        # Curah hujan: WAJIB dari input pengguna — bukan rerata
        ch = data.curah_hujan

        row = np.array([[
            tanah_enc,
            veg_enc,
            float(p.get("VEG_RISIKO",       0.5)),
            float(p.get("PROPORSI_LUAS",     0.05)),
            float(p.get("SKOR_TT_MEAN",      2.0)),
            float(p.get("SKOR_LERENG",       2.0)),
            float(p.get("GRIDCODE_LERENG",   2)),
            ch,
            float(p.get("HH_MEAN",           90)),
            float(p.get("TINGGI_MEAN",       500)),
        ]])

        pred  = float(np.clip(rf.predict(row)[0], 0, 100))
        label = label_potensi(pred)

        sektor.append({
            "id_sektor":     p.get("ID_SEKTOR",   ""),
            "nama_sektor":   p.get("NAMA_SEKTOR", ""),
            "jenis_tanah":   p.get("MACAM_TANA",  ""),
            "vegetasi":      p.get("LABEL_VEG",   ""),
            "luas_ha":       round(float(p.get("LUAS_M2", 0)) / 10000, 2),
            "curah_hujan":   round(ch, 1),
            "prediksi_pct":  round(pred, 2),
            "label_potensi": label,
            "warna":         WARNA_POTENSI[label],
            "geometry":      feat.get("geometry"),
        })

    if not sektor:
        raise HTTPException(422,
            f"Tidak ada sektor yang dapat diprediksi untuk {kec}. "
            f"Periksa isi file {kec}.geojson.")

    pct       = [s["prediksi_pct"] for s in sektor]
    rata      = round(sum(pct) / len(pct), 2)
    per_label = {
        lbl: {
            "jumlah_sektor": sum(1 for s in sektor if s["label_potensi"] == lbl),
            "warna": WARNA_POTENSI[lbl]
        }
        for lbl in WARNA_POTENSI
    }
    ringkasan = {
        "total_sektor":   len(sektor),
        "rerata_potensi": rata,
        "label_dominan":  label_potensi(rata),
        "per_label":      per_label,
        "sektor_tinggi":  sum(1 for p in pct if p >= 60),
    }

    sim_id = None
    try:
        conn = get_connection()
        simpan = [{k: v for k, v in s.items() if k != "geometry"} for s in sektor]
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO hasil_simulasi (kecamatan,curah_hujan,hasil_json,ringkasan_json) "
                "VALUES (%s,%s,%s,%s) RETURNING id",
                (kec, data.curah_hujan, json.dumps(simpan), json.dumps(ringkasan))
            )
            sim_id = cur.fetchone()["id"]
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"[DB] Gagal simpan: {e}")

    return {
        "kecamatan":    kec,
        "curah_hujan":  data.curah_hujan,
        "sektor":       sektor,
        "ringkasan":    ringkasan,
        "simulasi_id":  sim_id,
    }

@router.get("/kecamatan")
def daftar_kecamatan():
    return {"kecamatan": KEC_VALID}
