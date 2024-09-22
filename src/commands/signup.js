
const moment = require('moment-timezone');

/* Utils */
const generateRandomString = require('../utils/generateRandomString');

const signup = async (interaction, collection, guild) => {

    const { options, user } = interaction;

    const dateString = options.getString('datetime').toUpperCase();
    const timezoneAbbreviation = dateString.slice(-3)
    console.log(timezoneAbbreviation)
    const timezoneMapping = {
        'EST': 'America/New_York',
        'EDT': 'America/New_York',  // Eastern Daylight Time
        'PST': 'America/Los_Angeles',
        'PDT': 'America/Los_Angeles',  // Pacific Daylight Time
        'CST': 'America/Chicago',
        'CDT': 'America/Chicago',  // Central Daylight Time
        'MST': 'America/Denver',
        'MDT': 'America/Denver',  // Mountain Daylight Time
        'GMT': 'Europe/London',
        'BST': 'Europe/London'  // British Summer Time (GMT during DST)
    };

    const timezone = timezoneMapping[timezoneAbbreviation] || 'PST';
    const cleanedDateString = dateString.slice(0, -4);

    const dateThreadNaming = moment(dateString).format('MM/DD/YYYY');
    console.log(dateThreadNaming)
    const momentDate = moment.tz(cleanedDateString, "M/D/YY h:mm A", timezone);
    const endDate = momentDate.clone().add(2, 'hours');


    // Get Unix timestamp (seconds since epoch)
    const unixTimestamp = momentDate.unix();

    const id = generateRandomString(5);
    const idMessage = `Please save this id: **${id}**, as it's needed to generate the parties for **<t:${unixTimestamp}:F>** groups`;

    const message = `Signups for M+ **<t:${unixTimestamp}:F>** \n\nSign up for as many roles as you want, and post in thread any comments (if you'll be late, etc.)\n
${process.env.EMOJI_TANK} - I can tank\n
${process.env.EMOJI_HEALER} - I can heal\n
${process.env.EMOJI_DPS} - I can DPS\n
${process.env.EMOJI_AUG}  - I'm an augmentation evoker!\n\u200B`;

    const channelId = process.env.CHANNEL_ID; // Replace with the actual text channel ID
    const channelLink = `<#${channelId}>`

    const buttons = {
        type: 1,
        components: [
            {
                type: 2,
                style: 2,
                customId: 'tanks',
                label: '🛡️'
            },
            {
                type: 2,
                style: 3,
                customId: 'healers',
                label: '❤️',
            },
            {
                type: 2,
                style: 4,
                customId: 'dps',
                label: '⚔️',
            },
            {
                type: 2,
                style: 1,
                customId: 'aug',
                label: '🐉'
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

    const event = await interaction.guild.scheduledEvents.create({
        name: 'M+ Night',  // Name of the event
        scheduledStartTime: momentDate, // Start time of the event
        scheduledEndTime: endDate, // Optional: Set event end time, here 2 hours after start
        privacyLevel: 2, // 2 means GUILD_ONLY (only server members can see)
        entityType: 3, // 3 means EXTERNAL (for external or non-voice-channel events)
        entityMetadata: {
            location: `${channelLink}`, // Reference the text channel
        },
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
        name: `Signups For ${dateThreadNaming}`,
        autoArchiveDuration: 10080, // Set the auto-archive duration in minutes
    });
}
module.exports = signup;