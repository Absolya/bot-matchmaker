const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType } = require('discord.js');
const { profileEmbed } = require('../utils/embeds');
const { getRandomProfile, matchs } = require('../utils/storage');

module.exports = async function carouselHandler(interaction) {
  // ===== Commande /profilaleatoire =====
  if (interaction.isChatInputCommand()) {
    if (interaction.commandName !== 'profilaleatoire') return;

    await interaction.deferReply();

    const profil = getRandomProfile(interaction.channel.id);
    if (!profil) {
      return interaction.editReply('♻️ Tous les profils ont été vus.');
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

  // ===== Boutons =====
  if (!interaction.isButton()) return;

  // ❌ Passer au profil suivant
  if (interaction.customId === 'next_profile') {
    await interaction.deferUpdate();
    await interaction.channel.send('/profilaleatoire');
    return;
  }

  // 💘 Créer un match
  if (interaction.customId.startsWith('create_match:')) {
    const ownerId = interaction.customId.split(':')[1];
    const userId = interaction.user.id;

    if (ownerId === userId) {
      return interaction.reply({
        content: '❌ Tu ne peux pas créer un match avec toi-même.',
        ephemeral: true
      });
    }

    await interaction.deferReply({ ephemeral: true });

    const forum = interaction.guild.channels.cache.find(
      c => c.type === ChannelType.GuildForum && c.name === '🫶-matchs'
    );

    if (!forum) {
      return interaction.editReply('❌ Forum 🫶-matchs introuvable.');
    }

    // 🔒 éviter doublon
    const matchKey = [userId, ownerId].sort().join('-');
    matchs[matchKey] ??= false;

    if (matchs[matchKey]) {
      return interaction.editReply('⚠️ Un match existe déjà.');
    }

    matchs[matchKey] = true;

    await forum.threads.create({
      name: `💘 ${interaction.user.username} x <@${ownerId}>`,
      autoArchiveDuration: 1440,
      message: {
        content: `💘 **MATCH !**\n\n${interaction.user} & <@${ownerId}>\n\n✨ Faites connaissance ici !`
      }
    });

    await interaction.editReply('💘 Match créé avec succès !');
  }
};
