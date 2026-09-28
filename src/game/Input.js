const SWIPE_DISTANCE = 30
const PULSE_DURATION = 100
const TAP_MAX_DURATION = 250

export class Input {
    keys = {};
    touch = {left: false, right: false, jump: false, slide: false};
    onTap = null 

    #startX = 0
    #startY = 0
    #startTime = 0
    #swiped = false
    #timers = {}

    // mouseX = 0;
    // mouseY = 0;

    constructor() {
        
        window.addEventListener("keydown", (e) => {
            const key = e.key.toLowerCase();

            if (e.repeat || this.keys[key]) return;
            this.keys[key] = true;
        });

        window.addEventListener("keyup", (e) => {
            this.keys[e.key.toLowerCase()] = false;
        });


        //mobile
        window.addEventListener('touchstart', (e) => {
            const t = e.touches[0]
            this.#startX = t.clientX
            this.#startY = t.clientY
            this.#startTime = performance.now()
            this.#swiped = false
        }, { passive: true })

        window.addEventListener('touchmove', (e) => {
            e.preventDefault()
            if (this.#swiped) return

            const t = e.touches[0]
            const dx = t.clientX - this.#startX
            const dy = t.clientY - this.#startY

            if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE_DISTANCE) return

            if (Math.abs(dx) > Math.abs(dy)) this.#pulse(dx > 0 ? 'right' : 'left')
            else this.#pulse(dy < 0 ? 'jump' : 'slide')

            this.#swiped = true
        }, { passive: false })

        window.addEventListener('touchend', () => {
            const isTap = !this.#swiped && performance.now() - this.#startTime < TAP_MAX_DURATION
            if (isTap) this.onTap?.()
        })
    }

    #pulse(name) {
        this.touch[name] = true
        clearTimeout(this.#timers[name])
        this.#timers[name] = setTimeout(() => (this.touch[name] = false), PULSE_DURATION)
    }

    get left() {
        return !!(this.keys["q"] || this.keys["arrowleft"] || this.touch.left);
    }

    get right() {
        return !!(this.keys["d"] || this.keys["arrowright"] || this.touch.right);
    }

    get jump() {
        return !!(this.keys[" "] || this.keys["z"] || this.keys["arrowup"] || this.touch.jump);
    }

    get slide() {
        return !!(this.keys["s"] || this.keys["arrowdown"] || this.touch.slide);
    }

}