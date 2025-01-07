const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { addUser } = require('../../utils/getBooksData.js')

module.exports = {
    data: new SlashCommandBuilder()
        .setName('getnotifiedaboutduedate')
        .setDescription('Get notified about books due date in the libraray')
        .addStringOption(option =>
            option.setName('roll')
                .setDescription('Your college roll number')
                .setRequired(true)
                .setMaxLength(9)
                .setMinLength(9)
        ),

    async execute(interaction) {
        const roll = interaction.options.getString('roll')

        addUser(interaction.user.id, roll);

        await interaction.reply(`You have been successfully registered for book due date notifications.`);
    }
}