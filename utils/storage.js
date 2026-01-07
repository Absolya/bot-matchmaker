const fs = require('fs');
const path = require('path');

// 📁 chemin du disque persistant Render
const DATA_DIR = '/data';
const PROFILES_PATH = path.join(DATA_DIR, 'profiles.json');
const MATCHS_PATH = path.join(DATA_DIR, 'matchs.json');

// 🛠️ s'assurer que le dossier existe
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// 🧠 charger ou initialiser les profils
let profiles = {};
if (fs.existsSync(PROFILES_PATH)) {
  profiles = JSON.parse(fs.readFileSync(PROFILES_PATH, 'utf8'));
} else {
  fs.writeFileSync(PROFILES_PATH, JSON.stringify({}, null, 2));
}

// 🧠 charger ou initialiser les matchs
let matchs = {};
if (fs.existsSync(MATCHS_PATH)) {
  matchs = JSON.parse(fs.readFileSync(MATCHS_PATH, 'utf8'));
} else {
  fs.writeFileSync(MATCHS_PATH, JSON.stringify({}, null, 2));
}

// 💾 sauvegardes
function saveProfiles() {
  fs.writeFileSync(PROFILES_PATH, JSON.stringify(profiles, null, 2));
}

function saveMatchs() {
  fs.writeFileSync(MATCHS_PATH, JSON.stringify(matchs, null, 2));
}

module.exports = {
  profiles,
  matchs,
  saveProfiles,
  saveMatchs
};
