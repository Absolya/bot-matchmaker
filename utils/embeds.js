const { EmbedBuilder } = require('discord.js');

function profileEmbed(p) {
  return new EmbedBuilder()
    .setTitle(`💘 ${p.prenom} ${p.nom}`)
    .setDescription(
      `**Âge :** ${p.age}\n` +
      `**Anniversaire :** ${p.anniversaire}\n` +
      `**Sexe :** ${p.sexe}\n\n` +

      `**Quartier :** ${p.quartier}\n` +
      `**Finances :** ${p.finances}\n\n` +

      `**Situation :** ${p.situation}\n` +
      `**Orientation :** ${p.orientation}\n` +
      `**Recherche :** ${p.recherche}\n\n` +

      `**Description :**\n${p.description}`
    )
    .setImage(p.image)
    .setColor(0xff69b4);
}

function previewProfileEmbed(p) {
  return new EmbedBuilder()
    .setTitle('👀 Prévisualisation')
    .setDescription(
      `**Prénom :** ${p.prenom}\n` +
      `**Nom :** ${p.nom}\n\n` +

      `**Âge :** ${p.age}\n` +
      `**Anniversaire :** ${p.anniversaire}\n` +
      `**Sexe :** ${p.sexe}\n\n` +

      `**Quartier :** ${p.quartier}\n` +
      `**Finances :** ${p.finances}\n\n` +

      `**Situation :** ${p.situation}\n` +
      `**Orientation :** ${p.orientation}\n` +
      `**Recherche :** ${p.recherche}\n\n` +

      `**Description :**\n${p.description}`
    )
    .setImage(p.image)
    .setColor(0x00ffcc)
    .setFooter({ text: 'Confirme ou modifie ton profil 👇' });
}

module.exports = {
  profileEmbed,
  previewProfileEmbed
};
