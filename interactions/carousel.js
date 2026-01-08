const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType
} = require('discord.js');

const { profileEmbed } = require('../utils/embeds');
const { getRandomProfile, matchs } = require('../utils/storage');

module.exports = async function carouselHandler(interaction) {

  // =========================
  // /profilaleatoire
  // =========================
  if (interaction.isChatInputCommand()) {
    if (interaction.commandName !== 'profilaleatoire') return;

    await interaction.deferReply();

    const profil = getRandomProfile(interaction.channel.id);
    if (!profil) {
      await interaction.editReply('♻️ Tous les profils ont été vus.');
      return;
    }

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`create_match:${profil.ownerId}`)
        .setLabel('💘 Créer un match')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('next_profile')
        .setLabel('❌ Passer')
        .setStyle(ButtonStyle.Secondary)
    );

    await interaction.editReply({
      embeds: [profileEmbed(profil)],
      components: [row]
    });

    return;
  }

 // =========================
// BOUTONS
// =========================
if (!interaction.isButton()) return;

// ⚠️ IMPORTANT : STOP ici si déjà répondu
if (interaction.replied || interaction.deferred) return;

// ❌ Passer
if (interaction.customId === 'next_profile') {
  await interaction.deferUpdate();
  await interaction.channel.send('/profilaleatoire');
  return;
}

// 💘 Créer un match
if (interaction.customId.startsWith('create_match:')) {
  const ownerId = interaction.customId.split(':')[1];
  const userId = interaction.user.id;

  await interaction.deferUpdate(); // ✅ UNE SEULE FOIS

  if (ownerId === userId) {
    await interaction.channel.send('❌ Tu ne peux pas matcher avec toi-même.');
    return;
  }

  const forum = interaction.guild.channels.cache.find(
    c => c.type === ChannelType.GuildForum && c.name === '🫶-matchs'
  );

  if (!forum) {
    await interaction.channel.send('❌ Forum 🫶-matchs introuvable.');
    return;
  }

  const matchKey = [userId, ownerId].sort().join('-');
  if (matchs[matchKey]) {
    await interaction.channel.send('⚠️ Match déjà existant.');
    return;
  }

  matchs[matchKey] = true;

  await forum.threads.create({
    name: `💘 ${interaction.user.username} x <@${ownerId}>`,
    autoArchiveDuration: 1440,
    message: {
      content: `💘 **MATCH !**\n\n${interaction.user} & <@${ownerId}>\n\n✨ Faites connaissance ici !`
    }
  });

  await interaction.channel.send(
    `💘 Match créé entre ${interaction.user} et <@${ownerId}> !`
  );
}

};
