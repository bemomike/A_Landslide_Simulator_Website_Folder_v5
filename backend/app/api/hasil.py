import json, io
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from app.utils.database import get_connection

router = APIRouter()

def _fetch(sim_id=None):
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            if sim_id:
                cur.execute("SELECT * FROM hasil_simulasi WHERE id=%s", (sim_id,))
            else:
                cur.execute("SELECT * FROM hasil_simulasi ORDER BY tanggal DESC LIMIT 1")
            return cur.fetchone()
    finally:
        conn.close()

def _fmt(row):
    return {
        "id":          row["id"],
        "kecamatan":   row["kecamatan"],
        "curah_hujan": row["curah_hujan"],
        "tanggal":     str(row["tanggal"]),
        "sektor":      json.loads(row["hasil_json"]    or "[]"),
        "ringkasan":   json.loads(row["ringkasan_json"] or "{}"),
    }

@router.get("/terakhir")
def terakhir():
    r = _fetch()
    if not r: raise HTTPException(404, "Belum ada hasil simulasi.")
    return _fmt(r)

@router.get("/{sim_id}")
def by_id(sim_id: int):
    r = _fetch(sim_id)
    if not r: raise HTTPException(404, f"ID {sim_id} tidak ditemukan.")
    return _fmt(r)

@router.get("/unduh/xlsx/{sim_id}")
def unduh_xlsx(sim_id: int):
    import xlsxwriter
    row = _fetch(sim_id)
    if not row: raise HTTPException(404, "Data tidak ditemukan.")

    sektor    = json.loads(row["hasil_json"]    or "[]")
    ringkasan = json.loads(row["ringkasan_json"] or "{}")
    kec = row["kecamatan"].title()
    ch  = row["curah_hujan"]
    tgl = str(row["tanggal"])[:10]

    out = io.BytesIO()
    wb  = xlsxwriter.Workbook(out, {"in_memory": True})

    fmt_header = wb.add_format({"bold": True, "bg_color": "#2d6a4f",
                                 "font_color": "white", "border": 1})
    fmt_cell   = wb.add_format({"border": 1})
    fmt_title  = wb.add_format({"bold": True, "font_size": 14})

    # ── Sheet 1: Hasil Simulasi ───────────────────────────────────────────────
    ws = wb.add_worksheet("Hasil Simulasi")
    ws.set_column("A:A", 16)
    ws.set_column("B:C", 26)
    ws.set_column("D:G", 20)

    ws.write("A1", "Hasil Simulasi Prediksi Potensi Longsor", fmt_title)
    ws.write("A2", f"Kecamatan        : {kec}")
    ws.write("A3", f"Curah Hujan Input: {ch} mm")
    ws.write("A4", f"Tanggal Simulasi : {tgl}")
    ws.write("A5", f"Total Sektor     : {ringkasan.get('total_sektor', '-')}")
    ws.write("A6", f"Rerata Potensi   : {ringkasan.get('rerata_potensi', '-')}%")
    ws.write("A7", f"Label Dominan    : {ringkasan.get('label_dominan', '-')}")

    headers = ["ID Sektor", "Jenis Tanah", "Vegetasi / Pohon",
               "Luas (Ha)", "Curah Hujan (mm)", "Potensi (%)", "Label Potensi"]
    for c, h in enumerate(headers):
        ws.write(9, c, h, fmt_header)

    for r, s in enumerate(sektor, start=10):
        ws.write(r, 0, s.get("id_sektor",    ""),  fmt_cell)
        ws.write(r, 1, s.get("jenis_tanah",  ""),  fmt_cell)
        ws.write(r, 2, s.get("vegetasi",     ""),  fmt_cell)
        ws.write(r, 3, s.get("luas_ha",       0),  fmt_cell)
        ws.write(r, 4, s.get("curah_hujan",   0),  fmt_cell)
        ws.write(r, 5, s.get("prediksi_pct",  0),  fmt_cell)
        ws.write(r, 6, s.get("label_potensi",""),  fmt_cell)

    # ── Sheet 2: Ringkasan per Label ─────────────────────────────────────────
    ws2 = wb.add_worksheet("Ringkasan per Label")
    ws2.write("A1", "Label Potensi",   fmt_header)
    ws2.write("B1", "Jumlah Sektor",   fmt_header)
    ws2.write("C1", "Warna (HEX)",     fmt_header)
    for r, (lbl, info) in enumerate(ringkasan.get("per_label", {}).items(), 1):
        ws2.write(r, 0, lbl,                       fmt_cell)
        ws2.write(r, 1, info.get("jumlah_sektor", 0), fmt_cell)
        ws2.write(r, 2, info.get("warna", ""),     fmt_cell)

    wb.close()
    out.seek(0)

    fname = f"Simulasi_Longsor_{kec}_{tgl}.xlsx"
    return StreamingResponse(
        out,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={fname}"}
    )
