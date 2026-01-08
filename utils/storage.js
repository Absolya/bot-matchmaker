const fs = require('fs');
const path = require('path');

// =========================
// 📁 DOSSIER PERSISTANT RENDER
// =========================
const DATA_DIR = '/data';
const PROFILES_PATH = path.join(DATA_DIR, 'profiles.json');

// =========================
// 🛠️ S'ASSURER QUE /data EXISTE
// =========================
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// =========================
// 📦 PROFILS
// =========================
let profiles = {};
if (fs.existsSync(PROFILES_PATH)) {
  profiles = JSON.parse(fs.readFileSync(PROFILES_PATH, 'utf8'));
} else {
  fs.writeFileSync(PROFILES_PATH, JSON.stringify({}, null, 2));
}

// =========================
// 💘 AUTRES DONNÉES
// =========================
const likes = {};         // { userId: [profileKey] }
const seenProfiles = {};  // { channelId: [profileKey] }
const matchs = {};        // { "userA-userB": true }

// =========================
// 💾 SAUVEGARDE
// =========================
function saveProfiles() {
  fs.writeFileSync(PROFILES_PATH, JSON.stringify(profiles, null, 2));
}

// =========================
// 📋 TOUS LES PROFILS
// =========================
function getAllProfiles() {
  const arr = [];
  for (const userId in profiles) {
    for (const key in profiles[userId]) {
      arr.push({
        key,
        ownerId: userId,
        ...profiles[userId][key]
      });
    }
  }
  return arr;
}

// =========================
// 🎲 PROFIL ALÉATOIRE
// =========================
function getRandomProfile(channelId) {
  const all = getAllProfiles();
  if (!seenProfiles[channelId]) seenProfiles[channelId] = [];

  const remaining = all.filter(p => !seenProfiles[channelId].includes(p.key));
  if (!remaining.length) {
    seenProfiles[channelId] = [];
    return null;
  }

  const p = remaining[Math.floor(Math.random() * remaining.length)];
  seenProfiles[channelId].push(p.key);
  return p;
}

// =========================
// 📤 EXPORTS
// =========================
module.exports = {
  profiles,
  likes,
  matchs,
  seenProfiles,
  saveProfiles,
  getAllProfiles,
  getRandomProfile
};
