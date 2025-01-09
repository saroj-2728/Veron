const { Events, REST, Routes } = require('discord.js');
const path = require('node:path')
const fs = require('node:fs')

require('dotenv').config()
const token = process.env.DISCORD_BOT_TOKEN
const clientId = process.env.DISCORD_APP_CLIENT_ID

module.exports = {
    name: Events.GuildCreate,
    async execute(guild) {
        console.log(`Veron joined guild ${guild.name} at timestamp ${guild.joinedTimestamp}`)
        const guildId = guild.id;

        const commands = [];

        const foldersPath = path.join(__dirname, '../commands');
        const commandFolders = fs.readdirSync(foldersPath);

        for (const folder of commandFolders) {

            const commandsPath = path.join(foldersPath, folder);
            const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

            for (const file of commandFiles) {
                const filePath = path.join(commandsPath, file);
                const command = require(filePath);
                if ('data' in command && 'execute' in command) {
                    commands.push(command.data.toJSON());
                } 
                else {
                    console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
                }
            }
        }
        const rest = new REST().setToken(token);

        try {
            console.log(`Started refreshing ${commands.length} application (/) commands for guild ${guild.name}.`);

            const data = await rest.put(
                Routes.applicationGuildCommands(clientId, guildId),
                { body: commands },
            );

            console.log(`Successfully reloaded ${data.length} application (/) commands for guild ${guild.name}.`);
        }
        catch (error) {
            console.error("An error occured while deploying commands for all guilds: ", error);
        }

    },
}