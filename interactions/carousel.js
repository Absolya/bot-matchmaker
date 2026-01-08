const pendingMatches = new Map();

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
        .setCustomId('create_match')
        .setLabel('💘 Créer un match')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('next_profile')
        .setLabel('❌ Passer')
        .setStyle(ButtonStyle.Secondary)
    );

    const message = await interaction.editReply({
      embeds: [profileEmbed(profil)],
      components: [row],
      fetchReply: true
    });

    // 🧠 MÉMOIRE DU PROFIL AFFICHÉ
    pendingMatches.set(message.id, {
      ownerId: profil.ownerId,
      characterName: `${profil.prenom} ${profil.nom}`
    });

    return;
  }

  // =========================
  // BOUTONS
  // =========================
  if (!interaction.isButton()) return;

  // ❌ Passer
  if (interaction.customId === 'next_profile') {
    await interaction.deferUpdate();
    await interaction.channel.send('/profilaleatoire');
    return;
  }

  // =========================
  // 💘 DEMANDE DE MATCH
  // =========================
  if (interaction.customId === 'create_match') {
    await interaction.deferUpdate();

    const matchData = pendingMatches.get(interaction.message.id);
    if (!matchData) {
      await interaction.channel.send('❌ Impossible de retrouver le profil.');
      return;
    }

    const { ownerId, characterName } = matchData;
    const userId = interaction.user.id;

    if (ownerId === userId) {
      await interaction.channel.send('❌ Tu ne peux pas matcher avec toi-même.');
      return;
    }

    const matchedMember = await interaction.guild.members.fetch(ownerId);
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

    await matchedMember.send({
      content:
        `💌 **Demande de match RP**\n\n` +
        `🧑‍🎭 **Personnage Concernée pour la demande de match : ${characterName}**\n\n` +
        `${interaction.user} souhaite ouvrir un match RP avec ${characterName} \n\n` +
        `Souhaites-tu accepter ?`,
      components: [row]
    });

    await interaction.channel.send(
      `📨 Demande envoyée à **${matchedMember.user.username}**…`
    );

    return;
  }

  // =========================
  // ✅ ACCEPTATION
  // =========================
  if (interaction.customId.startsWith('accept_match:')) {
    await interaction.deferUpdate();

    const [, requesterId, guildId] = interaction.customId.split(':');

    const guild = await interaction.client.guilds.fetch(guildId);
    const requester = await guild.members.fetch(requesterId);
    const accepter = await guild.members.fetch(interaction.user.id);

    const forum = guild.channels.cache.find(
      c => c.type === ChannelType.GuildForum && c.name === '🫶-matchs'
    );

    if (!forum) {
      await interaction.user.send('❌ Forum 🫶-matchs introuvable.');
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
  // ❌ REFUS
  // =========================
  if (interaction.customId.startsWith('decline_match:')) {
    await interaction.deferUpdate();

    const [, requesterId, guildId] = interaction.customId.split(':');
    const guild = await interaction.client.guilds.fetch(guildId);
    const requester = await guild.members.fetch(requesterId);

    await interaction.user.send('❌ Tu as refusé la demande.');
    await requester.send(`❌ ${interaction.user.username} a refusé ton match.`);

    return;
  }
};

module.exports.pendingMatches = pendingMatches;

