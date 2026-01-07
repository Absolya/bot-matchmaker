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
    GatewayIntentBits.DirectMessages
  ],
  partials: ['CHANNEL']
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
      return interaction.reply({ content: '❌ Aucun profil.', ephemeral: true });
    }

    let index = 0;

    const buttons = () =>
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('prev').setLabel('⬅️').setStyle(ButtonStyle.Secondary).setDisabled(index === 0),
        new ButtonBuilder().setCustomId('edit').setLabel('✏️ Modifier').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('delete').setLabel('🗑️').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('next').setLabel('➡️').setStyle(ButtonStyle.Secondary).setDisabled(index === userProfiles.length - 1)
      );

    const msg = await interaction.reply({
      embeds: [profileEmbed(userProfiles[index])],
      components: [buttons()],
      fetchReply: true,
      ephemeral: true
    });

    const collector = msg.createMessageComponentCollector({ time: 300000 });

    collector.on('collect', async i => {
      if (i.user.id !== userId) return;

      // NAVIGATION
      if (i.customId === 'next') index++;
      if (i.customId === 'prev') index--;

      // SUPPRESSION
      if (i.customId === 'delete') {
        delete profiles[userId][userProfiles[index].key];
        saveProfiles();
        userProfiles.splice(index, 1);

        if (!userProfiles.length) {
          return i.update({ content: '🗑️ Profil supprimé.', embeds: [], components: [] });
        }

        if (index >= userProfiles.length) index--;
      }

      // EDITION
      if (i.customId === 'edit') {
        return i.reply({
          ephemeral: true,
          content: '✏️ Quel champ modifier ?',
          components: [
            new ActionRowBuilder().addComponents(
  new ButtonBuilder().setCustomId('edit_prenom').setLabel('Prénom').setStyle(ButtonStyle.Secondary),
  new ButtonBuilder().setCustomId('edit_nom').setLabel('Nom').setStyle(ButtonStyle.Secondary),
  new ButtonBuilder().setCustomId('edit_age').setLabel('Âge').setStyle(ButtonStyle.Secondary),
  new ButtonBuilder().setCustomId('edit_anniversaire').setLabel('Anniversaire').setStyle(ButtonStyle.Secondary),
  new ButtonBuilder().setCustomId('edit_sexe').setLabel('Sexe').setStyle(ButtonStyle.Secondary)
),
new ActionRowBuilder().addComponents(
  new ButtonBuilder().setCustomId('edit_quartier').setLabel('Quartier').setStyle(ButtonStyle.Secondary),
  new ButtonBuilder().setCustomId('edit_finances').setLabel('Finances').setStyle(ButtonStyle.Secondary),
  new ButtonBuilder().setCustomId('edit_situation').setLabel('Situation').setStyle(ButtonStyle.Secondary),
  new ButtonBuilder().setCustomId('edit_orientation').setLabel('Orientation').setStyle(ButtonStyle.Secondary),
  new ButtonBuilder().setCustomId('edit_recherche').setLabel('Recherche').setStyle(ButtonStyle.Secondary)
),
new ActionRowBuilder().addComponents(
  new ButtonBuilder().setCustomId('edit_description').setLabel('Description').setStyle(ButtonStyle.Secondary),
  new ButtonBuilder().setCustomId('edit_image').setLabel('Image').setStyle(ButtonStyle.Secondary)
)

          ]
        });
      }

      const editable = {
  edit_prenom: 'prenom',
  edit_nom: 'nom',
  edit_age: 'age',
  edit_anniversaire: 'anniversaire',
  edit_sexe: 'sexe',
  edit_quartier: 'quartier',
  edit_finances: 'finances',
  edit_situation: 'situation',
  edit_orientation: 'orientation',
  edit_recherche: 'recherche',
  edit_description: 'description',
  edit_image: 'image'
};


      if (editable[i.customId]) {
        const field = editable[i.customId];

        await i.reply({ ephemeral: true, content: `✏️ Envoie la nouvelle valeur pour **${field}**` });

        const dm = await i.user.createDM();
        const dmCol = dm.createMessageCollector({ max: 1, time: 120000 });

        dmCol.on('collect', async m => {
          profiles[userId][userProfiles[index].key][field] =
            field === 'image' && m.attachments.size ? m.attachments.first().url : m.content;

          saveProfiles();
          await dm.send('✅ Profil mis à jour !');
        });

        return;
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

  await dm.send(questions[step][1]);

  const collector = dm.createMessageCollector({
    filter: m => m.author.id === userId,
    time: 10 * 60 * 1000
  });

  collector.on('collect', async m => {
    let value = m.content;

    if (questions[step][0] === 'image' && m.attachments.size > 0) {
      value = m.attachments.first().url;
    }

    data[questions[step][0]] = value;
    step++;

    if (step < questions.length) {
      await dm.send(questions[step][1]);
    } else {
      collector.stop();

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

      const buttonCollector = previewMsg.createMessageComponentCollector({
        time: 120000
      });

      buttonCollector.on('collect', async i => {
        if (i.user.id !== userId) {
          return i.reply({ content: '❌ Ce bouton ne t’est pas destiné', ephemeral: true });
        }

        if (i.customId === 'confirm_profile') {
          profiles[userId] ??= {};
          profiles[userId][`${data.prenom} ${data.nom}`] = data;
          saveProfiles();

          await i.update({
            content: '🎉 Profil publié avec succès !',
            embeds: [],
            components: []
          });
        }

        if (i.customId === 'edit_profile') {
          await i.update({
            content: '✏️ D’accord, on recommence la création du profil.',
            embeds: [],
            components: []
          });
        }
      });
    }
  });

  collector.on('end', (_, reason) => {
    if (reason === 'time') {
      dm.send('⏰ Temps écoulé. Tu peux relancer avec /creerprofil.');
    }
  });
}


// ===== PROFIL ALÉATOIRE =====
if (interaction.commandName === 'profilaleatoire') {
  const profil = getRandomProfile(interaction.channel.id);
  if (!profil) {
    return interaction.reply('♻️ Tous les profils ont été vus.');
  }

  const msg = await interaction.reply({
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
    if (reaction.emoji.name === '❌') {
      return msg.delete().catch(() => {});
    }

    // ❤️ LIKE
    likes[user.id] ??= [];
    if (!likes[user.id].includes(profil.ownerId)) {
      likes[user.id].push(profil.ownerId);
    }

    // DEBUG
    console.log('LIKE:', user.id, '->', profil.ownerId);
    console.log('LIKES:', likes);

    // 💘 MATCH ?
    const ownerLikes = likes[profil.ownerId] ?? [];
    const isMatch = ownerLikes.includes(user.id);

    if (!isMatch) {
      return interaction.followUp(`❤️ ${user.username} a liké ${profil.prenom}`);
    }

    // 💘 MATCH CONFIRMÉ
    console.log('MATCH ENTRE', user.id, 'ET', profil.ownerId);

    const forum = interaction.guild.channels.cache.find(
      c =>
        c.type === ChannelType.GuildForum &&
        c.name === '🫶-matchs'
    );

    if (!forum) {
      console.error('FORUM INTROUVABLE');
      return interaction.followUp('❌ Le forum 🫶-matchs est introuvable.');
    }

    try {
      await forum.threads.create({
        name: `💘 ${user.username} x ${profil.prenom}`,
        autoArchiveDuration: 1440,
        type: ChannelType.PublicThread,
        message: {
          content: `💘 **MATCH !**\n\n${user} & <@${profil.ownerId}>`
        }
      });

      await interaction.followUp('💘 Match créé avec succès !');
    } catch (err) {
      console.error('ERREUR THREAD:', err);
      await interaction.followUp('❌ Erreur lors de la création du match.');
    }
  });
}

});

// ===== LOGIN =====
client.login(process.env.DISCORD_TOKEN);
