const { Events } = require('discord.js');
const cron = require('node-cron');
const { checkBookDueDates } = require('../utils/getBooksData.js')
const connectToDatabase = require('../lib/mongodb.js')

module.exports = {
	name: Events.ClientReady,
	once: true,
	async execute(client) {
		console.log(`Ready! Logged in as ${client.user.tag}`);

		try {
			await connectToDatabase();
			console.log('Successfully connected to database');
		}
		catch (error) {
			console.error('Failed to connect to database:', error);
		}

		// This schedules the job for 8:45 AM Nepal time
		const dueDateJob = cron.schedule('45 8 * * *', () => {
			console.log('Running daily book due date check...');
			checkBookDueDates(client)
				.then(() => console.log('Book due date check completed.'))
				.catch(err => console.error('Error during book due date check:', err));
		}, {
			scheduled: true,
			timezone: "Asia/Kathmandu",
		});

		// Keep the server alive by pinging it every 10 minutes
		const appUrl = process.env.RENDER_EXTERNAL_URL || 'http://localhost:3000';
		const pingJob = cron.schedule('*/10 * * * *', async () => {
			try {
				// console.log(`Pinging service at ${new Date().toISOString()}`);
				await fetch(appUrl);
				// const text = await response.text();
				// console.log(`Ping successful: ${text}`);
			}
			catch (error) {
				console.error('Ping failed:', error.message);
			}
		});

		client.jobs = {
			dueDateJob,
			pingJob,
		};
	},
};