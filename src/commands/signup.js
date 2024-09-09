const moment = require('moment');
const { GuildScheduledEventPrivacyLevel, GuildScheduledEventEntityType } = require('discord.js');
/* Utils */
const generateRandomString = require('../utils/generateRandomString');

const signup = async (interaction, collection, guild) => {



    const { options, user } = interaction;

    const dateString = options.getString('datetime');
    const date = moment(dateString, 'MM/DD/YY HH:mm:ss')
    console.log(date)

    const startTime = date.toDate();
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
        fetchReply: true
    });

    await reply.pin();

    const thread = await interaction.followUp({
        content: idMessage,
        ephemeral: true
    });

    // const event = await interaction.guild.scheduledEvents.create({
    //     name: 'My Event',  // Name of the event
    //     scheduledStartTime: startTime, // Start time of the event
    //     scheduledEndTime: new Date(date.add(2, 'hours').toISOString()), // Optional: Set event end time, here 2 hours after start
    //     privacyLevel: 'GuildOnly',
    //     entityType: '2',
    // });


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
        name: `Signups For ${date}`,
        autoArchiveDuration: 10080, // Set the auto-archive duration in minutes
    });
}
module.exports = signup;