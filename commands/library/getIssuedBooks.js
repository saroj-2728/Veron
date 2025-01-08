const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { getBooksData } = require('../../utils/getBooksData.js')

module.exports = {
    data: new SlashCommandBuilder()
        .setName('getbooks')
        .setDescription('Get the details of the books issued from the library!')
        .addStringOption(option =>
            option.setName('roll')
                .setDescription('Your college roll number')
                .setRequired(true)
                .setMaxLength(9)
                .setMinLength(9)),

    async execute(interaction) {
        const roll = interaction.options.getString('roll')

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        try {
            const response = await getBooksData(roll)

            if (!response.success) {
                return interaction.editReply(response.message)
            }

            const books = response.message;

            if (books.length === 0) {
                return interaction.editReply('No books found.');
            }
            
            const formattedBooks = books
                .map(
                    (book, index) =>
                        `**${index + 1}. Title:** ${book.title}\n` +
                        `   **Accession No:** ${book.accessionNo}\n` +
                        `   **Issue Date:** ${book.issueDate}\n` +
                        `   **Return Date:** ${book.returnDate}\n` +
                        `   **Overdue:** ${book.overdue}`
                )
                .join('\n\n');

            interaction.editReply(`Here is the list of books issued to ${roll}:\n\n${formattedBooks}`);
        }
        catch (error) {
            console.error(error);
            interaction.editReply('An error occurred while fetching the book list. Please try again later.');
        }
    }
};

