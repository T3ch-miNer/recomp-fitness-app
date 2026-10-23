-- Recomp v2.9 public content catalogue; NO personal meal logs or workout history.
CREATE TABLE IF NOT EXISTS catalog_foods (
 id TEXT PRIMARY KEY,
 payload_json TEXT NOT NULL,
 active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0,1)),
 updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS catalog_workouts (
 id TEXT PRIMARY KEY,
 payload_json TEXT NOT NULL,
 active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0,1)),
 updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS catalog_meta (
 key TEXT PRIMARY KEY,
 value INTEGER NOT NULL CHECK (value >= 0)
);
INSERT OR IGNORE INTO catalog_meta(key,value) VALUES('version',1);
CREATE INDEX IF NOT EXISTS idx_foods_active ON catalog_foods(active,updated_at);
CREATE INDEX IF NOT EXISTS idx_workouts_active ON catalog_workouts(active,updated_at);
