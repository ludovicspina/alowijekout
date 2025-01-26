require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource } = require('@discordjs/voice');
const WebSocket = require('ws');

const speaker = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates,
    ],
});

// Serveur WebSocket pour recevoir l'audio
const wss = new WebSocket.Server({ port: 8080 });

wss.on('connection', (socket) => {
    console.log('Speaker bot connected to a Listener bot.');
    socket.on('error', (error) => {
        console.error('WebSocket error on Speaker:', error);
    });
});

speaker.on('messageCreate', async (message) => {
    if (message.content === '!speak' && message.member.voice.channel) {
        const connection = joinVoiceChannel({
            channelId: message.member.voice.channel.id,
            guildId: message.guild.id,
            adapterCreator: message.guild.voiceAdapterCreator,
        });

        const audioPlayer = createAudioPlayer();
        connection.subscribe(audioPlayer);

        message.reply('Speaker bot has joined the channel and is ready to play audio.');

        // Réception de l'audio via WebSocket
        wss.on('connection', (socket) => {
            console.log('Speaker bot connected to Listener bot via WebSocket.');

            socket.on('message', (data) => {
                console.log(`Received encoded audio chunk of size: ${data.length}`);
                const audioResource = createAudioResource(Buffer.from(data), { inputType: 'opus' });
                audioPlayer.play(audioResource);
            });
        });
    } else if (message.content === '!speak') {
        message.reply('You must be in a voice channel to use this command.');
    }
});

speaker.login(process.env.SPEAKER_TOKEN);
