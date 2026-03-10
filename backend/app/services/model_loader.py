import os, joblib, warnings
warnings.filterwarnings("ignore")

_rf = _le_tanah = _le_veg = None

def _find_file(relative_path):
    """Cari file dari beberapa kemungkinan base directory Railway."""
    candidates = [
        # Railway: working dir = /app (root repo)
        os.path.join("/app", "backend", relative_path),
        # Railway: working dir = /app/backend (root dir diset ke backend)
        os.path.join("/app", relative_path),
        # Lokal: relatif dari file ini (services/ -> app/ -> backend/)
        os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), relative_path),
        # Lokal: dari cwd
        relative_path,
    ]
    for path in candidates:
        if os.path.exists(path):
            print(f"[RF] File ditemukan: {path}")
            return path
    raise FileNotFoundError(
        f"File tidak ditemukan di semua lokasi yang dicoba:\n" +
        "\n".join(f"  - {p}" for p in candidates)
    )

def get_model():
    global _rf, _le_tanah, _le_veg
    if _rf is None:
        _rf       = joblib.load(_find_file("app/model/trained/rf_model.pkl"))
        _le_tanah = joblib.load(_find_file("app/model/trained/le_tanah.pkl"))
        _le_veg   = joblib.load(_find_file("app/model/trained/le_veg.pkl"))
        print("[RF] Model siap.")
    return _rf, _le_tanah, _le_veg
