import { DefaultLoadingManager } from 'three/webgpu'

export class Loader {
    #el = document.querySelector('.loader')
    #textEl = this.#el.querySelector('.text')
    #enterBtn = this.#el.querySelector('.enter-button')
    #progress = 0

    constructor() {
        this.setProgress(0)

        DefaultLoadingManager.onProgress = (url, loaded, total) => {
            this.setProgress(loaded / total)
        }
    }

    setProgress(value) {
        this.#progress = Math.max(this.#progress, value)
        this.#textEl.textContent = `${Math.round(this.#progress * 100)}%`
    }

    waitForEnter() {
        this.setProgress(1)
        this.#el.classList.add('ready')

        return new Promise((resolve) => {
            this.#enterBtn.addEventListener('click', () => {
                this.hide()
                resolve()
            }, { once: true })
        })
    }

    show() {
        this.#el.classList.remove('hide')
    }

    hide() {
        this.#el.classList.add('hide')
    }
}
