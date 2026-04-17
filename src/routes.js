import { v7 as uuidv7 } from "uuid";
import { getDb, save } from "./db.js";
import {
  fetchGenderize,
  fetchAgify,
  fetchNationalize,
  classifyAge,
} from "./external.js";

async function createProfile(req, res) {
  const { name } = req.body;

  if (name === undefined || name === null) {
    return res
      .status(400)
      .json({ status: "error", message: "name is required" });
  }
  if (typeof name !== "string") {
    return res
      .status(422)
      .json({ status: "error", message: "name must be a string" });
  }
  const trimmed = name.trim();
  if (!trimmed) {
    return res
      .status(400)
      .json({ status: "error", message: "name must not be empty" });
  }

  const db = await getDb();
  const lower = trimmed.toLowerCase();

  const existing = db.exec(`SELECT * FROM profiles WHERE name = ?`, [lower]);
  if (existing.length > 0 && existing[0].values.length > 0) {
    const row = rowToObject(existing[0]);
    return res.status(200).json({
      status: "success",
      message: "Profile already exists",
      data: formatProfile(row),
    });
  }

  let genderData, agifyData, nationalizeData;
  try {
    [genderData, agifyData, nationalizeData] = await Promise.all([
      fetchGenderize(lower),
      fetchAgify(lower),
      fetchNationalize(lower),
    ]);
  } catch (err) {
    return res.status(err.status || 502).json({
      status: "error",
      message: err.message,
    });
  }

  const id = uuidv7();
  console.log(id);
  const age_group = classifyAge(agifyData.age);
  const created_at = new Date().toISOString();

  db.run(
    `INSERT INTO profiles (id, name, gender, gender_probability, sample_size, age, age_group, country_id, country_probability, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      lower,
      genderData.gender,
      genderData.gender_probability,
      genderData.sample_size,
      agifyData.age,
      age_group,
      nationalizeData.country_id,
      nationalizeData.country_probability,
      created_at,
    ],
  );
  save();

  const profile = {
    id,
    name: lower,
    gender: genderData.gender,
    gender_probability: genderData.gender_probability,
    sample_size: genderData.sample_size,
    age: agifyData.age,
    age_group,
    country_id: nationalizeData.country_id,
    country_probability: nationalizeData.country_probability,
    created_at,
  };

  return res.status(201).json({ status: "success", data: profile });
}

async function getProfile(req, res) {
  const { id } = req.params;
  const db = await getDb();

  const result = db.exec(`SELECT * FROM profiles WHERE id = ?`, [id]);
  if (!result.length || !result[0].values.length) {
    return res
      .status(404)
      .json({ status: "error", message: "Profile not found" });
  }

  const row = rowToObject(result[0]);
  return res.status(200).json({ status: "success", data: formatProfile(row) });
}

async function listProfiles(req, res) {
  const db = await getDb();

  let query = `SELECT * FROM profiles WHERE 1=1`;
  const params = [];

  const { gender, country_id, age_group } = req.query;

  if (gender) {
    query += ` AND LOWER(gender) = LOWER(?)`;
    params.push(gender);
  }
  if (country_id) {
    query += ` AND LOWER(country_id) = LOWER(?)`;
    params.push(country_id);
  }
  if (age_group) {
    query += ` AND LOWER(age_group) = LOWER(?)`;
    params.push(age_group);
  }

  const result = db.exec(query, params);
  const rows = result.length
    ? result[0].values.map((v) => zipRow(result[0].columns, v))
    : [];

  const data = rows.map((r) => ({
    id: r.id,
    name: r.name,
    gender: r.gender,
    age: r.age,
    age_group: r.age_group,
    country_id: r.country_id,
  }));

  return res.status(200).json({ status: "success", count: data.length, data });
}

async function deleteProfile(req, res) {
  const { id } = req.params;
  const db = await getDb();

  const result = db.exec(`SELECT id FROM profiles WHERE id = ?`, [id]);
  if (!result.length || !result[0].values.length) {
    return res
      .status(404)
      .json({ status: "error", message: "Profile not found" });
  }

  db.run(`DELETE FROM profiles WHERE id = ?`, [id]);
  save();

  return res.status(204).send();
}

function zipRow(columns, values) {
  return Object.fromEntries(columns.map((col, i) => [col, values[i]]));
}

function rowToObject(result) {
  return zipRow(result.columns, result.values[0]);
}

function formatProfile(row) {
  return {
    id: row.id,
    name: row.name,
    gender: row.gender,
    gender_probability: row.gender_probability,
    sample_size: row.sample_size,
    age: row.age,
    age_group: row.age_group,
    country_id: row.country_id,
    country_probability: row.country_probability,
    created_at: row.created_at,
  };
}

export { createProfile, getProfile, listProfiles, deleteProfile };
