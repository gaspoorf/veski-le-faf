export class Input {
    keys = {};
    mouseX = 0;
    mouseY = 0;

    constructor() {
        window.addEventListener("keydown", (e) => {
            this.keys[e.key.toLowerCase()] = true;
            console.log(this.keys);
        });

        window.addEventListener("keyup", (e) => {
            this.keys[e.key.toLowerCase()] = false;
        });
    }

    // get forward() {
    //     return this.keys["z"];
    // }

    // get back() {
    //     return this.keys["s"];
    // }

    get left() {
        return this.keys["q"];
    }

    get right() {
        return this.keys["d"];
    }

    get jump() {
        return this.keys[" "];
    }

}