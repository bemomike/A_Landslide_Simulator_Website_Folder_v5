import os, json
from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse

router = APIRouter()

def _find_geojson(fname):
    candidates = [
        os.path.join("/app", "backend", "app", "data", "geojson_export", fname),
        os.path.join("/app", "app", "data", "geojson_export", fname),
        os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                     "app", "data", "geojson_export", fname),
        os.path.join("app", "data", "geojson_export", fname),
    ]
    for path in candidates:
        if os.path.exists(path):
            return path
    raise HTTPException(404,
        f"{fname} tidak ditemukan. Jalankan Divisi 3 GColab dan salin hasilnya ke "
        f"backend/app/data/geojson_export/")

def _load(fname):
    path = _find_geojson(fname)
    with open(path, "r", encoding="utf-8") as f:
        return JSONResponse(content=json.load(f))

@router.get("/kabupaten")
def kabupaten():
    return _load("kabupaten_semarang.geojson")

@router.get("/kecamatan")
def kecamatan():
    return _load("kecamatan_semarang.geojson")

@router.get("/sektor/{kec}")
def sektor(kec: str):
    return _load(f"{kec.upper().strip()}.geojson")

@router.get("/vegetasi/{kec}")
def vegetasi(kec: str):
    return _load(f"veg_{kec.upper().strip()}.geojson")

@router.get("/tanah/{kec}")
def tanah(kec: str):
    return _load(f"tanah_{kec.upper().strip()}.geojson")
