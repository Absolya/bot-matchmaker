const { ChannelType } = require('discord.js');
const { likes, profiles, matchs } = require('../utils/storage');

module.exports = async function handleMatch(interaction, user, profil) {
  // sécurité
  if (!interaction.guild) return;

  const ownerId = profil.ownerId;
  const userId = user.id;

  // likes du propriétaire du profil
  const ownerLikes = likes[ownerId] || [];

  // profils de l'utilisateur
  const userProfiles = Object.keys(profiles[userId] || {});

  // 🔁 LIKE MUTUEL ?
  const mutualProfile = userProfiles.find(p => ownerLikes.includes(p));
  if (!mutualProfile) return;

  // 🛡️ empêcher les doublons de match
  const matchKey = [userId, ownerId].sort().join('-');
  matchs ??= {};
  if (matchs[matchKey]) return;

  // 💾 enregistrer le match
  matche[matchKey] = true;

  // 🔎 trouver le forum
  const forum = interaction.guild.channels.cache.find(
    c => c.type === ChannelType.GuildForum && c.name === '🫶-matchs'
  );

  if (!forum) {
    console.error('Forum 🫶-matchs introuvable');
    return;
  }

  // 🧵 créer le thread (SANS permissions custom)
  const thread = await forum.threads.create({
    name: `💘 ${user.username} x ${profil.prenom}`,
    autoArchiveDuration: 1440,
    message: {
      content: `💘 **MATCH !**\n\n${user} & <@${ownerId}>\n\n✨ Faites connaissance ici !`
    }
  });

  // 🔔 notification dans le salon actuel
  await interaction.channel.send(
    `💘 **Match !** ${user} et <@${ownerId}> ont matché 🎉`
  );
};
