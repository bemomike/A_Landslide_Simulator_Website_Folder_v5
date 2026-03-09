import os, json
from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse

router = APIRouter()

def _dir():
    base = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    return os.path.join(base, "app", "data", "geojson_export")

def _load(fname):
    path = os.path.join(_dir(), fname)
    if not os.path.exists(path):
        raise HTTPException(404,
            f"{fname} tidak ditemukan. Jalankan Divisi 3 GColab dan salin hasilnya ke "
            f"backend/app/data/geojson_export/")
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
