import os
import psycopg2
import psycopg2.extras
from dotenv import load_dotenv

load_dotenv()

def get_connection():
    url = os.getenv("DATABASE_URL", "")
    if not url:
        raise RuntimeError("DATABASE_URL belum diatur di environment variables.")
    return psycopg2.connect(url, cursor_factory=psycopg2.extras.RealDictCursor)

def init_db():
    try:
        conn = get_connection()
        with conn.cursor() as cur:
            cur.execute("""
                CREATE TABLE IF NOT EXISTS hasil_simulasi (
                    id             SERIAL PRIMARY KEY,
                    kecamatan      VARCHAR(50) NOT NULL,
                    curah_hujan    FLOAT NOT NULL,
                    tanggal        TIMESTAMP DEFAULT NOW(),
                    hasil_json     TEXT,
                    ringkasan_json TEXT
                );
            """)
            cur.execute("""
                CREATE TABLE IF NOT EXISTS panduan (
                    id      SERIAL PRIMARY KEY,
                    judul   VARCHAR(200),
                    isi     TEXT,
                    urutan  INT DEFAULT 0
                );
            """)
        conn.commit()
        conn.close()
        print("[DB] Inisialisasi tabel berhasil.")
    except Exception as e:
        print(f"[DB] Peringatan inisialisasi: {e}")
