const moment = require('moment');

/* Utils */
const generateRandomString = require('../utils/generateRandomString');

const signup = async (interaction, collection) => {



    const { options, user } = interaction;

    const dateString = options.getString('datetime');
    const date = moment(dateString).format('MM/DD/YY HH:mm:ss');
    const unixTimestamp = moment(date).unix();
    const id = generateRandomString(5);
    const idMessage = `Please save this id: **${id}**, as it's needed to generate the parties for **<t:${unixTimestamp}:F>** groups`;

    const message = `Signups for M+ **<t:${unixTimestamp}:F>** \n\nSign up for as many roles as you want, and post in thread any comments (if you'll be late, etc.)\n
        ${process.env.EMOJI_TANK} - I can tank\n
        ${process.env.EMOJI_HEALER} - I can heal\n
        ${process.env.EMOJI_DPS} - I can DPS\n
        ${process.env.EMOJI_AUG} - I'm an augmentation evoker!\n\u200B`;

    const buttons = {
        type: 1,
        components: [
            {
                type: 2,
                style: 1,
                customId: 'tanks',
                label: '🛡️',
            },
            {
                type: 2,
                style: 1,
                customId: 'healers',
                label: '❤️',
            },
            {
                type: 2,
                style: 1,
                customId: 'dps',
                label: '⚔️',
            },
            {
                type: 2,
                style: 1,
                customId: 'aug',
                label: '🐉',
            },
        ],
    };

    const reply = await interaction.reply({
        content: message,
        components: [buttons],
    });
    const thread = await interaction.followUp({
        content: idMessage,
        ephemeral: true
    });

    await collection.insertOne({
        id: id,
        post: reply.id,
        thread: thread.id,
        players: {
            dps: [],
            tanks: [],
            healers: [],
            aug: []
        }
    });
    await user.send(idMessage);
    // Pin the Sign Up
    // await sentMessage.pin();

    // Create the Sign Up's Thread.
    const createdThread = await interaction.channel.threads.create({
        name: `Signups`,
        autoArchiveDuration: 10080, // Set the auto-archive duration in minutes
    });
}
module.exports = signup;