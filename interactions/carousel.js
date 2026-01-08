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

const matchedMember = await interaction.guild.members.fetch(ownerId);

  if (interaction.customId.startsWith('create_match:')) {
  const ownerId = interaction.customId.split(':')[1];
  const userId = interaction.user.id;

  // ACK du bouton (OBLIGATOIRE)
  await interaction.deferUpdate();

  // sécurité
  if (ownerId === userId) {
    await interaction.channel.send('❌ Tu ne peux pas créer un match avec toi-même.');
    return;
  }

  // récupérer le membre matché
  const matchedMember = await interaction.guild.members.fetch(ownerId);

  // boutons de confirmation
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

  // envoyer la demande en DM
  await matchedMember.send({
    content:
      `💌 **Demande de match RP**\n\n` +
      `${interaction.user} souhaite ouvrir un match RP avec toi.\n\n` +
      `Souhaites-tu accepter ?`,
    components: [row]
  });

  // feedback léger côté public
  await interaction.channel.send(
    `📨 Demande de match envoyée à **${matchedMember.user.username}**…`
  );

  return;
}

if (interaction.customId.startsWith('accept_match:')) {
  const requesterId = interaction.customId.split(':')[1]; // A
  const accepterId = interaction.user.id;                  // B

  await interaction.deferUpdate(); // ACK bouton

  const guild = interaction.guild || interaction.client.guilds.cache.first();

  const requester = await guild.members.fetch(requesterId);
  const accepter = await guild.members.fetch(accepterId);

  // retrouver le forum 🫶-matchs
  const forum = guild.channels.cache.find(
    c => c.type === ChannelType.GuildForum && c.name === '🫶-matchs'
  );

  if (!forum) {
    await interaction.user.send('❌ Le forum 🫶-matchs est introuvable.');
    return;
  }

  // créer le thread
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

  // notifications
  await accepter.send('💘 Match accepté ! Le salon a été créé.');
  await requester.send(`💘 ${accepter.user.username} a accepté ton match !`);

  return;
}

if (interaction.customId.startsWith('decline_match:')) {
  const requesterId = interaction.customId.split(':')[1];

  await interaction.deferUpdate(); // ACK bouton

  const guild = interaction.guild || interaction.client.guilds.cache.first();
  const requester = await guild.members.fetch(requesterId);

  // notifications
  await interaction.user.send('❌ Tu as refusé la demande de match.');
  await requester.send(`❌ ${interaction.user.username} a refusé ton match.`);

  return;
}

  await interaction.channel.send(
    `💘 Match créé entre ${interaction.user} et <@${ownerId}> !`
  );
}

};
