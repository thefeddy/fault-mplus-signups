
const { EmbedBuilder } = require('discord.js');

/* Utils */
const shuffleArray = require('../utils/shuffleArray');
const createGroups = (players) => {
    console.log(players)
    const groups = [];
    let tanks = shuffleArray([...players.tanks]);
    let healers = shuffleArray([...players.healers]);
    let dps = shuffleArray([...players.dps]);
    let augs = shuffleArray([...players.aug]);

    // Track players with multiple roles
    const playerRoleCount = {};

    // Helper function to increment role count for each player
    const countPlayerRoles = (playerArray, role) => {
        playerArray.forEach(player => {
            if (!playerRoleCount[player.id]) {
                playerRoleCount[player.id] = { roles: [] };
            }
            playerRoleCount[player.id].roles.push(role);
        });
    };

    // Count roles for each player
    countPlayerRoles(tanks, 'tank');
    countPlayerRoles(healers, 'healer');
    countPlayerRoles(dps, 'dps');
    countPlayerRoles(augs, 'aug');

    // Function to remove a player from all roles
    const removeFromAllRoles = (playerId) => {
        tanks = tanks.filter(player => player.id !== playerId);
        healers = healers.filter(player => player.id !== playerId);
        dps = dps.filter(player => player.id !== playerId);
        augs = augs.filter(player => player.id !== playerId);
    };

    // Function to check if a player has multiple roles and prioritize assignment
    const canAssignPlayerToRole = (playerId, role) => {
        const player = playerRoleCount[playerId];
        if (!player || player.roles.length === 1) return true; // No duplicate roles or only one role

        // If the player has multiple roles, prioritize their assignment
        if (role === 'tank' && player.roles.includes('healer') && healers.length < tanks.length) {
            return false; // Don't assign as Tank, we need them as a Healer
        }

        if (role === 'healer' && player.roles.includes('dps') && dps.length > healers.length) {
            return false; // Don't assign as Healer, we need them more as DPS
        }

        if (role === 'dps' && player.roles.includes('aug') && augs.length < dps.length) {
            return false; // Don't assign as DPS if Aug is more needed
        }

        return true; // If no conflicts, allow the assignment
    };

    // Main loop to create groups with the required 1 tank, 1 healer, 3 DPS
    while (tanks.length > 0 && healers.length > 0 && (dps.length + augs.length) >= 3) {
        let group = {
            Tank: null,
            Healer: null,
            DPS: []
        };

        // Assign one Tank
        if (tanks.length > 0) {
            const tankCandidate = tanks.find(player => canAssignPlayerToRole(player.id, 'tank'));
            if (tankCandidate) {
                group.Tank = tankCandidate;
                console.log(`Assigned ${group.Tank.username} as Tank`);
                removeFromAllRoles(group.Tank.id);
            }
        }

        // Assign one Healer
        if (healers.length > 0) {
            const healerCandidate = healers.find(player => canAssignPlayerToRole(player.id, 'healer'));
            if (healerCandidate) {
                group.Healer = healerCandidate;
                console.log(`Assigned ${group.Healer.username} as Healer`);
                removeFromAllRoles(group.Healer.id);
            }
        }

        // Assign 3 DPS (prioritizing Augs)
        let augAdded = false;
        while (group.DPS.length < 3 && (dps.length > 0 || augs.length > 0)) {
            if (augs.length > 0 && !augAdded) {
                const augCandidate = augs.shift();
                console.log(`Assigned ${augCandidate.username} as DPS (Aug)`);
                removeFromAllRoles(augCandidate.id);
                group.DPS.push(augCandidate);
                augAdded = true;
            } else if (dps.length > 0) {
                const dpsCandidate = dps.shift();
                console.log(`Assigned ${dpsCandidate.username} as DPS`);
                removeFromAllRoles(dpsCandidate.id);
                group.DPS.push(dpsCandidate);
            }
        }

        groups.push(group);
    }

    // Handle leftover players (incomplete group)
    if (tanks.length > 0 || healers.length > 0 || dps.length > 0 || augs.length > 0) {
        let leftoverGroup = {
            Tank: tanks.length > 0 ? tanks.shift() : { username: 'No Tank Available' },
            Healer: healers.length > 0 ? healers.shift() : { username: 'No Healer Available' },
            DPS: []
        };

        // Fill remaining DPS
        while (leftoverGroup.DPS.length < 3 && (dps.length > 0 || augs.length > 0)) {
            if (augs.length > 0) {
                let aug = augs.shift();
                console.log(`Assigned ${aug.username} to leftover group as DPS (Aug)`);
                leftoverGroup.DPS.push(aug);
            } else if (dps.length > 0) {
                let selectedDPS = dps.shift();
                console.log(`Assigned ${selectedDPS.username} to leftover group as DPS`);
                leftoverGroup.DPS.push(selectedDPS);
            }
        }

        if (leftoverGroup.DPS.length > 0) {
            console.log("Leftover group being added:", leftoverGroup);
            groups.push(leftoverGroup);
        }
    }

    return groups;
};





const form = async (interaction, collection, options) => {
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
        if (!res) {
            interaction.reply({
                content: 'No groups found for the provided ID',
                ephemeral: true
            });
            return;
        }
        if (tanks.length >= 1 && healers.length >= 1 && (dps.length + aug.length) >= 3) {
            const groups = createGroups(res.players);

            const fields = [];

            for (const [index, group] of groups.entries()) {
                let message = '';
                if (group.Tank) {
                    message += `\n\n${getEmojiForGroup('tanks')} **Tank:** ${group.Tank.username}\n`;
                }
                if (group.Healer) {
                    message += `${getEmojiForGroup('healers')} **Healer:** ${group.Healer.username}\n`;
                }
                if (group.DPS) {
                    message += `${getEmojiForGroup('dps')} **DPS:** ${group.DPS.map(dps => dps.username).join(', ')}\n`;
                }
                fields.push({ name: `Group ${index + 1}`, value: message, inline: false });
            }

            // Inside your interaction handling code
            const embed = new EmbedBuilder()
                .setColor('#0099ff') // Set a color for the embed
                .setTitle('M+ Groups') // Set the title
                .addFields(
                    fields
                )

            interaction.reply({
                embeds: [embed]
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