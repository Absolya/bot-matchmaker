const { ChannelType } = require('discord.js');
const { likes, profiles } = require('../utils/storage');

module.exports = async function handleMatch(interaction, user, profil) {
  const ownerLikes = likes[profil.ownerId] || [];
  const userProfiles = Object.keys(profiles[user.id] || {});

  // 🔁 Vérifier like mutuel
  const mutual = userProfiles.find(p => ownerLikes.includes(p));
  if (!mutual) return;

  const forum = interaction.guild.channels.cache.find(
    c => c.type === ChannelType.GuildForum && c.name === '🫶-matchs'
  );

  if (!forum) {
    return interaction.channel.send('❌ Forum 🫶-matchs introuvable.');
  }

  // 🧵 Créer le thread
  const thread = await forum.threads.create({
    name: `💘 ${user.username} x ${profil.prenom}`,
    message: {
      content: `💘 **MATCH !**\n\n${user} & <@${profil.ownerId}>`
    },
    autoArchiveDuration: 1440
  });

  // 🔐 Permissions privées
  await thread.permissionOverwrites.create(
    interaction.guild.roles.everyone,
    { ViewChannel: false }
  );

  await thread.permissionOverwrites.create(user.id, {
    ViewChannel: true,
    SendMessages: true
  });

  await thread.permissionOverwrites.create(profil.ownerId, {
    ViewChannel: true,
    SendMessages: true
  });

  interaction.channel.send(`💘 Match entre ${user} et ${profil.prenom} !`);
};
