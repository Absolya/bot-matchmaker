require('dotenv').config();
const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  SlashCommandBuilder,
  REST,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Routes,
  ChannelType
} = require('discord.js');
const fs = require('fs');

// ===== CLIENT =====
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.DirectMessages
  ],
  partials: ['CHANNEL', 'MESSAGE', 'REACTION']
});

// ===== DATA =====
let profiles = fs.existsSync('./profiles.json')
  ? JSON.parse(fs.readFileSync('./profiles.json', 'utf8'))
  : {};

const seenProfiles = {};
const likes = {};

// ===== UTIL =====
const saveProfiles = () =>
  fs.writeFileSync('./profiles.json', JSON.stringify(profiles, null, 2));

function getAllProfiles() {
  const arr = [];
  for (const userId in profiles) {
    for (const key in profiles[userId]) {
      arr.push({
        key,
        ownerId: userId,
        ...profiles[userId][key]
      });
    }
  }
  return arr;
}

// ===== SLASH COMMANDS =====
const commands = [
  new SlashCommandBuilder().setName('creerprofil').setDescription('Créer un profil'),
  new SlashCommandBuilder().setName('editerprofil').setDescription('Éditer un profil'),
  new SlashCommandBuilder().setName('supprimerprofil').setDescription('Supprimer un profil'),
  new SlashCommandBuilder()
  .setName('voirprofils')
  .setDescription('Voir tous les profils disponibles'),
  new SlashCommandBuilder().setName('profilaleatoire').setDescription('Voir des profils')
].map(c => c.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  await rest.put(
    Routes.applicationCommands(process.env.CLIENT_ID),
    { body: commands }
  );
  console.log('✅ Slash commands prêtes');
})();

// ===== EMBEDS =====
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
    .setTitle('👀 Prévisualisation de ton profil')
    .setDescription(
      `**Prénom :** ${p.prenom}\n` +
      `**Nom :** ${p.nom}\n` +
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

// ===== RANDOM =====
function getRandomProfile(channelId) {
  const all = getAllProfiles();
  if (!seenProfiles[channelId]) seenProfiles[channelId] = [];

  const restants = all.filter(p => !seenProfiles[channelId].includes(p.key));
  if (!restants.length) {
    seenProfiles[channelId] = [];
    return null;
  }

  const p = restants[Math.floor(Math.random() * restants.length)];
  seenProfiles[channelId].push(p.key);
  return p;
}

// ===== INTERACTIONS =====
client.on('interactionCreate', async interaction => {

// ===== VOIR TOUS LES PROFILS =====
if (interaction.commandName === 'voirprofils') {
  const allProfiles = getAllProfiles();

  if (!allProfiles.length) {
    return interaction.reply('❌ Aucun profil disponible.');
  }

  let index = 0;

  const getButtons = () =>
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('prev_profile')
        .setLabel('⬅️ Précédent')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(index === 0),

      new ButtonBuilder()
        .setCustomId('next_profile')
        .setLabel('Suivant ➡️')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(index === allProfiles.length - 1)
    );

  const msg = await interaction.reply({
    embeds: [profileEmbed(allProfiles[index])],
    components: [getButtons()],
    fetchReply: true
  });

  const collector = msg.createMessageComponentCollector({
    time: 300000
  });

  collector.on('collect', async i => {
    if (i.user.id !== interaction.user.id) {
      return i.reply({ content: '❌ Pas pour toi', ephemeral: true });
    }

    if (i.customId === 'next_profile') index++;
    if (i.customId === 'prev_profile') index--;

    await i.update({
      embeds: [profileEmbed(allProfiles[index])],
      components: [getButtons()]
    });
  });
}

  if (!interaction.isChatInputCommand()) return;

  const userId = interaction.user.id;

  // ===== CREER PROFIL =====
  if (interaction.commandName === 'creerprofil') {
    await interaction.reply({ content: '📩 Check tes MP', ephemeral: true });
    const dm = await interaction.user.createDM();

    const questions = [
      ['prenom', 'Bienvenue dans la création de ton profil sur notre application SWIPE ! Pour commencer, dis nous ton 💬 Prénom ?'],
      ['nom', 'Ainsi que ton 💬 Nom, ça permets aux utilisateurs de retrouver facilement ton profil'],
      ['sexe', 'Maintenant, dis-moi sous quel 💬 Sexe te représentes-tu ?'],
      ['age', 'Ainsi que ton 💬 Âge'],
      ['anniversaire', 'Et quand devons-nous te souhaiter ton 💬 Anniversaire ?'],
      ['quartier', 'Parfait ! Maintenant, nous allons passer à des détails importants, mais non obligatoire ! Commençons par 💬 où vis-tu ?'],
      ['finances', 'Et ta 💬 situation financière ?'],
      ['situation', 'Maintenant voici les informations nécessaire pour notre application, qul est ta 💬 Situation amoureuse ?'],
      ['orientation', 'Et ce que tu préfères ? 💬 (Orientation sexuelle)'],
      ['recherche', 'Pour aider les utilisateurs a en savoir plus, dis nous 💬 ce que tu recherches ?'],
      ['description', 'Et maintenant, fais nous une 💬 description ! Tu peux mettre ce que tu veux pour accrocher des futurs prétendants !'],
      ['image', 'Et on termine par une jolie photo de toi ! 🖼️ Image (lien ou upload)']
    ];

    let data = {};
    let step = 0;

    await dm.send(questions[0][1]);

    const col = dm.createMessageCollector({
  filter: m => m.author.id === userId,
  time: 300000
});

col.on('collect', async m => {
  let val = m.content;

  if (questions[step][0] === 'image' && m.attachments.size > 0) {
    val = m.attachments.first().url;
  }

  data[questions[step][0]] = val;
  step++;

  if (step < questions.length) {
    await dm.send(questions[step][1]);
  } else {
    col.stop();

    const previewMsg = await dm.send({
      embeds: [previewProfileEmbed(data)],
      components: [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('confirm_profile')
            .setLabel('✅ Publier')
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId('edit_profile')
            .setLabel('✏️ Modifier')
            .setStyle(ButtonStyle.Secondary)
        )
      ]
    });

    const buttonCollector =
      previewMsg.createMessageComponentCollector({ time: 120000 });

    buttonCollector.on('collect', async i => {
      if (i.user.id !== userId) {
        return i.reply({ content: '❌ Pas pour toi', ephemeral: true });
      }

      if (i.customId === 'confirm_profile') {
        profiles[userId] ??= {};
        profiles[userId][`${data.prenom} ${data.nom}`] = data;
        saveProfiles();

        await i.update({
          content: '🎉 Profil publié !',
          embeds: [],
          components: []
        });
      }

      if (i.customId === 'edit_profile') {
        await i.update({
          content: '✏️ D’accord, recommençons.',
          embeds: [],
          components: []
        });
      }
    });
  }
});


  // ===== PROFIL ALEATOIRE =====
  if (interaction.commandName === 'profilaleatoire') {
    const profil = getRandomProfile(interaction.channel.id);
    if (!profil) return interaction.reply('♻️ Tous les profils ont été vus.');

    const msg = await interaction.reply({
      embeds: [profileEmbed(profil)],
      fetchReply: true
    });

    await msg.react('❤️');
    await msg.react('❌');
  }
});

// ===== LOGIN =====
client.login(process.env.DISCORD_TOKEN);
