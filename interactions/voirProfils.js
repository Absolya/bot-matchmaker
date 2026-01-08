const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require('discord.js');

const { profileEmbed } = require('../utils/embeds');
const { getAllProfiles } = require('../utils/storage');

module.exports = async function voirProfilsHandler(interaction) {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName !== 'voirprofils') return;

  const allProfiles = getAllProfiles();

  if (!allProfiles.length) {
    await interaction.reply({
      content: '❌ Aucun profil enregistré.',
      ephemeral: true
    });
    return;
  }

  let index = 0;

  const getRow = () =>
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('voirprofils_prev')
        .setLabel('⬅️')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(index === 0),
      new ButtonBuilder()
        .setCustomId('voirprofils_next')
        .setLabel('➡️')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(index === allProfiles.length - 1)
    );

  await interaction.reply({
    embeds: [profileEmbed(allProfiles[index])],
    components: [getRow()],
    ephemeral: true
  });

  const message = await interaction.fetchReply();

  const collector = message.createMessageComponentCollector({
    time: 5 * 60 * 1000
  });

  collector.on('collect', async i => {
    if (i.user.id !== interaction.user.id) {
      await i.reply({ content: '❌ Ce menu ne t’est pas destiné.', ephemeral: true });
      return;
    }

    if (i.customId === 'voirprofils_next') index++;
    if (i.customId === 'voirprofils_prev') index--;

    await i.update({
      embeds: [profileEmbed(allProfiles[index])],
      components: [getRow()]
    });
  });
};
