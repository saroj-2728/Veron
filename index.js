const fs = require('node:fs')
const path = require('node:path')
const { Client, Collection, GatewayIntentBits } = require('discord.js');
const express = require('express')
const winston = require('winston')

require('dotenv').config()
const token = process.env.DISCORD_BOT_TOKEN


// Configure Winston logger based on environment
const logger = winston.createLogger({
	level: process.env.LOG_LEVEL || 'info',
	format: winston.format.combine(
		// Only include timestamps in development
		...(process.env.NODE_ENV !== 'production' ? [winston.format.timestamp()] : []),
		winston.format.printf(({ level, message, timestamp, ...meta }) => {
			const prefix = process.env.NODE_ENV !== 'production' ? `${timestamp || ''} [${level}]: ` : '';
			const suffix = Object.keys(meta).length ? ' ' + JSON.stringify(meta) : '';
			return `${prefix}${message}${suffix}`;
		}),
	),
	transports: [
		new winston.transports.Console({
			format: winston.format.combine(
				winston.format.colorize(),
				// Only include timestamps in development
				...(process.env.NODE_ENV !== 'production' ? [winston.format.timestamp()] : []),
				winston.format.printf(({ level, message, timestamp, ...meta }) => {
					const prefix = process.env.NODE_ENV !== 'production' ? `${timestamp || ''} [${level}]: ` : '';
					const suffix = Object.keys(meta).length ? ' ' + JSON.stringify(meta) : '';
					return `${prefix}${message}${suffix}`;
				})),
		}),
	],
});

// Make logger available globally
global.logger = logger;


if (!token) {
	console.error('Discord bot token is required. Please set the DISCORD_BOT_TOKEN environment variable.')
	process.exit(1)
}

const PORT = process.env.PORT || 3000

// Initialize the express server
const app = express()

// Add request logging middleware with conditional logging
app.use((req, res, next) => {
	if (req.url === '/' && req.method === 'GET') {
		// Only log health check endpoint access in debug mode
		if (process.env.LOG_LEVEL === 'debug') {
			logger.info(`Health check endpoint accessed`);
		}
	}
	else {
		// Always log other endpoints
		logger.info(`HTTP ${req.method} ${req.url}`);
	}
	next();
});

app.get('/', (req, res) => {
	res.send(`Bot is alive! Server time: ${new Date().toISOString()}`);
});


// Initialize the Discord client
const client = new Client({
	intents: [GatewayIntentBits.Guilds, GatewayIntentBits.DirectMessages],
});
client.commands = new Collection();


// Load all commands
const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
	const commandsPath = path.join(foldersPath, folder);
	const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
	for (const file of commandFiles) {
		const filePath = path.join(commandsPath, file);
		const command = require(filePath);

		if ('data' in command && 'execute' in command) {
			client.commands.set(command.data.name, command);
		}
		else {
			console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
		}
	}
}

// Load all events
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
	const filePath = path.join(eventsPath, file);
	const event = require(filePath);
	if (event.once) {
		client.once(event.name, (...args) => event.execute(...args));
	}
	else {
		client.on(event.name, (...args) => event.execute(...args));
	}
}

// Set up error handlers for Discord bot
client.on('error', (error) => {
	logger.error('Discord client error:', { error: error.message });
	// Don't exit process, try to reconnect
});

client.on('disconnect', () => {
	logger.warn('Discord bot disconnected!');
	// Attempt to reconnect after a short delay
	setTimeout(() => {
		logger.info('Attempting to reconnect Discord bot...');
		client.login(token).catch(err => logger.error('Failed to reconnect:', { error: err.message }));
	}, 5000);
});


// Start both services with proper error handling
async function startServices() {
	// Start Express server
	const server = app.listen(PORT, () => {
		logger.info(`Express server is running on port ${PORT}`);
	});

	server.on('error', (error) => {
		logger.error('Express server error:', { error: error.message });
	});

	// Connect Discord bot
	try {
		await client.login(token);
		logger.info('Discord bot logged in successfully');
	}
	catch (error) {
		logger.error('Failed to login Discord bot:', { error: error.message });
		// Don't exit process, retry after a delay
		setTimeout(startServices, 10000);
	}
}

// Start everything
startServices();


// Handle process termination gracefully
process.on('SIGTERM', () => {
	logger.info('SIGTERM received. Shutting down gracefully...');
	client.destroy();
	process.exit(0);
});

process.on('SIGINT', () => {
	logger.info('SIGINT received. Shutting down gracefully...');
	client.destroy();
	process.exit(0);
});

// Handle uncaught exceptions to prevent crashes
process.on('uncaughtException', (err) => {
	logger.error('Uncaught exception:', { error: err.message, stack: err.stack });
});

process.on('unhandledRejection', (reason) => {
	logger.error('Unhandled rejection at:', { reason: String(reason) });
});