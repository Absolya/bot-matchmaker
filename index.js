require('dotenv').config();

console.log('ENV TOKEN =', process.env.TOKEN ? 'OK' : 'MANQUANT');
console.log('ENV CLIENT_ID =', process.env.CLIENT_ID ? 'OK' : 'MANQUANT');

const {
  Client,
  GatewayIntentBits,
  SlashCommandBuilder,
  REST,
  Routes
} = require('discord.js');

const storage = require('./utils/storage');
const { profileEmbed, previewProfileEmbed } = require('./utils/embeds');
const carouselHandler = require('./interactions/carousel');
const profilesHandler = require('./interactions/profiles');

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

// ===== SLASH COMMANDS =====
const commands = [
  new SlashCommandBuilder().setName('creerprofil').setDescription('Créer un profil'),
  new SlashCommandBuilder().setName('mesprofils').setDescription('Voir et gérer tes profils'),
  new SlashCommandBuilder().setName('profilaleatoire').setDescription('Voir un profil aléatoire'),
   // 👇 CELLE-CI DOIT ÊTRE ICI
  new SlashCommandBuilder()
    .setName('annulerprofil')
    .setDescription('Annuler la création de profil en cours')
].map(c => c.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

(async () => {
  try {
    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID),
      { body: commands }
    );
    console.log('✅ Slash commands enregistrées');
  } catch (err) {
    console.error('❌ Erreur slash commands:', err);
  }
})();

// ===== INTERACTIONS (ROUTER) =====
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const command = interaction.commandName;

  // 👤 PROFILS
  if (['creerprofil', 'mesprofils', 'annulerprofil'].includes(command)) {
    return profilesHandler(interaction);
  }

  // 🎴 CAROUSEL
  if (command === 'profilaleatoire') {
    return carouselHandler(interaction);
  }

  // 🛡️ SÉCURITÉ (au cas où)
  await interaction.reply({
    content: '❌ Commande non prise en charge.',
    ephemeral: true
  });
});

// ===== KEEP ALIVE (RENDER) =====
const http = require('http');

http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Bot Discord actif 🚀');
}).listen(process.env.PORT || 3000, () => {
  console.log('🌐 Serveur HTTP actif');
});

// ===== LOGIN =====
client.login(process.env.TOKEN);
