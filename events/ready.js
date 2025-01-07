const { Events } = require('discord.js');
const cron = require('node-cron');
const { checkBookDueDates } = require('../utils/getBooksData.js')

module.exports = {
	name: Events.ClientReady,
	once: true,
	execute(client) {
		console.log(`Ready! Logged in as ${client.user.tag}`);

		cron.schedule('23 3 * * *', () => {
			console.log('Running daily book due date check...');
			checkBookDueDates()
				.then(() => console.log('Book due date check completed.'))
				.catch(err => console.error('Error during book due date check:', err));
		});
	},
};