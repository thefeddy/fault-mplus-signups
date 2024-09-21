const updatePlayers = async (document, user, group, collection) => {
    const { players, post } = document;
    const playerIndex = players[group].findIndex(obj => obj.id === user.id);
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
    );

    return action;
}

const join = async (interaction, collection) => {
    const { customId, user } = interaction;
    const id = interaction.message.interaction.id;

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
    const update = updatePlayers(document, user, customId, collection).then((res) => {
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