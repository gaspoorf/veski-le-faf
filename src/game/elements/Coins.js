import * as THREE from 'three/webgpu'
import { LANES, WORLD_RADIUS } from '../Config.js'
import { clayify} from '../effects/Clay.js'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const TWO_PI = Math.PI * 2

const SPAWN_ANGLE = -0.85 * Math.PI
const DESPAWN_ANGLE = 0.6 * Math.PI
// const HIT_ANGLE = 0.1
// const HIT_LANE_DISTANCE = 0.15

const COIN_SIZE = 0.05
const COIN_HEIGHT = 0.08
const SPIN_SPEED = 3  


const TRAIL_LENGTH = 5
const TRAIL_GAP = 0.06
 
// Ramassage
const PICK_ANGLE = 0.05
const PICK_LANE_DISTANCE = 0.1
const PICK_HEIGHT = 0.15
const COLLECT_DURATION = 0.25



// const HEAD_NAMES = ['perso1']

function wrapAngle(a) {
    a = (a + Math.PI) % TWO_PI
    if (a < 0) a += TWO_PI
    return a - Math.PI
}

export class Coins extends THREE.Group {

    spacing = 1.2

    #pool = []
    #active = []
    #lastRotation = 0
    #sinceLastRow = 0
    #collecting = []
    #time = 0

  

    async loadModel(url, poolSize = 40) {
        const loader = new GLTFLoader()
        const gltf = await loader.loadAsync('/models/coin.glb')
        const model = gltf.scene

        clayify(model, { saturationAmount: 1.4, brightness: 1.3 })

        const box = new THREE.Box3().setFromObject(model)
        const size = box.getSize(new THREE.Vector3())
        
        model.scale.setScalar(COIN_SIZE / Math.max(size.x, size.y, size.z))
        box.setFromObject(model)
        model.position.sub(box.getCenter(new THREE.Vector3()))


        const spinner = new THREE.Group()
        spinner.position.y = COIN_HEIGHT
        spinner.add(model)
 
        const template = new THREE.Group()
        template.add(spinner)


        for (let i = 0; i < poolSize; i++) {
            const coin = template.clone()
            coin.visible = false
            coin.userData = { lane: 0, angle: 0, spinner: coin.children[0], collectTime: 0 }
            this.add(coin)
            this.#pool.push(coin)
        }

    }



    update(rotation, delta) {
       
        this.#time += delta

        this.#sinceLastRow += rotation - this.#lastRotation
        this.#lastRotation = rotation

        if (this.#sinceLastRow >= this.spacing) {
            this.#sinceLastRow -= this.spacing
            this.#spawnTrail(rotation)
        }

        //recyclage 
        for (let i = this.#active.length - 1; i >= 0; i--) {
            const coin = this.#active[i]
            const { spinner, angle } = coin.userData
 
            if (this.#worldAngle(coin, rotation) > DESPAWN_ANGLE) {
                this.#release(coin, this.#active, i)
                continue
            }
 
            spinner.rotation.y += SPIN_SPEED * delta
            spinner.position.y = COIN_HEIGHT + Math.sin(this.#time * 4 + angle * 30) * 0.008
        }


        // ramassage

        for (let i = this.#collecting.length - 1; i >= 0; i--) {
            const coin = this.#collecting[i]
            const { spinner } = coin.userData
 
            coin.userData.collectTime += delta
            const t = Math.min(coin.userData.collectTime / COLLECT_DURATION, 1)
 
            spinner.position.y = COIN_HEIGHT + t * 0.12
            spinner.scale.setScalar((1 + Math.sin(t * Math.PI) * 0.6) * (1 - t))
            spinner.rotation.y += SPIN_SPEED * 4 * delta
 
            if (t >= 1) {
                spinner.scale.setScalar(1)
                this.#release(coin, this.#collecting, i)
            }
        }

    }


    
    collect(playerX, playerY, rotation) {
        let count = 0
 
        for (let i = this.#active.length - 1; i >= 0; i--) {
            const coin = this.#active[i]
 
            if (Math.abs(LANES[coin.userData.lane] - playerX) > PICK_LANE_DISTANCE) continue
            if (Math.abs(playerY - COIN_HEIGHT) > PICK_HEIGHT) continue
            if (Math.abs(this.#worldAngle(coin, rotation)) > PICK_ANGLE) continue
 
            this.#active.splice(i, 1)
            coin.userData.collectTime = 0
            this.#collecting.push(coin)
            count++
        }
 
        return count
    }

   
    reset(rotation = 0) {
        for (let i = this.#active.length - 1; i >= 0; i--) this.#release(this.#active[i], this.#active, i)
        for (let i = this.#collecting.length - 1; i >= 0; i--) this.#release(this.#collecting[i], this.#collecting, i)
        this.#lastRotation = rotation
        this.#sinceLastRow = 0
    }



    #spawnTrail(rotation) {
        const lane = Math.floor(Math.random() * LANES.length)
 
        for (let k = 0; k < TRAIL_LENGTH; k++) {
            const coin = this.#pool.pop()
            if (!coin) return
            this.#place(coin, lane, SPAWN_ANGLE - rotation - k * TRAIL_GAP)
            this.#active.push(coin)
        }

    }



    #place(coin, lane, angle) {
        const x = LANES[lane]

        const r = Math.sqrt(WORLD_RADIUS * WORLD_RADIUS - x * x)

        coin.position.set(x, Math.cos(angle) * r, Math.sin(angle) * r)
        coin.rotation.set(angle, 0, 0)
        coin.userData.lane = lane
        coin.userData.angle = angle
        coin.visible = true
    }


    #release(coin, list, index) {
        coin.visible = false
        list.splice(index, 1)
        this.#pool.push(coin)
    }


    #worldAngle(coin, rotation) {
        return wrapAngle(coin.userData.angle + rotation)
    }
    
}