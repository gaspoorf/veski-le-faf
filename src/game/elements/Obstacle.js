import * as THREE from 'three/webgpu'
import { color, mix, positionLocal, normalView, step, fract, float, texture, positionGeometry, time, mx_noise_float } from 'three/tsl'
import { LANES, WORLD_RADIUS } from '../Config.js'
import { clone as cloneModel } from 'three/addons/utils/SkeletonUtils.js'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

import { clayify} from '../effects/Clay.js'

const TWO_PI = Math.PI * 2


const SPAWN_ANGLE = -0.85 * Math.PI
const DESPAWN_ANGLE = 0.6 * Math.PI
const HIT_ANGLE = 0.1
const HIT_LANE_DISTANCE = 0.15

const HEAD_SIZE = 0.18

const OBSTACLE_HEIGHT = 0.15

// const MODEL_NAMES = ['marine', 'zemmour']




function wrapAngle(a) {
    a = (a + Math.PI) % TWO_PI
    if (a < 0) a += TWO_PI
    return a - Math.PI
}



export class Obstacles extends THREE.Group {

    spacing = 0.9

    #pools = []
    #active = []
    #lastRotation = 0
    #sinceLastRow = 0
    // #heads = []


    
    async load(urls, poolPerModel = 16) {
        const loader = new GLTFLoader()
        const gltfs = await Promise.all(urls.map((url) => loader.loadAsync(url)))
 
        gltfs.forEach((gltf, modelIndex) => {
            const model = gltf.scene
            clayify(model, { saturationAmount: 1.4, brightness: 1.3 })
 
            const box = new THREE.Box3().setFromObject(model, true)
            const size = box.getSize(new THREE.Vector3())
            model.scale.setScalar(OBSTACLE_HEIGHT / size.y)
            model.rotation.set(0, -Math.PI / 2, 0)

            

            box.setFromObject(model, true)
            const center = box.getCenter(new THREE.Vector3())
            model.position.set(-center.x, -box.min.y, -center.z)
 

            const template = new THREE.Group()
            template.add(model)
 
            const pool = []

            for (let i = 0; i < poolPerModel; i++) {

                const obstacle = cloneModel(template)
                obstacle.visible = false
                obstacle.userData = { lane: 0, angle: 0, modelIndex }
                this.add(obstacle)
                pool.push(obstacle)
            }

            this.#pools.push(pool)
        })
    }
 

    



    // constructor(poolSize = 24) {
    //     super()

    //     // obstacle 
    //     this.#heads = HEAD_NAMES.map((name, i) => createHeadMaterials(name, i * 17.3))

    //     const geometry = new THREE.BoxGeometry(HEAD_SIZE, HEAD_SIZE, HEAD_SIZE, 12, 12, 12)
    //     // geometry.translate(0, 0, 0)
    //     // const material = createObstacleMaterial()

    //     for (let i = 0; i < poolSize; i++) {
    //         const mesh = new THREE.Mesh(geometry, this.#heads[0])
    //         mesh.visible = false
    //         mesh.userData = { lane: 0, angle: 0 }
    //         this.add(mesh)
    //         this.#pool.push(mesh)
    //     }
    // }



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

        if (this.#pools.length === 0) return


        const localAngle = SPAWN_ANGLE - rotation

        
        for (const lane of this.#randomPattern()) {

            const pool = this.#pools[Math.floor(Math.random() * this.#pools.length)]
            const obstacle = pool.pop()
            if (!obstacle) continue
            this.#place(obstacle, lane, localAngle)
            this.#active.push(obstacle)
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

        mesh.position.set(x, Math.cos(angle) * (r + HEAD_SIZE / 2), Math.sin(angle) * r)
        mesh.rotation.set(angle, 0, 0)
        mesh.userData.lane = lane
        mesh.userData.angle = angle
        mesh.visible = true
    }


    #release(mesh, index) {
        mesh.visible = false
        this.#active.splice(index, 1)
        this.#pools[mesh.userData.modelIndex].push(mesh) 
    }


    #worldAngle(mesh, rotation) {
        return wrapAngle(mesh.userData.angle + rotation)
    }
    
}