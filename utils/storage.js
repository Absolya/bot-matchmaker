const fs = require('fs');
const path = require('/data/profiles.json');
const matchs = {};

const DATA_PATH = path.join(__dirname, '../profiles.json');

// ===== DATA =====
let profiles = fs.existsSync(path)
  ? JSON.parse(fs.readFileSync(path, 'utf8'))
  : {};

const likes = {};        // { userId: [profileKey] }
const seenProfiles = {}; // { channelId: [profileKey] }

// ===== SAVE =====
function saveProfiles() {
  fs.writeFileSync(path, JSON.stringify(profiles, null, 2));
}

// ===== GET ALL PROFILES =====
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

// ===== RANDOM PROFILE (CAROUSEL) =====
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

// ===== EXPORTS =====
module.exports = {
  profiles,
  likes,
  matchs,
  seenProfiles,
  saveProfiles,
  getAllProfiles,
  getRandomProfile
};
