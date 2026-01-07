require('dotenv').config();
const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  SlashCommandBuilder,
  REST,
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
const saveProfiles = () => fs.writeFileSync('./profiles.json', JSON.stringify(profiles, null, 2));

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
  new SlashCommandBuilder().setName('profilaleatoire').setDescription('Voir des profils')
].map(c => c.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
(async () => {
  await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands });
  console.log('✅ Slash commands prêtes');
})();

// ===== EMBED PROFIL =====
function profileEmbed(p) {
  return new EmbedBuilder()
    .setTitle(`💘 ${p.prenom} ${p.nom}`)
    .setDescription(
      `**Âge :** ${p.age}\n` +
      `**Anniversaire :** ${p.anniversaire || p.anniv}\n` +
      `**Sexe :** ${p.sexe}\n\n` +
      `**Quartier de vie :** ${p.quartier || p.habitation}\n` +
      `**Finances :** ${p.finances || p.finance}\n\n` +
      `**Situation :** ${p.situation}\n` +
      `**Orientation :** ${p.orientation}\n` +
      `**Recherche :** ${p.recherche}\n\n` +
      `**Description :**\n${p.description}`
    )
    .setImage(p.image)
    .setFooter({ text: `Profil : ${p.key}` })
    .setColor(0xff69b4);
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
  if (!interaction.isChatInputCommand()) return;
  const userId = interaction.user.id;

  // ===== CREER PROFIL =====
  if (interaction.commandName === 'creerprofil') {
    await interaction.reply({ content: '📩 Check tes MP', ephemeral: true });
    const dm = await interaction.user.createDM();

    const questions = [
      ['prenom', 'Nous allons pouvoir commencer la création de ton profil ! Pour cela, pourrais-tu nous dire ton 💬 Prénom ?'],
      ['nom', 'Ainsi que ton 💬 Nom ?'],
      ['sexe', '💬 Sexe ?'],
      ['age', '💬 Âge ?'],
      ['anniversaire', 'Quand dois-t-on te souhaiter ton 💬 Anniversaire ?'],
      ['quartier', '💬 Où vis-tu ?'],
      ['finances', '💬 Et ton niveau financier ? Tu es riche ou pauvre ?'],
      ['situation', 'Maintenant, pour ton profil sur notre application, nous avons besoin de connaitre ta 💬 Situation amoureuse ?'],
      ['orientation', 'Ainsi que ton 💬 Orientation sexuelle ?'],
      ['recherche', 'Explique nous 💬 Ce que tu cherches sur Swipe ?'],
      ['description', 'Et pour finir, fais nous une petite 💬 Description'],
      ['image', '🖼️ Image (lien ou upload)']
    ];

    let data = {}, step = 0;
    dm.send(questions[0][1]);

    const col = dm.createMessageCollector({ filter: m => m.author.id === userId, time: 300000 });
    col.on('collect', m => {
      let val = m.content;
      if (questions[step][0] === 'image' && m.attachments.size > 0) val = m.attachments.first().url;
      data[questions[step][0]] = val;
      step++;
      if (step < questions.length) dm.send(questions[step][1]);
      else {
        col.stop();
        profiles[userId] ??= {};
        profiles[userId][`${data.prenom} ${data.nom}`] = data;
        saveProfiles();
        dm.send(`✅ Profil **${data.prenom} ${data.nom}** créé`);
      }
    });
  }

  // ===== PROFIL ALEATOIRE =====
  if (interaction.commandName === 'profilaleatoire') {
    const profil = getRandomProfile(interaction.channel.id);
    if (!profil) return interaction.reply('♻️ Tous les profils ont été vus.');

    const msg = await interaction.reply({ embeds: [profileEmbed(profil)], fetchReply: true });
    await msg.react('❤️');
    await msg.react('❌');

    const collector = msg.createReactionCollector({
      filter: (r, u) => ['❤️', '❌'].includes(r.emoji.name) && !u.bot,
      max: 1,
      time: 120000
    });

   collector.on('collect', async (reaction, user) => {
    if (reaction.emoji.name === '❌') {
        await msg.delete().catch(() => {});

        // Relancer la commande /profilaleatoire
        try {
            // Ici, interaction est l'objet d'origine
            await interaction.deferReply(); // optionnel, pour signaler qu'on répond
            await client.commands.get('profilaleatoire').execute(interaction);
        } catch (error) {
            console.error('Erreur en relançant le profil aléatoire :', error);
            await interaction.followUp('❌ Une erreur est survenue en générant un nouveau profil.');
        }
    }

      // LIKE
      likes[user.id] ??= [];
      likes[user.id].push(profil.key);

      const ownerLikes = likes[profil.ownerId] || [];
      const userProfiles = Object.keys(profiles[user.id] || {});
      const mutual = userProfiles.find(p => ownerLikes.includes(p));
      if (!mutual) return interaction.followUp(`❤️ ${user.username} a liké ${profil.prenom}`);

      // ===== MATCH =====
      const forum = interaction.guild.channels.cache.find(
        c => c.type === ChannelType.GuildForum && c.name === '🫶-matchs'
      );
      if (!forum) return interaction.followUp('❌ Forum 🫶-matchs introuvable.');

      // Crée le thread avec message initial obligatoire
      await forum.threads.create({
        name: `💘 ${profil.prenom} x ${profil.prenom}`,
        autoArchiveDuration: 1440,
        type: ChannelType.PublicThread,
        message: {
          content: `💘 **MATCH !**\n\n${user} & <@${profil.ownerId}>`
        }
      });
    }); // <-- ferme collector.on
  } // <-- ferme if profilaleatoire
}); // <-- ferme interactionCreate

// ===== LOGIN =====
client.login(process.env.TOKEN);
