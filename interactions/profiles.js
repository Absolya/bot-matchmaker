const activeCreations = new Map(); // userId => collector
const cancelledCreations = new Set(); // userId


const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require('discord.js');

const { profileEmbed, previewProfileEmbed } = require('../utils/embeds');
const { profiles, saveProfiles } = require('../utils/storage');

module.exports = async function profilesHandler(interaction) {
  if (!interaction.isChatInputCommand()) return;

  const userId = interaction.user.id;

// =========================
// /ANNULERPROFIL
// =========================
if (interaction.commandName === 'annulerprofil') {
  // on marque l’annulation
  cancelledCreations.add(interaction.user.id);

  // ⚠️ réponse IMMÉDIATE à Discord
  await interaction.reply({
    content: '❌ Création de profil annulée. Tu peux relancer /creerprofil quand tu veux.',
    ephemeral: true
  });

  return;
}


  // =========================
// /CREERPROFIL (ANTI-SPAM)
// =========================
if (interaction.commandName === 'creerprofil') {
  await interaction.deferReply({ ephemeral: true });
  await interaction.editReply('📩 Regarde tes MP pour créer ton profil.');

  const dm = await interaction.user.createDM();
  const userId = interaction.user.id;
  
  const questions = [
    ['prenom', '💬 Prénom ?'],
    ['nom', '💬 Nom ?'],
    ['sexe', '💬 Sexe ?'],
    ['age', '💬 Âge ?'],
    ['anniversaire', '💬 Anniversaire ?'],
    ['quartier', '💬 Quartier ?'],
    ['finances', '💬 Situation financière ?'],
    ['situation', '💬 Situation amoureuse ?'],
    ['orientation', '💬 Orientation sexuelle ?'],
    ['recherche', '💬 Que recherches-tu ?'],
    ['description', '💬 Description'],
    ['image', '🖼️ Image (lien ou upload)']
  ];

  const data = {};

let cancelled = false;

for (const [key, question] of questions) {
  if (cancelled) return;

  const questionMsg = await dm.send(question);

  // ⏳ attendre soit un message, soit un bouton
  const result = await Promise.race([
    dm.awaitMessages({
      filter: m =>
        m.author.id === userId &&
        BigInt(m.id) > BigInt(questionMsg.id),
      max: 1,
      time: 10 * 60 * 1000
    }),
    questionMsg.awaitMessageComponent({
      filter: i =>
        i.customId === 'cancel_creation' &&
        i.user.id === userId,
      time: 10 * 60 * 1000
    })
  ]);

  // ❌ ANNULATION
  if (!result || result.customId === 'cancel_creation') {
    cancelled = true;
    await dm.send('❌ Création du profil annulée.');
    return;
  }

  const msg = result.first();

  if (key === 'image' && msg.attachments.size > 0) {
    data[key] = msg.attachments.first().url;
  } else {
    data[key] = msg.content;
  }
}



  // 👀 PRÉVIEW
  const previewMsg = await dm.send({
    embeds: [previewProfileEmbed(data)],
    components: [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('confirm_profile')
          .setLabel('✅ Publier')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId('cancel_profile')
          .setLabel('❌ Annuler')
          .setStyle(ButtonStyle.Secondary)
      )
    ]
  });

  const btn = await previewMsg.awaitMessageComponent({
    filter: i => i.user.id === userId,
    time: 120000
  });

  if (btn.customId === 'confirm_profile') {
    profiles[userId] ??= {};
    profiles[userId][`${data.prenom} ${data.nom}`] = data;
    saveProfiles();

    await btn.update({
      content: '🎉 Profil publié avec succès !',
      embeds: [],
      components: []
    });
  } else {
    await btn.update({
      content: '❌ Création annulée.',
      embeds: [],
      components: []
    });
  }
}


  // =========================
  // /MESPROFILS
  // =========================
  if (interaction.commandName === 'mesprofils') {
    const userProfiles = profiles[userId]
      ? Object.entries(profiles[userId]).map(([key, value]) => ({ key, ...value }))
      : [];

    if (!userProfiles.length) {
await interaction.deferReply({ ephemeral: true });
return interaction.editReply('❌ Aucun profil.');
    }

    let index = 0;

    const row = () =>
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('prev')
          .setLabel('⬅️')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(index === 0),
        new ButtonBuilder()
          .setCustomId('delete')
          .setLabel('🗑️')
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId('next')
          .setLabel('➡️')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(index === userProfiles.length - 1)
      );

    const msg = await interaction.reply({
      embeds: [profileEmbed(userProfiles[index])],
      components: [row()],
      ephemeral: true,
      fetchReply: true
    });

    const collector = msg.createMessageComponentCollector({ time: 300000 });

    collector.on('collect', async i => {
      if (i.user.id !== userId) return;

      if (i.customId === 'next') index++;
      if (i.customId === 'prev') index--;

      if (i.customId === 'delete') {
        delete profiles[userId][userProfiles[index].key];
        saveProfiles();
        userProfiles.splice(index, 1);

        if (!userProfiles.length) {
          return i.update({ content: '🗑️ Profil supprimé.', embeds: [], components: [] });
        }

        if (index >= userProfiles.length) index--;
      }

      await i.update({
        embeds: [profileEmbed(userProfiles[index])],
        components: [row()]
      });
    });
	collector.on('end', () => {
  activeCreations.delete(userId);
});

  }
};
