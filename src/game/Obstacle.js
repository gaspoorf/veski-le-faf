import * as THREE from 'three/webgpu'
import { color, mix, positionLocal, normalView, step, fract, float } from 'three/tsl'
import { LANES, WORLD_RADIUS } from './Config.js'

const TWO_PI = Math.PI * 2


const SPAWN_ANGLE = -0.85 * Math.PI
const DESPAWN_ANGLE = 0.6 * Math.PI
const HIT_ANGLE = 0.1
const HIT_LANE_DISTANCE = 0.15


function wrapAngle(a) {
    a = (a + Math.PI) % TWO_PI
    if (a < 0) a += TWO_PI
    return a - Math.PI
}

function createObstacleMaterial() {
    const material = new THREE.MeshStandardNodeMaterial()

    material.colorNode = color('red')

    return material
}

export class Obstacles extends THREE.Group {

    spacing = 0.9

    #pool = []
    #active = []
    #lastRotation = 0
    #sinceLastRow = 0

    constructor(poolSize = 24) {
        super()

        // obstacle 
        const geometry = new THREE.BoxGeometry(0.16, 0.2, 0.12)
        geometry.translate(0, 0, 0)
        const material = createObstacleMaterial()

        for (let i = 0; i < poolSize; i++) {
            const mesh = new THREE.Mesh(geometry, material)
            mesh.visible = false
            mesh.userData = { lane: 0, angle: 0 }
            this.add(mesh)
            this.#pool.push(mesh)
        }
    }



    update(rotation) {
       
        this.#sinceLastRow += rotation - this.#lastRotation
        this.#lastRotation = rotation

        if (this.#sinceLastRow >= this.spacing) {
            this.#sinceLastRow -= this.spacing
            this.#spawnRow(rotation)
        }

        //recyclage 
        for (let i = this.#active.length - 1; i >= 0; i--) {
            const mesh = this.#active[i]
            if (this.#worldAngle(mesh, rotation) > DESPAWN_ANGLE) {
                this.#release(mesh, i)
            }
        }
    }

    // collision
    checkCollision(playerX, rotation) {
        for (const mesh of this.#active) {
            if (Math.abs(LANES[mesh.userData.lane] - playerX) > HIT_LANE_DISTANCE) continue
            if (Math.abs(this.#worldAngle(mesh, rotation)) < HIT_ANGLE) return mesh
        }
        return null
    }

   
    reset(rotation = 0) {
        for (let i = this.#active.length - 1; i >= 0; i--) this.#release(this.#active[i], i)
        this.#lastRotation = rotation
        this.#sinceLastRow = 0
    }

    #spawnRow(rotation) {


        const localAngle = SPAWN_ANGLE - rotation

        for (const lane of this.#randomPattern()) {
            const mesh = this.#pool.pop()
            if (!mesh) return
            this.#place(mesh, lane, localAngle)
            this.#active.push(mesh)
        }
    }

   
    #randomPattern() {
        const lanes = LANES.map((_, i) => i)
        for (let i = lanes.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1))
            ;[lanes[i], lanes[j]] = [lanes[j], lanes[i]]
        }
        const blocked = Math.random() < 0.6 ? 1 : 2
        return lanes.slice(0, blocked)
    }



    #place(mesh, lane, angle) {
        const x = LANES[lane]

        const r = Math.sqrt(WORLD_RADIUS * WORLD_RADIUS - x * x)

        mesh.position.set(x, Math.cos(angle) * r, Math.sin(angle) * r)
        mesh.rotation.set(angle, 0, 0)
        mesh.userData.lane = lane
        mesh.userData.angle = angle
        mesh.visible = true
    }


    #release(mesh, index) {
        mesh.visible = false
        this.#active.splice(index, 1)
        this.#pool.push(mesh)
    }


    #worldAngle(mesh, rotation) {
        return wrapAngle(mesh.userData.angle + rotation)
    }
    
}