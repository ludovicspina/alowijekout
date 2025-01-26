const { AudioPlayer, createAudioPlayer, NoSubscriberBehavior } = require('@discordjs/voice');

function createPlayer() {
    return createAudioPlayer({
        behaviors: {
            noSubscriber: NoSubscriberBehavior.Play,
        },
    });
}

module.exports = { createPlayer };
