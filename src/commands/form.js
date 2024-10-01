
const { EmbedBuilder } = require('discord.js');

/* Utils */
const shuffleArray = require('../utils/shuffleArray');

const sortGroups = (players) => {
    for (player in players) {
        console.log(players[player]);
    }
}

const createGroups = (players) => {
    console.clear();

    const groups = [];

    let tanks = shuffleArray([...players.tanks]);
    let healers = shuffleArray([...players.healers]);
    let dps = shuffleArray([...players.dps]);
    let augs = shuffleArray([...players.aug]);

    // Track players with multiple roles
    const playerRoleCount = {};

    // Helper function to count roles for each player
    const countPlayerRoles = (playerArray, role) => {
        playerArray.forEach(player => {
            if (!playerRoleCount[player.id]) {
                playerRoleCount[player.id] = { roles: [] };
            }
            playerRoleCount[player.id].roles.push(role);
        });
    };

    // Count roles for all players
    countPlayerRoles(tanks, 'tank');
    countPlayerRoles(healers, 'healer');
    countPlayerRoles(dps, 'dps');
    countPlayerRoles(augs, 'aug');


    sortGroups(playerRoleCount);


    // Helper function to remove a player from all role arrays
    const removeFromAllRoles = (playerId) => {
        tanks = tanks.filter(player => player.id !== playerId);
        healers = healers.filter(player => player.id !== playerId);
        dps = dps.filter(player => player.id !== playerId);
        augs = augs.filter(player => player.id !== playerId);
    };

    // Function to create a group
    const createGroup = () => ({
        Tank: null,
        Healer: null,
        DPS: [],
    });

    // Create groups until no full group can be formed
    while (tanks.length > 0 && healers.length > 0 && (dps.length + augs.length) >= 3) {
        let group = createGroup();

        // Assign a Tank
        if (tanks.length > 0) {
            group.Tank = tanks.shift();
            removeFromAllRoles(group.Tank.id);
        }

        // Assign a Healer, prioritizing players who can also be DPS
        if (healers.length > 0) {
            const healer = healers.shift();
            group.Healer = healer;
            removeFromAllRoles(group.Healer.id);
        }

        // Assign 1 Aug and 2 more DPS
        let augAdded = false;
        while (group.DPS.length < 3 && (dps.length > 0 || augs.length > 0)) {
            if (augs.length > 0 && !augAdded) {
                const aug = augs.shift();
                group.DPS.push(aug);
                removeFromAllRoles(aug.id);
                augAdded = true;
            } else if (dps.length > 0) {
                const dpsPlayer = dps.shift();
                group.DPS.push(dpsPlayer);
                removeFromAllRoles(dpsPlayer.id);
            }
        }

        groups.push(group);
    }

    // Handle leftover players (incomplete group)
    if (tanks.length > 0 || healers.length > 0 || dps.length > 0 || augs.length > 0) {
        let leftoverGroup = createGroup();

        leftoverGroup.Tank = tanks.shift() || { username: 'No Tank Available' };
        leftoverGroup.Healer = healers.shift() || { username: 'No Healer Available' };

        // Fill remaining DPS
        while (leftoverGroup.DPS.length < 3 && (dps.length > 0 || augs.length > 0)) {
            if (augs.length > 0) {
                const aug = augs.shift();
                leftoverGroup.DPS.push(aug);
                removeFromAllRoles(aug.id);
            } else if (dps.length > 0) {
                const dpsPlayer = dps.shift();
                leftoverGroup.DPS.push(dpsPlayer);
                removeFromAllRoles(dpsPlayer.id);
            }
        }

        if (leftoverGroup.DPS.length > 0) {
            groups.push(leftoverGroup);
        }
    }

    return groups;
};





const form = async (interaction, collection, options) => {
    const id = options.getString('id') || formid;

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
        if (!res) {
            interaction.reply({
                content: 'No groups found for the provided ID',
                ephemeral: true
            });
            return;
        }
        if (players.tanks.length >= 1 && players.healers.length >= 1 && (players.dps.length + players.aug.length) >= 3) {
            const groups = createGroups(players);
            const fields = [];

            for (const [index, group] of groups.entries()) {
                let message = '';

                const roles = {
                    Tank: 'tanks',
                    Healer: 'healers',
                };

                // Handle Tank and Healer first
                for (const [role, emojiRole] of Object.entries(roles)) {
                    const player = group[role];
                    if (player) {
                        const name = player.nickname || player.globalName;
                        message += `${getEmojiForGroup(emojiRole)} **${role}:** ${name}\n`;
                    }
                }

                // Handle multiple DPS players
                if (group.DPS && Array.isArray(group.DPS)) {
                    const dpsNames = group.DPS.map(dps => dps.nickname || dps.globalName).join(', ');
                    message += `${getEmojiForGroup('dps')} **DPS:** ${dpsNames}\n`;
                }

                fields.push({
                    name: `Group ${index + 1}`,
                    value: message,
                    inline: false
                });
            }

            // Inside your interaction handling code
            const embed = new EmbedBuilder()
                .setColor('#0099ff') // Set a color for the embed
                .setTitle('M+ Groups') // Set the title
                .addFields(
                    fields
                )

            const buttons = {
                type: 1,
                components: [
                    {
                        type: 2,
                        style: 3,
                        customId: `reload:${id}`,
                        label: 'Reload NOT WORKING : {'
                    }
                ]
            };


            interaction.reply({
                embeds: [embed],
                ephemeral: true,
            });
        } else {
            interaction.reply({
                content: 'Not Enough Players',
                ephemeral: true
            });
        }
    }).catch((error) => {
        interaction.reply({
            content: `**Not Enough Players** \n(${error})`,
            ephemeral: true
        });
    });

}
module.exports = form;