CREATE TABLE IF NOT EXISTS hasil_simulasi (
    id             SERIAL PRIMARY KEY,
    kecamatan      VARCHAR(50) NOT NULL,
    curah_hujan    FLOAT NOT NULL,
    tanggal        TIMESTAMP DEFAULT NOW(),
    hasil_json     TEXT,
    ringkasan_json TEXT
);
CREATE TABLE IF NOT EXISTS panduan (
    id      SERIAL PRIMARY KEY,
    judul   VARCHAR(200),
    isi     TEXT,
    urutan  INT DEFAULT 0
);
