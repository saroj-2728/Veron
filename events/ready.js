const { Events } = require('discord.js');
const cron = require('node-cron');
const { checkBookDueDates } = require('../utils/getBooksData.js')
const connectToDatabase = require('../lib/mongodb.js')

module.exports = {
	name: Events.ClientReady,
	once: true,
	async execute(client) {
		console.log(`Ready! Logged in as ${client.user.tag}`);

		await connectToDatabase()

		// 1 45 AM in US West (Oregon, USA) (server location hosted at railway) = 8 45 AM in Nepal
		cron.schedule('45 1 * * *', () => {
			console.log('Running daily book due date check...');
			checkBookDueDates(client)
				.then(() => console.log('Book due date check completed.'))
				.catch(err => console.error('Error during book due date check:', err));
		});
	},
};