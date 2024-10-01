const smallCaps = {
    a: 'ᴀ', b: 'ʙ', c: 'ᴄ', d: 'ᴅ', e: 'ᴇ', f: 'ғ', g: 'ɢ', h: 'ʜ', i: 'ɪ', j: 'ᴊ',
    k: 'ᴋ', l: 'ʟ', m: 'ᴍ', n: 'ɴ', o: 'ᴏ', p: 'ᴘ', q: 'ǫ', r: 'ʀ', s: 's', t: 'ᴛ',
    u: 'ᴜ', v: 'ᴠ', w: 'ᴡ', x: 'x', y: 'ʏ', z: 'ᴢ', ' ': ' ', ',': ',', '!': '!', '.': '.'
};

const toSmallCaps = (text) => {
    return text
        .split(', ')
        .map(char => smallCaps[char.toLowerCase()] || char)
        .join(', ');
}

const updateMessage = async (players, interaction, timestamp) => {
    const cachedChannel = interaction.client.channels.cache.get(interaction.channelId);
    const id = interaction.message.id;
    let roleGroups = {
        tanks: '',
        healers: '',
        dps: '',
        aug: ''
    };

    console.clear();

    const groupMapping = {
        tanks: (name) => roleGroups.tanks += `${name}, `,
        healers: (name) => roleGroups.healers += `${name}, `,
        dps: (name) => roleGroups.dps += `${name}, `,
        aug: (name) => roleGroups.aug += `${name}, `
    };

    for (const group in players) {
        for (const player of players[group]) {
            if (player) {
                const name = player.nickname || player.globalName;
                if (groupMapping[group]) {
                    groupMapping[group](name);
                }
            }
        }
    }

    // Helper function to trim and convert group text or set a default value
    const processGroupText = (groupText, defaultText) => {
        return groupText.trim().replace(/,$/, '') || defaultText;
    };

    // Process each role group
    let tankText = toSmallCaps(processGroupText(roleGroups.tanks, ''));
    let healersText = toSmallCaps(processGroupText(roleGroups.healers, ''));
    let dpsText = toSmallCaps(processGroupText(roleGroups.dps, ''));
    let augText = toSmallCaps(processGroupText(roleGroups.aug, ''));

    const spacer = '-#  ** ** ** ** ** ** ** ** ** ** ** **';
    const msg = `Signups for M+ **<t:${timestamp}:F>** \n\nSign up for as many roles as you want, and post in thread any comments (if you'll be late, etc.)\n
${process.env.EMOJI_TANK} - I can tank\u00A0 **(${players.tanks.length})**\u200B
${spacer} ${tankText}\n
${process.env.EMOJI_HEALER} - I can heal\u200B **(${players.healers.length})**
${spacer} ${healersText}\n
${process.env.EMOJI_DPS} - I can DPS\u200B **(${players.dps.length})**
${spacer} ${dpsText}\n
${process.env.EMOJI_AUG}  - I'm an Augmentation Evoker! **(${players.aug.length})**\u200B
${spacer} ${augText}\n\u200B`;


    cachedChannel.messages.fetch(id) // Replace with the actual message ID
        .then(message => {
            message.edit(msg)
                .catch(console.error);
        })
        .catch(console.error);
}


const updatePlayers = async (document, user, group, collection, interaction) => {
    const { players, post, timestamp } = document;
    const playerIndex = players[group].findIndex(obj => obj.id === user.id);
    console.log(playerIndex)
    const action = playerIndex !== -1 ? 'Removing' : 'Adding';

    if (playerIndex !== -1) {
        players[group].splice(playerIndex);
    } else {
        players[group].push(user);
    }

    await collection.updateOne(
        { post },
        {
            $set: {
                [`players.${group}`]: players[group]
            }
        }
    )

    await updateMessage(players, interaction, timestamp);
    return action;
}

const join = async (interaction, collection) => {
    const { customId, user, guild } = interaction;

    const member = await guild.members.fetch(user.id);
    const id = interaction.message.interaction.id;
    user.nickname = member.nickname || user.globalName;

    let emoji;

    switch (customId) {
        case 'tanks':
            emoji = process.env.EMOJI_TANK;
            break;
        case 'healers':
            emoji = process.env.EMOJI_HEALER;
            break;
        case 'dps':
            emoji = process.env.EMOJI_DPS;
            break;
        case 'aug':
            emoji = process.env.EMOJI_AUG;
            break;
        default:
            return;
    }

    const document = await collection.findOne({ post: id });
    updatePlayers(document, user, customId, collection, interaction).then((res) => {
        let message;

        if (res === 'Adding') {
            message = `${emoji} ${res} you to the **${customId.toUpperCase()}** group.`;
        } else {
            message = `${emoji} ${res} you from the **${customId.toUpperCase()}** group.`
        }

        interaction.reply({
            content: message,
            ephemeral: true
        });
    });

}
module.exports = join;