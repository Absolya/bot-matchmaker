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
    GatewayIntentBits.DirectMessages
  ],
  partials: ['CHANNEL']
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
  new SlashCommandBuilder().setName('mesprofils').setDescription('Voir et gérer tes profils'),
  new SlashCommandBuilder().setName('profilaleatoire').setDescription('Voir un profil aléatoire'),
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
      `**Sexe :** ${p.sexe}\n\n` +
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

  // ===== MES PROFILS =====
  if (interaction.commandName === 'mesprofils') {
    const userProfiles = profiles[userId]
      ? Object.entries(profiles[userId]).map(([key, value]) => ({ key, ...value }))
      : [];

    if (!userProfiles.length) {
      return interaction.reply({
        content: '❌ Tu n’as encore créé aucun profil.',
        ephemeral: true
      });
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
          .setCustomId('delete')
          .setLabel('🗑️ Supprimer')
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId('edit')
            .setLabel('✏️ Modifier')
           .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('next')
          .setLabel('➡️')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(index === userProfiles.length - 1)
      );

    const msg = await interaction.reply({
      embeds: [profileEmbed(userProfiles[index])],
      components: [buttons()],
      fetchReply: true,
      ephemeral: true
    });

    const collector = msg.createMessageComponentCollector({ time: 300000 });

    collector.on('collect', async i => {

      if (i.customId === 'edit') {
  return i.reply({
    content: '✏️ Quel champ veux-tu modifier ?',
    ephemeral: true,
    components: [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('edit_prenom')
          .setLabel('Prénom')
          .setStyle(ButtonStyle.Secondary),

        new ButtonBuilder()
          .setCustomId('edit_age')
          .setLabel('Âge')
          .setStyle(ButtonStyle.Secondary),

        new ButtonBuilder()
          .setCustomId('edit_description')
          .setLabel('Description')
          .setStyle(ButtonStyle.Secondary),

        new ButtonBuilder()
          .setCustomId('edit_image')
          .setLabel('Image')
          .setStyle(ButtonStyle.Secondary),

        new ButtonBuilder()
          .setCustomId('cancel_edit')
          .setLabel('Annuler')
          .setStyle(ButtonStyle.Danger)
      )
    ]
  });
}

const editableFields = {
  edit_prenom: 'prenom',
  edit_age: 'age',
  edit_description: 'description',
  edit_image: 'image'
};

if (editableFields[i.customId]) {
  const field = editableFields[i.customId];

  await i.reply({
    content: `✏️ Envoie la nouvelle valeur pour **${field}**`,
    ephemeral: true
  });

  const dm = await i.user.createDM();

  const msgCollector = dm.createMessageCollector({
    filter: m => m.author.id === userId,
    max: 1,
    time: 120000
  });

  msgCollector.on('collect', async m => {
    const newValue =
      field === 'image' && m.attachments.size
        ? m.attachments.first().url
        : m.content;

    profiles[userId][userProfiles[index].key][field] = newValue;
    saveProfiles();

    await dm.send('✅ Profil mis à jour avec succès !');
  });
}

if (i.customId === 'cancel_edit') {
  return i.update({
    content: '❌ Modification annulée.',
    components: []
  });
}

      if (i.user.id !== userId) return;

      if (i.customId === 'next') index++;
      if (i.customId === 'prev') index--;

      if (i.customId === 'delete') {
        delete profiles[userId][userProfiles[index].key];
        saveProfiles();
        userProfiles.splice(index, 1);

        if (!userProfiles.length) {
          return i.update({
            content: '🗑️ Tous tes profils ont été supprimés.',
            embeds: [],
            components: []
          });
        }

        if (index >= userProfiles.length) index--;
      }

      await i.update({
        embeds: [profileEmbed(userProfiles[index])],
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
