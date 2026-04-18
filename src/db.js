// import initSqlJs from "sql.js";
// import path from "path";
// import fs from "fs";
// import { fileURLToPath } from "url";

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

// const DB_PATH = path.join(__dirname, "..", "profiles.db");

// let _db = null;

// async function getDb() {
//   if (_db) return _db;

//   const SQL = await initSqlJs();

//   if (fs.existsSync(DB_PATH)) {
//     const fileBuffer = fs.readFileSync(DB_PATH);
//     _db = new SQL.Database(fileBuffer);
//   } else {
//     _db = new SQL.Database();
//   }

//   _db.run(`
//     CREATE TABLE IF NOT EXISTS profiles (
//       id TEXT PRIMARY KEY,
//       name TEXT NOT NULL UNIQUE,
//       gender TEXT,
//       gender_probability REAL,
//       sample_size INTEGER,
//       age INTEGER,
//       age_group TEXT,
//       country_id TEXT,
//       country_probability REAL,
//       created_at TEXT NOT NULL
//     )
//   `);

//   persist(_db);
//   return _db;
// }

// function persist(db) {
//   const data = db.export();
//   fs.writeFileSync(DB_PATH, Buffer.from(data));
// }

// function save() {
//   if (_db) persist(_db);
// }

// export { getDb, save };
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Optional persistence file (works locally, ignored on Vercel cold starts)
const DB_FILE = path.join(__dirname, "..", "profiles.json");

// In-memory store (primary DB)
let profiles = [];

/**
 * Load data from file (local dev only)
 */
function loadFromFile() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, "utf-8");
      profiles = JSON.parse(data);
    }
  } catch (err) {
    profiles = [];
  }
}

/**
 * Save data to file (ignored in serverless runtime but useful locally)
 */
function saveToFile() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(profiles, null, 2));
  } catch (err) {
    // ignore in Vercel
  }
}

/**
 * Initialize DB
 */
async function getDb() {
  if (!profiles.length) {
    loadFromFile();
  }
  return profiles;
}

/**
 * Persist changes
 */
function save() {
  saveToFile();
}

/**
 * Helper operations (optional but useful)
 */
function insert(profile) {
  profiles.push(profile);
  save();
}

function findById(id) {
  return profiles.find((p) => p.id === id);
}

function deleteById(id) {
  const index = profiles.findIndex((p) => p.id === id);
  if (index !== -1) {
    profiles.splice(index, 1);
    save();
    return true;
  }
  return false;
}

function findAll(filters = {}) {
  return profiles.filter((p) => {
    return Object.entries(filters).every(([key, value]) => {
      if (!value) return true;
      return String(p[key]).toLowerCase() === String(value).toLowerCase();
    });
  });
}

export { getDb, save, insert, findById, deleteById, findAll };
