const fetch = require("node-fetch");

async function fetchGenderize(name) {
  const res = await fetch(
    `https://api.genderize.io?name=${encodeURIComponent(name)}`,
  );
  if (!res.ok) throw new Error("Genderize returned an invalid response");
  const data = await res.json();

  if (!data.gender || data.count === 0) {
    throw Object.assign(new Error("Genderize returned an invalid response"), {
      status: 502,
    });
  }

  return {
    gender: data.gender,
    gender_probability: data.probability,
    sample_size: data.count,
  };
}

async function fetchAgify(name) {
  const res = await fetch(
    `https://api.agify.io?name=${encodeURIComponent(name)}`,
  );
  if (!res.ok) throw new Error("Agify returned an invalid response");
  const data = await res.json();

  if (data.age === null || data.age === undefined) {
    throw Object.assign(new Error("Agify returned an invalid response"), {
      status: 502,
    });
  }

  return { age: data.age };
}

async function fetchNationalize(name) {
  const res = await fetch(
    `https://api.nationalize.io?name=${encodeURIComponent(name)}`,
  );
  if (!res.ok) throw new Error("Nationalize returned an invalid response");
  const data = await res.json();

  if (!data.country || data.country.length === 0) {
    throw Object.assign(new Error("Nationalize returned an invalid response"), {
      status: 502,
    });
  }

  const top = data.country.reduce((a, b) =>
    b.probability > a.probability ? b : a,
  );

  return {
    country_id: top.country_id,
    country_probability: top.probability,
  };
}

function classifyAge(age) {
  if (age <= 12) return "child";
  if (age <= 19) return "teenager";
  if (age <= 59) return "adult";
  return "senior";
}

module.exports = { fetchGenderize, fetchAgify, fetchNationalize, classifyAge };
