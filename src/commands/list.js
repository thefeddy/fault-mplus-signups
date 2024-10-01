
const { EmbedBuilder } = require('discord.js');


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