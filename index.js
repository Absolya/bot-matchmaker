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
  Routes
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

// ===== UTIL =====
const saveProfiles = () =>
  fs.writeFileSync('./profiles.json', JSON.stringify(profiles, null, 2));

function getAllProfiles() {
  const arr = [];
  for (const userId in profiles) {
    for (const key in profiles[userId]) {
      arr.push({ key, ownerId: userId, ...profiles[userId][key] });
    }
  }
  return arr;
}

// ===== SLASH COMMANDS =====
const commands = [
  new SlashCommandBuilder().setName('creerprofil').setDescription('Créer un profil'),
  new SlashCommandBuilder().setName('voirprofils').setDescription('Voir tous les profils'),
  new SlashCommandBuilder().setName('profilaleatoire').setDescription('Voir un profil aléatoire')
].map(c => c.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands });
  console.log('✅ Slash commands prêtes');
})();

// ===== EMBEDS =====
function profileEmbed(p) {
  return new EmbedBuilder()
    .setTitle(`💘 ${p.prenom} ${p.nom}`)
    .setDescription(
      `**Âge :** ${p.age}\n` +
      `**Sexe :** ${p.sexe}\n` +
      `**Quartier :** ${p.quartier}\n\n` +
      `**Situation :** ${p.situation}\n` +
      `**Orientation :** ${p.orientation}\n\n` +
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
      `**Sexe :** ${p.sexe}\n\n` +
      `**Description :**\n${p.description}`
    )
    .setImage(p.image)
    .setColor(0x00ffcc);
}

// ===== RANDOM =====
function getRandomProfile(channelId) {
  const all = getAllProfiles();
  if (!seenProfiles[channelId]) seenProfiles[channelId] = [];

  const remaining = all.filter(p => !seenProfiles[channelId].includes(p.key));
  if (!remaining.length) {
    seenProfiles[channelId] = [];
    return null;
  }

  const p = remaining[Math.floor(Math.random() * remaining.length)];
  seenProfiles[channelId].push(p.key);
  return p;
}

// ===== INTERACTIONS =====
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const userId = interaction.user.id;

  // ===== VOIR PROFILS =====
  if (interaction.commandName === 'voirprofils') {
    const allProfiles = getAllProfiles();
    if (!allProfiles.length) {
      return interaction.reply('❌ Aucun profil disponible.');
    }

    let index = 0;

    const buttons = () =>
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('prev')
          .setLabel('⬅️')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(index === 0),
        new ButtonBuilder()
          .setCustomId('next')
          .setLabel('➡️')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(index === allProfiles.length - 1)
      );

    const msg = await interaction.reply({
      embeds: [profileEmbed(allProfiles[index])],
      components: [buttons()],
      fetchReply: true
    });

    const collector = msg.createMessageComponentCollector({ time: 300000 });

    collector.on('collect', async i => {
      if (i.user.id !== userId) {
        return i.reply({ content: '❌ Pas pour toi', ephemeral: true });
      }

      if (i.customId === 'next') index++;
      if (i.customId === 'prev') index--;

      await i.update({
        embeds: [profileEmbed(allProfiles[index])],
        components: [buttons()]
      });
    });
  }

  // ===== CRÉER PROFIL =====
  if (interaction.commandName === 'creerprofil') {
    await interaction.reply({ content: '📩 Regarde tes MP', ephemeral: true });
    const dm = await interaction.user.createDM();

    const questions = [
      ['prenom', 'Prénom ?'],
      ['nom', 'Nom ?'],
      ['sexe', 'Sexe ?'],
      ['age', 'Âge ?'],
      ['description', 'Description ?'],
      ['image', 'Image (lien ou upload)']
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

        const preview = await dm.send({
          embeds: [previewProfileEmbed(data)],
          components: [
            new ActionRowBuilder().addComponents(
              new ButtonBuilder()
                .setCustomId('confirm')
                .setLabel('✅ Publier')
                .setStyle(ButtonStyle.Success)
            )
          ]
        });

        const btnCol = preview.createMessageComponentCollector({ time: 120000 });

        btnCol.on('collect', async i => {
          if (i.user.id !== userId) return;

          profiles[userId] ??= {};
          profiles[userId][`${data.prenom} ${data.nom}`] = data;
          saveProfiles();

          await i.update({ content: '🎉 Profil publié !', embeds: [], components: [] });
        });
      }
    });
  }

  // ===== PROFIL ALÉATOIRE =====
  if (interaction.commandName === 'profilaleatoire') {
    const profil = getRandomProfile(interaction.channel.id);
    if (!profil) return interaction.reply('♻️ Tous les profils ont été vus.');

    await interaction.reply({ embeds: [profileEmbed(profil)] });
  }
});

// ===== LOGIN =====
client.login(process.env.DISCORD_TOKEN);
