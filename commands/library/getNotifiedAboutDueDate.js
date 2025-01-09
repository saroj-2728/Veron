const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { Roll } = require('../../models/rollNumber.js')

module.exports = {
    data: new SlashCommandBuilder()
        .setName('get-notified-about-due-date')
        .setDescription('Get notified about the books due date issued from the libraray')
        .addStringOption(option =>
            option.setName('roll')
                .setDescription('Your college roll number')
                .setRequired(true)
                .setMaxLength(9)
                .setMinLength(9)),

    async execute(interaction) {
        const roll = interaction.options.getString('roll')
        const userId = interaction.user.id;

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        try {
            const existingUser = await Roll.findOne({ roll });

            if (existingUser) {
                await interaction.editReply(`You've already opted in for book due date reminders!`);
            }
            else {
                const newUser = new Roll({ userId, roll });
                await newUser.save()
                await interaction.editReply(`You have successfully registered for book due date reminders. You will receive a message if any of your books issued from the library have a due date of less than 5 days.`);
            }
        }
        catch (error) {
            console.error('Error while saving roll to database: ', error);
            await interaction.editReply(`Something went wrong! Please try again`);
        }
    },
}