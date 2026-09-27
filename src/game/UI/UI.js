export class UI {

    #els = {}
    #last = {}

    constructor() {
        const hud = document.createElement('div')

        hud.innerHTML = `
            <div class="score"><span data-ui="score">0</span> <img class="icon-score"src="/img/faf.webp" alt="coin"></div>
            <div class="coins"><span data-ui="coins">0</span> <img class="icon-coin"src="/img/coin.webp" alt="coin"></div>
        `
        document.body.appendChild(hud)

        this.score = hud.querySelector('.score')
        this.coins = hud.querySelector('.coins')

        hud.querySelectorAll('[data-ui]').forEach((el) => {
            this.#els[el.dataset.ui] = el
        })
        
    }

    show() {
        this.score.classList.add('show')
        this.coins.classList.add('show')
    }

    hide() {
        this.score.classList.remove('show')
        this.coins.classList.remove('show')
    }

    set(name, value) {
        if (this.#last[name] === value) return

        this.#last[name] = value
        this.#els[name].textContent = value
    }

}