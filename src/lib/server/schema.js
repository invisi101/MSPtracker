// Full SQLite schema (idempotent). One place so every feature has its tables ready.
export const SCHEMA = `
CREATE TABLE IF NOT EXISTS profile (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  sex TEXT NOT NULL DEFAULT 'male',
  age INTEGER,
  height_cm REAL,
  weight_kg REAL NOT NULL,
  body_fat_pct REAL,
  activity_multiplier REAL NOT NULL,
  phase TEXT NOT NULL DEFAULT 'cut',
  protein_per_kg REAL,
  fat_g REAL,
  deficit REAL,
  target_pct_per_week REAL,                   -- legacy column; nothing acts on it now
  goal_weight_kg REAL,                       -- optional goal weight the user sets, shown alongside their weigh-ins
  data_from TEXT,                            -- ISO date; legacy column, written at setup but nothing acts on it now

  deload_until TEXT,                          -- legacy column; nothing acts on it now
  name TEXT,                                  -- what the AI calls the user; blank = "you"
  about TEXT,                                 -- free-text notes the coach and chef read (diet, kit, routine)
  setup_done INTEGER NOT NULL DEFAULT 0,      -- 0 until the welcome screen is completed
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT
);

CREATE TABLE IF NOT EXISTS weighins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL UNIQUE,
  weight_kg REAL NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS measurements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  site TEXT NOT NULL,
  value_cm REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS foods (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  name_ja TEXT,
  brand TEXT,
  basis TEXT NOT NULL DEFAULT '100g',      -- '100g' | 'unit'
  unit_label TEXT,                          -- e.g. '1 onigiri', '1 scoop'
  kcal REAL NOT NULL,
  protein REAL NOT NULL DEFAULT 0,
  fat REAL NOT NULL DEFAULT 0,
  carbs REAL NOT NULL DEFAULT 0,
  fibre REAL NOT NULL DEFAULT 0,
  tags TEXT,
  source TEXT NOT NULL DEFAULT 'curated',   -- curated | custom | ai
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS meals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS meal_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  meal_id INTEGER NOT NULL REFERENCES meals(id) ON DELETE CASCADE,
  food_id INTEGER NOT NULL REFERENCES foods(id),
  qty REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS food_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  slot TEXT NOT NULL DEFAULT 'other',       -- breakfast | lunch | snack | dinner | other
  food_id INTEGER REFERENCES foods(id),
  name TEXT,                                 -- for ad-hoc entries
  qty REAL NOT NULL DEFAULT 1,
  kcal REAL NOT NULL,
  protein REAL NOT NULL DEFAULT 0,
  fat REAL NOT NULL DEFAULT 0,
  carbs REAL NOT NULL DEFAULT 0,
  fibre REAL NOT NULL DEFAULT 0,
  source TEXT NOT NULL DEFAULT 'db',         -- db | manual | ai
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_food_log_date ON food_log(date);

CREATE TABLE IF NOT EXISTS program (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS program_day (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  program_id INTEGER NOT NULL REFERENCES program(id) ON DELETE CASCADE,
  label TEXT NOT NULL,                       -- STABLE key: sessions and logs store this
  name TEXT,                                 -- what the user calls it, shown everywhere
  title TEXT,                                -- longer description
  position INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS program_exercise (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  day_id INTEGER NOT NULL REFERENCES program_day(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  name TEXT NOT NULL,
  slot TEXT,                                 -- template slot (e.g. 'Horizontal press')
  prescription TEXT NOT NULL,                -- '3x8-15 @2-0'
  sets INTEGER, rep_low INTEGER, rep_high INTEGER, rir TEXT,
  rest TEXT,                                 -- rest between sets, e.g. '2 min'
  muscles TEXT
);

CREATE TABLE IF NOT EXISTS workout_session (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  day_label TEXT,
  program_id INTEGER REFERENCES program(id),
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS exercise_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER NOT NULL REFERENCES workout_session(id) ON DELETE CASCADE,
  exercise_name TEXT NOT NULL,
  set_no INTEGER NOT NULL,
  weight_kg REAL,
  reps INTEGER,
  rir REAL,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_exlog_session ON exercise_log(session_id);
CREATE INDEX IF NOT EXISTS idx_exlog_name ON exercise_log(exercise_name);

CREATE TABLE IF NOT EXISTS photos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  path TEXT NOT NULL,
  note TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS coach_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  role TEXT NOT NULL,                        -- 'user' | 'assistant'
  content TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS chef_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  role TEXT NOT NULL,                        -- 'user' | 'assistant'
  content TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

-- A block: the coach's prescription for a stretch of dates. It is the ONLY source of targets;
-- a day no block covers has none.
CREATE TABLE IF NOT EXISTS prescription (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT,                                 -- e.g. 'Block 1'
  source TEXT,                               -- who set it, e.g. the coach's name
  start_date TEXT,                           -- NULL = open-ended
  end_date TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  managed INTEGER NOT NULL DEFAULT 0,        -- legacy column; every block is the coach's, always 0
  kcal REAL,                                 -- any of these NULL = the coach gave no figure (kcal is then worked out from the macros if all three are given)
  protein_g REAL,
  fat_g REAL,
  carbs_g REAL,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_rx_active ON prescription(active, start_date, end_date);

-- The exercise database: one canonical name per lift, so per-lift history can't split across
-- spellings. Seeded from seed/exercises.js.
CREATE TABLE IF NOT EXISTS exercise (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  category TEXT,
  home INTEGER NOT NULL DEFAULT 0,
  video_url TEXT,
  source TEXT NOT NULL DEFAULT 'library',    -- 'programme' = prescribed | 'library' = swap option
  muscles TEXT,                              -- body-map keys, derived at seed time
  position INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_exercise_name ON exercise(name);
`;
