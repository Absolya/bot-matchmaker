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

    const guildId = interaction.guild.id;

const row = new ActionRowBuilder().addComponents(
  new ButtonBuilder()
    .setCustomId(`accept_match:${userId}:${guildId}`)
    .setLabel('💘 Accepter le match')
    .setStyle(ButtonStyle.Success),
  new ButtonBuilder()
    .setCustomId(`decline_match:${userId}:${guildId}`)
    .setLabel('❌ Refuser')
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

  // ❌ Passer au profil suivant
  if (interaction.customId === 'next_profile') {
    if (!interaction.deferred && !interaction.replied) {
      await interaction.deferUpdate();
    }

    await interaction.channel.send('/profilaleatoire');
    return;
  }

  // =========================
  // 💘 DEMANDE DE MATCH
  // =========================
  if (interaction.customId.startsWith('create_match:')) {
    const ownerId = interaction.customId.split(':')[1];
    const userId = interaction.user.id;

    if (!interaction.deferred && !interaction.replied) {
      await interaction.deferUpdate();
    }

    if (ownerId === userId) {
      await interaction.channel.send('❌ Tu ne peux pas matcher avec toi-même.');
      return;
    }

    const matchedMember = await interaction.guild.members.fetch(ownerId);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`accept_match:${userId}`)
        .setLabel('💘 Accepter le match')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`decline_match:${userId}`)
        .setLabel('❌ Refuser')
        .setStyle(ButtonStyle.Secondary)
    );

    await matchedMember.send({
      content:
        `💌 **Demande de match RP**\n\n` +
        `${interaction.user} souhaite ouvrir un match RP avec toi.\n\n` +
        `Souhaites-tu accepter ?`,
      components: [row]
    });

    await interaction.channel.send(
      `📨 Demande envoyée à **${matchedMember.user.username}**…`
    );

    return;
  }

  // =========================
  // ✅ ACCEPTATION DU MATCH
  // =========================
  if (interaction.customId.startsWith('accept_match:')) {
  const [, requesterId, guildId] = interaction.customId.split(':');

  if (!interaction.deferred && !interaction.replied) {
    await interaction.deferUpdate();
  }

  // 🔁 récupérer le serveur depuis l'ID
  const guild = await interaction.client.guilds.fetch(guildId);

  const requester = await guild.members.fetch(requesterId);
  const accepter = await guild.members.fetch(interaction.user.id);

  const forum = guild.channels.cache.find(
    c => c.type === ChannelType.GuildForum && c.name === '🫶-matchs'
  );

  if (!forum) {
    await interaction.user.send('❌ Le forum 🫶-matchs est introuvable.');
    return;
  }

  const matchKey = [requester.id, accepter.id].sort().join('-');
  if (matchs[matchKey]) return;
  matchs[matchKey] = true;

  await forum.threads.create({
    name: `💘 ${requester.user.username} x ${accepter.user.username}`,
    autoArchiveDuration: 1440,
    message: {
      content:
        `💘 **MATCH CONFIRMÉ !**\n\n` +
        `${requester} & ${accepter}\n\n` +
        `✨ À vous de jouer 💬`
    }
  });

  await accepter.send('💘 Match accepté ! Le salon a été créé.');
  await requester.send(`💘 ${accepter.user.username} a accepté ton match !`);

  return;
}


  // =========================
  // ❌ REFUS DU MATCH
  // =========================
  if (interaction.customId.startsWith('decline_match:')) {
    const requesterId = interaction.customId.split(':')[1];

    if (!interaction.deferred && !interaction.replied) {
      await interaction.deferUpdate();
    }

    const guild = interaction.guild;
    const requester = await guild.members.fetch(requesterId);

    await interaction.user.send('❌ Tu as refusé la demande de match.');
    await requester.send(`❌ ${interaction.user.username} a refusé ton match.`);

    return;
  }
};
