import { Howl, Howler } from "howler";



const MUSIC_VOLUME = 0.1;
const FADE_DURATION = 2000;
let lobbyFadingOut = false;

const ambient = new Howl({
    src: ["/audio/music.ogg"],
    loop: true,
    volume: 0.1,
    preload: true,
});

const lobby = new Howl({
    src: ["/audio/lobby.ogg"],
    loop: true,
    volume: 0.35,
    preload: true,
});



const swoosh = new Howl({
    src: ["/audio/swoosh.ogg"],
    loop: false,
    volume: 0.3,
    preload: true,
});


const coin = new Howl({
    src: ["/audio/coin.ogg"],
    loop: false,
    volume: 0.1,
    preload: true,
});



const hit = new Howl({
    src: ["/audio/hit.ogg"],
    loop: false,
    volume: 0.5,
    preload: true,
});



const defeatSound = new Howl({
    src: ["/audio/defeat.ogg"],
    volume: 0.8,
    preload: true,
});






export const useAudio = () => {
    const initAudioContext = () => {
        if (Howler.ctx && Howler.ctx.state === "suspended") {
            Howler.ctx.resume();
        }
    };

    const playCoin = () => {
        coin.play();
    };


    const playDefeat = () => {
        defeatSound.play();
    };

    const playAmbient = () => {
        if (ambient.playing()) return;
        ambient.volume(0);
        ambient.play();
        ambient.fade(0, MUSIC_VOLUME, FADE_DURATION);
    };

    const playLobby = () => {
        if (lobbyFadingOut) {
            lobbyFadingOut = false;
            lobby.off("fade");
            lobby.fade(lobby.volume(), MUSIC_VOLUME, FADE_DURATION);
            return;
        }
        if (!lobby.playing()) lobby.play();
    };

    const playSwoosh = () => {
        swoosh.play();
    }

    const stopAmbient = () => {
        ambient.stop();
    };
    const stopLobby = () => {
        if (!lobby.playing() || lobbyFadingOut) return;
        lobbyFadingOut = true;
        lobby.fade(lobby.volume(), 0, FADE_DURATION);
        lobby.once("fade", () => {
            lobbyFadingOut = false;
            lobby.stop();
            lobby.volume(MUSIC_VOLUME);
        });
    };

    const stopDefeat = () => {
        defeatSound.stop();
    }

    const playHit = () => {
        hit.play();
    };

  

    return {
        initAudioContext,
        playHit,
        // playSuccess,
        playDefeat,
        playAmbient,
        stopAmbient,
        stopDefeat,
        playSwoosh,
        playCoin,
        playLobby,
        stopLobby,
    };
};
