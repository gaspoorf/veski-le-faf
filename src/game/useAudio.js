import { Howl, Howler } from "howler";



const ambient = new Howl({
    src: ["/audio/music3.mp3"],
    loop: true,
    volume: 0.1,
    preload: true,
});


const swoosh = new Howl({
    src: ["/audio/swoosh.mp3"],
    loop: false,
    volume: 0.1,
    preload: true,
});


const coin = new Howl({
    src: ["/audio/coin.mp3"],
    loop: false,
    volume: 0.1,
    preload: true,
});



const hit = new Howl({
    src: ["/audio/hit.mp3"],
    loop: false,
    volume: 0.5,
    preload: true,
});




// const successSound = new Howl({
//     src: ["/audio/success.wav"],
//     volume: 0.8,
//     preload: true,
// });



const defeatSound = new Howl({
    src: ["/audio/defeat.mp3"],
    volume: 0.8,
    preload: true,
});






export const useAudio = () => {
  const initAudioContext = () => {
    if (Howler.ctx && Howler.ctx.state === "suspended") {
      Howler.ctx.resume();
    }
  };

  
    // const playSuccess = () => {
    //     successSound.play();
    // };



    const playCoin = () => {
        coin.play();
    };


    const playDefeat = () => {
        defeatSound.play();
    };

    const playAmbient = () => {
        if (!ambient.playing()) ambient.play();
    };

    const playSwoosh = () => {
        swoosh.play();
    }

    const stopAmbient = () => {
        ambient.stop();
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
    };
};
