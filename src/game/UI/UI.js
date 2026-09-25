export class UI {

    #els = {}
    #last = {}

    constructor() {
        const hud = document.createElement('div')

        hud.innerHTML = `
            <div>Score : <span data-ui="score">0</span></div>
            <div>Pièces : <span data-ui="coins">0</span></div>
        `
        document.body.appendChild(hud)

        hud.querySelectorAll('[data-ui]').forEach((el) => {
            this.#els[el.dataset.ui] = el
        })
        
    }

   
    set(name, value) {
        if (this.#last[name] === value) return

        this.#last[name] = value
        this.#els[name].textContent = value
    }

}