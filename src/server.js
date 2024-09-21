require('dotenv').config();
/* NodeJS  */
const http = require('http');

/* Discord API */
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const { Client, GatewayIntentBits } = require('discord.js');

/* Discord Commands */
const signup = require('./commands/signup');
const join = require('./commands/join');
const form = require('./commands/form');

/* MongoDB */
const { MongoClient } = require('mongodb');

const mClient = new MongoClient(process.env.MONGO_DB_URI);
const database = mClient.db();
const collection = database.collection(process.env.MONGO_DB_COLLECTION);

/**
 * Asynchronously connects to the MongoDB database using the MongoClient.
 * Logs whether the connection is successful or if it encounters an error.
 */
connectToMongoDB = async () => {
    try {
        await mClient.connect();
        console.log('Connected to MongoDB successfully');
    } catch (error) {
        console.error('Error connecting to MongoDB:', error);
    }
}

connectToMongoDB();

/* NodeJS HTTP server */
const server = http.createServer();

/* Discord Client */
const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

/* Define Discord slash commands */
const commands = [{
    name: 'signup',
    description: 'Create M+ Sign up Sheet with Thread',
    options: [
        {
            name: 'datetime',
            description: 'MM/DD/YY HH:MM AM/PM TZ',
            type: 3,
            required: true,
        },
    ],
},
{
    name: 'form',
    description: 'Forms the Groups',
    options: [
        {
            name: 'id',
            description: '#####',
            type: 3,
            required: true,
        },
    ],
}
];

const rest = new REST({ version: '9' }).setToken(process.env.DISCORD_TOKEN);

/**
 * Registers or updates the defined Discord slash commands in the specified guild.
 * Logs the status of the operation.
 */
(async () => {
    try {
        console.log('Started refreshing application (/) commands.');
        const registeredCommands = await rest.put(
            Routes.applicationGuildCommands(process.env.DISCORD_CLIENT_ID, process.env.DISCORD_GUILD_ID),
            { body: commands },
        );
        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error(error);
    }
})();

/**
 * Event listener for when the Discord client is ready and has logged in.
 * Logs the bot's username when ready.
 */
client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});



/**
 * Event listener for Discord interaction commands.
 * Listens for the 'signup' and 'form' commands, handling each appropriately.
 * 
 * 'signup' - Calls the signup function to handle creating the sign-up sheet.
 * 'form' - Forms player groups based on the available players and sends the message.
 */
client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    const { commandName, options, user } = interaction;

    if (commandName === 'signup') {
        signup(interaction, collection);
    }

    if (commandName === 'form') {
        form(interaction, collection, options);
    }
});

/**
 * Event listener for Discord button interactions.
 * Passes the interaction to the 'join' command handler.
 */
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;
    join(interaction, collection);
});

/* Start the Discord client and HTTP server */
client.login(process.env.DISCORD_TOKEN);
server.listen(process.env.PORT, process.env.IP);





