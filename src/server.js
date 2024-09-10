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
        await rest.put(
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
 * Function to form and remove players from the 'players' pool based on their roles.
 * Modifies the input 'players' by removing the selected players and returns the grabbed players.
 * @param {Object} players - Object containing arrays of players grouped by role (tanks, healers, dps, aug).
 * @returns {Object} grabbedPlayers - The players grabbed for the current group.
 */
function grabAndRemovePlayers(players) {
    const tank = players.tanks.length ? players.tanks[players.tanks.length - 1] : null;
    const healer = players.healers.length ? players.healers[players.healers.length - 1] : null;
    const aug = players.aug.length ? players.aug[players.aug.length - 1] : null;
    const copiedDPS = players.dps.slice();
    const dps = copiedDPS.length ? (players.aug.length ? copiedDPS.splice(0, 2) : copiedDPS.splice(0, 3)) : [];

    const grabbedPlayers = { tank, healer, aug, dps };

    // Remove each player from their respective role arrays
    if (grabbedPlayers.tank) {
        const index = players.tanks.indexOf(grabbedPlayers.tank);
        if (index !== -1) players.tanks.splice(index, 1);
        const dpsIndex = players.dps.findIndex(dpsPlayer => dpsPlayer.id === grabbedPlayers.tank.id);
        if (dpsIndex !== -1) players.dps.splice(dpsIndex, 1);
    }

    if (grabbedPlayers.healer) {
        const index = players.healers.indexOf(grabbedPlayers.healer);
        if (index !== -1) players.healers.splice(index, 1);
        const dpsIndex = players.dps.findIndex(dpsPlayer => dpsPlayer.id === grabbedPlayers.healer.id);
        if (dpsIndex !== -1) players.dps.splice(dpsIndex, 1);
    }

    if (grabbedPlayers.aug) {
        const index = players.aug.findIndex(augPlayer => augPlayer.id === grabbedPlayers.aug.id);
        if (index !== -1) players.aug.splice(index, 1);
        const dpsIndex = players.dps.findIndex(dpsPlayer => dpsPlayer.id === grabbedPlayers.aug.id);
        if (dpsIndex !== -1) players.dps.splice(dpsIndex, 1);
    }

    grabbedPlayers.dps.forEach((dps) => {
        const index = players.dps.indexOf(dps);
        if (index !== -1) players.dps.splice(index, 1);
        const tankIndex = players.tanks.findIndex(tankPlayer => tankPlayer.id === dps.id);
        if (tankIndex !== -1) players.tanks.splice(tankIndex, 1);
        const healerIndex = players.healers.findIndex(healerPlayer => healerPlayer.id === dps.id);
        if (healerIndex !== -1) players.healers.splice(healerIndex, 1);
        const augIndex = players.aug.findIndex(augPlayer => augPlayer.id === dps.id);
        if (augIndex !== -1) players.aug.splice(augIndex, 1);
    });

    return grabbedPlayers;
}

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
        const id = options.getString('id');

        const getEmojiForGroup = (group) => {
            switch (group) {
                case 'dps':
                    return process.env.EMOJI_DPS || '';
                case 'tanks':
                    return process.env.EMOJI_TANK || '';
                case 'healers':
                    return process.env.EMOJI_HEALER || '';
                case 'aug':
                    return process.env.EMOJI_AUG || '';
                default:
                    return '';
            }
        }

        collection.findOne({ id }).then((res) => {
            const players = res.players;
            const groups = [];
            let message = '';

            message = Object.keys(players).map(group => {
                const emoji = getEmojiForGroup(group);
                const groupHeader = `\n${emoji} ${group.toUpperCase()}:\n`;
                const groupData = players[group].map((user, index, array) => {
                    let entry = `${user.globalName}`;
                    // Remove the trailing comma for the last entry in the group
                    if (index === array.length - 1) {
                        entry = entry.replace(/, $/, '');
                    }
                    return entry;
                }).join('\n');
                return groupHeader + groupData;
            }).join('\n\n');

            console.log(message)

            // if (players.tanks.length > 0 && players.healers.length > 0 && players.aug.length > 0 && players.dps.length > 0) {
            //     // Shuffle player arrays
            //     players.tanks = players.tanks.map(value => ({ value, sort: Math.random() }))
            //         .sort((a, b) => a.sort - b.sort).map(({ value }) => value);
            //     players.healers = players.healers.map(value => ({ value, sort: Math.random() }))
            //         .sort((a, b) => a.sort - b.sort).map(({ value }) => value);
            //     players.dps = players.dps.map(value => ({ value, sort: Math.random() }))
            //         .sort((a, b) => a.sort - b.sort).map(({ value }) => value);
            //     players.aug = players.aug.map(value => ({ value, sort: Math.random() }))
            //         .sort((a, b) => a.sort - b.sort).map(({ value }) => value);

            //     // Create groups until no players are left
            //     while (players.tanks.length > 0 || players.healers.length > 0 || players.aug.length > 0 || players.dps.length > 0) {
            //         const grabbedPlayers = grabAndRemovePlayers(players);
            //         groups.push(grabbedPlayers);
            //     }

            //     // Construct message for each group
            //     for (const [index, group] of groups.entries()) {
            //         message += group.tank == null ? `**Group ${index + 1} (Tentative)**\n\u200B` : `**Group ${index + 1}**\n\u200B`;
            //         if (group.tank != null) message += `    ${process.env.EMOJI_TANK}  ${group.tank.username}\n`;
            //         if (group.healer != null) message += `    ${process.env.EMOJI_HEALER}  ${group.healer.username}\n`;
            //         if (group.aug != null) message += `    ${process.env.EMOJI_AUG}  ${group.aug.username}\n`;
            //         if (group.dps.length != 0) group.dps.forEach(player => message += `    ${process.env.EMOJI_DPS}  ${player.username}\n`);
            //         message += `\n`;
            //     }
            // } else {
            //     message = 'There are no players to form groups';
            // }

            interaction.reply({
                content: message,
                ephemeral: true
            });
        });
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
