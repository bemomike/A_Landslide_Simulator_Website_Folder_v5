import os, joblib, warnings
warnings.filterwarnings("ignore")

_rf = _le_tanah = _le_veg = None

def get_model():
    global _rf, _le_tanah, _le_veg
    if _rf is None:
        base = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        _rf       = joblib.load(os.path.join(base, os.getenv("MODEL_PATH",    "app/model/trained/rf_model.pkl")))
        _le_tanah = joblib.load(os.path.join(base, os.getenv("LE_TANAH_PATH", "app/model/trained/le_tanah.pkl")))
        _le_veg   = joblib.load(os.path.join(base, os.getenv("LE_VEG_PATH",   "app/model/trained/le_veg.pkl")))
        print("[RF] Model siap.")
    return _rf, _le_tanah, _le_veg
