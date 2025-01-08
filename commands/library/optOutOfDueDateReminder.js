const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { Roll } = require('../../models/rollNumber.js')

module.exports = {
    data: new SlashCommandBuilder()
        .setName('opt-out-of-due-date-reminders')
        .setDescription('Opt out of due date reminders about the books issued from the library.')
        .addStringOption(option =>
            option.setName('roll')
                .setDescription('Your college roll number')
                .setRequired(true)
                .setMaxLength(9)
                .setMinLength(9)
        ),

    async execute(interaction) {
        const roll = interaction.options.getString('roll')
        const userId = interaction.user.id;

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        try {
            const existingUser = await Roll.findOneAndDelete({ userId, roll });

            if (!existingUser) {
                await interaction.editReply(`You haven't been registered for due date reminders!`);
            }
            else {
                await interaction.editReply(`You have successfully opted out of due date reminders about the books issued from the library.`);
            }
        }
        catch (error) {
            console.error('Error while saving roll to database: ', error);
            await interaction.editReply(`Something went wrong! Please try again`);
        }
    }
}