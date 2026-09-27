import { useAudio } from './useAudio.js'

const audio = useAudio()
const MOVE_KEYS = ["q", "d", " ", "z", "s", "arrowleft", "arrowright", "arrowup", "arrowdown"]


export class Input {
    keys = {};
    mouseX = 0;
    mouseY = 0;

    constructor() {
        audio.initAudioContext()
        window.addEventListener("keydown", (e) => {
            const key = e.key.toLowerCase();

            if (e.repeat || this.keys[key]) return;
            this.keys[key] = true;

            if (MOVE_KEYS.includes(key)) audio.playSwoosh()
        });

        window.addEventListener("keyup", (e) => {
            this.keys[e.key.toLowerCase()] = false;
        });
    }

    get left() {
        return !!(this.keys["q"] || this.keys["arrowleft"]);
    }

    get right() {
        return !!(this.keys["d"] || this.keys["arrowright"]);
    }

    get jump() {
        return !!(this.keys[" "] || this.keys["z"] || this.keys["arrowup"]);
    }

    get slide() {
        return !!(this.keys["s"] || this.keys["arrowdown"]);
    }

}