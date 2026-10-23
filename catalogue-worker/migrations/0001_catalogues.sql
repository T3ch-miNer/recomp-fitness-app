-- Recomp v2.8+: catalogue only, never personal user logs.
CREATE TABLE IF NOT EXISTS foods (
 id TEXT PRIMARY KEY NOT NULL,
 name TEXT NOT NULL,
 category TEXT NOT NULL DEFAULT 'Other',
 aliases TEXT NOT NULL DEFAULT '',
 default_grams REAL NOT NULL DEFAULT 100 CHECK(default_grams > 0 AND default_grams <= 5000),
 calories REAL NOT NULL CHECK(calories >= 0 AND calories <= 1000),
 protein REAL NOT NULL CHECK(protein >= 0 AND protein <= 1000),
 carbs REAL NOT NULL CHECK(carbs >= 0 AND carbs <= 1000),
 fat REAL NOT NULL CHECK(fat >= 0 AND fat <= 1000),
 fibre REAL NOT NULL DEFAULT 0 CHECK(fibre >= 0 AND fibre <= 1000),
 source TEXT NOT NULL DEFAULT 'Online catalogue estimate',
 active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)),
 updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_foods_active_name ON foods(active,name);
CREATE TABLE IF NOT EXISTS workout_plans (
 id TEXT PRIMARY KEY NOT NULL,
 name TEXT NOT NULL,
 subtitle TEXT NOT NULL DEFAULT '',
 items_json TEXT NOT NULL DEFAULT '[]' CHECK(json_valid(items_json)),
 sort_order INTEGER NOT NULL DEFAULT 0,
 active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)),
 updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_workouts_active_order ON workout_plans(active,sort_order);
CREATE TABLE IF NOT EXISTS exercises (
 id TEXT PRIMARY KEY NOT NULL,
 name TEXT NOT NULL,
 muscle_group TEXT NOT NULL DEFAULT '',
 equipment TEXT NOT NULL DEFAULT '',
 guidance TEXT NOT NULL DEFAULT '',
 active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)),
 updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_exercises_active_name ON exercises(active,name);
