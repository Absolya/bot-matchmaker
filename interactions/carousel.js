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
  // Boutons
  // =========================
  if (!interaction.isButton()) return;

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

  // 🔒 auto-match interdit
  if (ownerId === userId) {
    await interaction.reply({
      content: '❌ Tu ne peux pas créer un match avec toi-même.',
      ephemeral: true
    });
    return;
  }

  // ✅ ACK CORRECT POUR UN BOUTON
  await interaction.deferUpdate();

  const forum = interaction.guild.channels.cache.find(
    c => c.type === ChannelType.GuildForum && c.name === '🫶-matchs'
  );

  if (!forum) {
    await interaction.channel.send('❌ Forum 🫶-matchs introuvable.');
    return;
  }

  const matchKey = [userId, ownerId].sort().join('-');

  if (matchs[matchKey]) {
    await interaction.channel.send('⚠️ Un match existe déjà.');
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

  // 🔔 feedback (PAS via interaction.reply)
  await interaction.channel.send(
    `💘 Match créé entre ${interaction.user} et <@${ownerId}> !`
  );
}

};
