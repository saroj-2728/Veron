const { Events } = require('discord.js');
const cron = require('node-cron');
const { checkBookDueDates } = require('../utils/getBooksData.js')
const connectToDatabase = require('../lib/mongodb.js')

module.exports = {
	name: Events.ClientReady,
	once: true,
	async execute(client) {
		logger.info(`Ready! Logged in as ${client.user.tag}`);

		try {
			await connectToDatabase();
			logger.info('Successfully connected to database');
		}
		catch (error) {
			logger.error('Failed to connect to database:', { error: error.message });
		}

		// This schedules the job for 8:45 AM Nepal time
		const dueDateJob = cron.schedule('45 8 * * *', () => {
			logger.info('Running daily book due date check...');
			checkBookDueDates(client)
				.then(() => {
					logger.info('Book due date check completed.');

					// Send a ping immediately after the job completes
					// This prevents the service from shutting down after the daily task
					sendPing(true);
				})
				.catch(err => logger.error('Error during book due date check:', { error: err.message }));
		}, {
			scheduled: true,
			timezone: "Asia/Kathmandu",
		});

		// Keep the server alive by pinging it every 10 minutes
		const pingJob = cron.schedule('*/10 * * * *', async () => {
			sendPing();
		});

		async function sendPing(force = false) {
			try {
				const appUrl = process.env.RENDER_EXTERNAL_URL || 'http://localhost:3000';
				// Only log pings if forced (like after important jobs) or if in debug mode
				if (force || process.env.LOG_LEVEL === 'debug') {
					logger.info('Sending ping to keep service alive');
				}
				await fetch(appUrl);
				if (force || process.env.LOG_LEVEL === 'debug') {
					logger.info('Ping successful');
				}
			}
			catch (error) {
				// Always log ping failures
				logger.error('Ping failed:', { error: error.message });
			}
		}

		client.jobs = {
			dueDateJob,
			pingJob,
		};

		logger.info('All scheduled jobs initialized successfully');
	},
};