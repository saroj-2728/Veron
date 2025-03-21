const fs = require('node:fs')
const path = require('node:path')
const { Client, Collection, GatewayIntentBits } = require('discord.js');
const express = require('express')

require('dotenv').config()
const token = process.env.DISCORD_BOT_TOKEN

if (!token) {
	console.error('Discord bot token is required. Please set the DISCORD_BOT_TOKEN environment variable.')
	process.exit(1)
}

const PORT = process.env.PORT || 3000

// Initialize the express server
const app = express()
app.get('/', (req, res) => {
	res.send('Bot is alive!')
})


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
	console.error('Discord client error:', error);
	// Don't exit process, try to reconnect
});

client.on('disconnect', () => {
	console.warn('Discord bot disconnected!');
	// Attempt to reconnect after a short delay
	setTimeout(() => {
		console.log('Attempting to reconnect Discord bot...');
		client.login(token).catch(err => console.error('Failed to reconnect:', err));
	}, 5000);
});

// Start both services with proper error handling
async function startServices() {
	// Start Express server
	const server = app.listen(PORT, () => {
		console.log(`Express server is running on port ${PORT}`);
	});

	server.on('error', (error) => {
		console.error('Express server error:', error);
	});

	// Connect Discord bot
	try {
		await client.login(token);
		console.log('Discord bot login successful');
	} 
	catch (error) {
		console.error('Failed to login Discord bot:', error);
		// Don't exit process, retry after a delay
		setTimeout(startServices, 10000);
	}
}

// Start everything
startServices();

// Handle process termination gracefully
process.on('SIGTERM', () => {
	console.log('SIGTERM received. Shutting down gracefully...');
	client.destroy();
	process.exit(0);
});

process.on('SIGINT', () => {
	console.log('SIGINT received. Shutting down gracefully...');
	client.destroy();
	process.exit(0);
});

// Handle uncaught exceptions to prevent crashes
process.on('uncaughtException', (err) => {
	console.error('Uncaught exception:', err);
	// Keep the process alive
});