const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require('discord.js');

const { profileEmbed } = require('../utils/embeds');
const { getAllProfiles } = require('../utils/storage');
const { pendingMatches } = require('./carousel');

module.exports = async function voirProfilsHandler(interaction) {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName !== 'voirprofils') return;

  const allProfiles = getAllProfiles();

  if (!allProfiles.length) {
    return interaction.reply({
      content: '❌ Aucun profil enregistré.',
      ephemeral: true
    });
  }

  let index = 0;

  // 🔁 Génération des boutons
  const getRow = (profile) =>
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('voirprofils_prev')
        .setLabel('⬅️')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(index === 0),

      new ButtonBuilder()
        .setCustomId('create_match')
        .setLabel('💘 Créer un match')
        .setStyle(ButtonStyle.Success),

      new ButtonBuilder()
        .setCustomId('voirprofils_next')
        .setLabel('➡️')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(index === allProfiles.length - 1)
    );

  // 📤 Envoi initial
  const message = await interaction.reply({
    embeds: [profileEmbed(allProfiles[index])],
    components: [getRow(allProfiles[index])],
    fetchReply: true,
    ephemeral: true
  });

  // 🧠 Stocker le profil affiché pour le match
  pendingMatches.set(message.id, {
    ownerId: allProfiles[index].ownerId,
    characterName: `${allProfiles[index].prenom} ${allProfiles[index].nom}`
  });

  const collector = message.createMessageComponentCollector({
    time: 5 * 60 * 1000
  });

  collector.on('collect', async i => {
  if (i.user.id !== interaction.user.id) {
    return i.reply({
      content: '❌ Ce menu ne t’est pas destiné.',
      ephemeral: true
    });
  }

  // 💘 Le bouton match est géré ailleurs (carousel)
  if (i.customId === 'create_match') {
    return; // ⛔ on ne touche PAS à l'interaction
  }

  if (i.customId === 'voirprofils_next') index++;
  if (i.customId === 'voirprofils_prev') index--;

  await i.update({
    embeds: [profileEmbed(allProfiles[index])],
    components: [getRow(allProfiles[index])]
  });

  pendingMatches.set(message.id, {
    ownerId: allProfiles[index].ownerId,
    characterName: `${allProfiles[index].prenom} ${allProfiles[index].nom}`
  });
});

};
