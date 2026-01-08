const activeCreations = new Map();
const cancelledCreations = new Set();

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
    cancelledCreations.add(userId);

    await interaction.reply({
      content: '❌ Création de profil annulée. Tu peux relancer /creerprofil.',
      ephemeral: true
    });
    return;
  }

  // =========================
  // /CREERPROFIL
  // =========================
  if (interaction.commandName === 'creerprofil') {
    await interaction.deferReply({ ephemeral: true });
    await interaction.editReply('📩 Regarde tes MP pour créer ton profil.');

    cancelledCreations.delete(userId);

    const dm = await interaction.user.createDM();

    const questions = [
    ['fullname', 'Bienvenue dans la création de ton profil sur SWIPE ! /n Pour commencer, nous aurions besoin de connaitre ton 💬 prénom et ton nom ! (ex : Alex Martin)'],
    ['sexe', 'Très bien ! Maintenant donne moi ton 💬 sexe ?'],
    ['age', 'Mais également ton 💬 âge ?'],
    ['quartier', 'Maintenant, pour que tes futurs crush savent où te donner un rendez-vous, dis-nous dans quel 💬 quartier tu habites ?'],
    ['situation', 'Passons aux informations qui sont vraiment importante sur SWIPE ! Alors pour commencer, quel est ta 💬 situation amoureuse ?'],
    ['orientation', 'Et que cherches-tu exactement ? Enfin, pour être assez clair, quel est ton 💬 orientation sexuelle ?'],
    ['recherche', 'De nouveau, une information importante pour les potentiels crushs ! 💬 Que recherches-tu sur Swipe ? Quelque chose de sérieux ? Une soirée chaude ou a voir au feeling ?'],
    ['description', 'Enfin, donne nous une petite 💬 description, et oublie, une bonne accroche pour intéresser un max de personnes, ou la bonne personne !'],
    ['image', 'Et pour finir, nous aurions besoin de la plus belle 🖼️ photo de toi (lien ou upload)']
  ];

    const data = {};

    for (const [key, question] of questions) {
      if (cancelledCreations.has(userId)) {
        await dm.send('❌ Création annulée.');
        return;
      }

      const qMsg = await dm.send(question);

      const collected = await dm.awaitMessages({
        filter: m =>
          m.author.id === userId &&
          BigInt(m.id) > BigInt(qMsg.id),
        max: 1,
        time: 10 * 60 * 1000
      });

      if (!collected.size) {
        await dm.send('⏰ Temps écoulé.');
        return;
      }

      const msg = collected.first();

      if (key === 'fullname') {
        const parts = msg.content.trim().split(/\s+/);
        data.prenom = parts.shift();
        data.nom = parts.join(' ') || '';
      } else if (key === 'image' && msg.attachments.size) {
        data.image = msg.attachments.first().url;
      } else {
        data[key] = msg.content;
      }
    }

    // =========================
    // 👀 PRÉVIEW FINALE
    // =========================
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

    return;
  }

  // =========================
  // /MESPROFILS
  // =========================
  if (interaction.commandName === 'mesprofils') {
    const userProfiles = profiles[userId]
      ? Object.entries(profiles[userId]).map(([key, value]) => ({ key, ...value }))
      : [];

    if (!userProfiles.length) {
      await interaction.reply({ content: '❌ Aucun profil.', ephemeral: true });
      return;
    }

    let index = 0;

    const row = () =>
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('prev').setLabel('⬅️').setStyle(ButtonStyle.Secondary).setDisabled(index === 0),
        new ButtonBuilder().setCustomId('delete').setLabel('🗑️').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('next').setLabel('➡️').setStyle(ButtonStyle.Secondary).setDisabled(index === userProfiles.length - 1)
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
  }
};
