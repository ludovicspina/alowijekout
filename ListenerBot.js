require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const { joinVoiceChannel } = require('@discordjs/voice');
const WebSocket = require('ws');
const fs = require('fs');
const { spawn } = require('child_process');

const listener = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates,
    ],
});

// Configurer le WebSocket pour transmettre l'audio
const ws = new WebSocket('ws://localhost:8080'); // Adresse du serveur Speaker
ws.on('open', () => {
    console.log('Connected to the Speaker bot via WebSocket.');
});
ws.on('error', (error) => {
    console.error('WebSocket error on Listener:', error);
});

listener.once('ready', () => {
    console.log(`Listener Bot is ready as ${listener.user.tag}`);
});

listener.on('messageCreate', async (message) => {
    if (message.content === '!listen' && message.member.voice.channel) {
        const connection = joinVoiceChannel({
            channelId: message.member.voice.channel.id,
            guildId: message.guild.id,
            adapterCreator: message.guild.voiceAdapterCreator,
        });

        message.reply('Listener bot has joined the channel and is now listening.');

        // Capture l'audio des utilisateurs dans le salon vocal
        connection.receiver.speaking.on('start', (userId) => {
            console.log(`Receiving audio from user: ${userId}`);
            const audioStream = connection.receiver.subscribe(userId, {
                end: { behavior: 'manual' },
            });

            // Transmettre l'audio via WebSocket
            audioStream.on('data', (chunk) => {
                const ffmpeg = spawn('ffmpeg', [
                    '-f', 's16le', // Format d'entrée
                    '-ar', '48000', // Taux d'échantillonnage
                    '-ac', '2', // Canaux audio
                    '-i', 'pipe:0', // Entrée via pipe
                    '-f', 'opus', // Format de sortie
                    'pipe:1', // Sortie via pipe
                ]);

                ffmpeg.stdin.write(chunk);
                ffmpeg.stdout.on('data', (opusChunk) => {
                    console.log(`Sending encoded audio chunk of size: ${opusChunk.length}`);
                    ws.send(opusChunk); // Envoi des données encodées
                });
            });

            // Facultatif : Enregistrer l'audio localement pour le debug
            audioStream.pipe(fs.createWriteStream(`audio-${userId}.pcm`));
        });
    } else if (message.content === '!listen') {
        message.reply('You must be in a voice channel to use this command.');
    }
});

listener.login(process.env.LISTENER_TOKEN);
