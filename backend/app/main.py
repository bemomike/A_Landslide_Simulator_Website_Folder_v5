import os, warnings
warnings.filterwarnings("ignore")
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
load_dotenv()

from app.api import simulasi, geojson, hasil, panduan
from app.utils.database import init_db
from app.services.model_loader import get_model

app = FastAPI(
    title="Landslide Simulator API",
    description="Backend — Simulasi Prediksi Potensi Longsor Kabupaten Semarang",
    version="5.0.0"
)

app.add_middleware(CORSMiddleware,
    allow_origins=["*"], allow_credentials=True,
    allow_methods=["*"], allow_headers=["*"])

@app.on_event("startup")
def startup():
    try:    init_db()
    except Exception as e: print(f"[DB] Startup: {e}")
    try:    get_model()
    except Exception as e: print(f"[RF] Model belum ada — upload .pkl ke Railway dulu. Detail: {e}")

app.include_router(simulasi.router, prefix="/api/simulasi", tags=["Simulasi"])
app.include_router(geojson.router,  prefix="/api/geojson",  tags=["GeoJSON"])
app.include_router(hasil.router,    prefix="/api/hasil",    tags=["Hasil"])
app.include_router(panduan.router,  prefix="/api/panduan",  tags=["Panduan"])

@app.get("/")
def root():
    return {"status": "ok", "pesan": "Simulasi Longsor API aktif. Buka /docs untuk daftar endpoint."}

@app.get("/health")
def health():
    return {"status": "sehat"}
