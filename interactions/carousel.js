const handleMatch = require('./matchs');
const { profileEmbed } = require('../utils/embeds');
const {
  getRandomProfile,
  likes,
  profiles
} = require('../utils/storage');

module.exports = async function carouselHandler(interaction) {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName !== 'profilaleatoire') return;

  await interaction.deferReply();

  const profil = getRandomProfile(interaction.channel.id);
  if (!profil) {
    return interaction.editReply('♻️ Tous les profils ont été vus.');
  }

  const msg = await interaction.editReply({
    embeds: [profileEmbed(profil)],
    fetchReply: true
  });

  await msg.react('❤️');
  await msg.react('❌');

  const collector = msg.createReactionCollector({
    filter: (reaction, user) =>
      ['❤️', '❌'].includes(reaction.emoji.name) && !user.bot,
    max: 1,
    time: 120000
  });

  collector.on('collect', async (reaction, user) => {
    // ❌ suivant
    if (reaction.emoji.name === '❌') {
      await msg.delete().catch(() => {});
      interaction.channel.send('/profilaleatoire');
      return;
    }

    // ❤️ like
    if (reaction.emoji.name === '❤️') {
  likes[user.id] ??= [];
  likes[user.id].push(profil.key);

  await handleMatch(interaction, user, profil);
}


    // vérification match (sera déplacée à l’étape suivante)
   
  });
};
