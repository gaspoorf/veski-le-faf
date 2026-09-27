import * as THREE from 'three/webgpu'
import { LANES, WORLD_RADIUS } from '../Config.js'
import { clone as cloneModel } from 'three/addons/utils/SkeletonUtils.js'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js'
import { clayify} from '../effects/Clay.js'

const TWO_PI = Math.PI * 2


const SPAWN_ANGLE = -0.85 * Math.PI
const DESPAWN_ANGLE = 0.6 * Math.PI
const HIT_ANGLE = 0.1
const HIT_LANE_DISTANCE = 0.15


const OBSTACLE_HEIGHT = 0.15

const HIGH_CHANCE = 0.3
const WALL_CHANCE = 0.15
const FLOAT_HEIGHT = 0.15

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
        const dracoLoader = new DRACOLoader()
        dracoLoader.setDecoderPath('/draco/')
        
        const loader = new GLTFLoader()
        loader.setDRACOLoader(dracoLoader)
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
    checkCollision(player, rotation) {
        for (const mesh of this.#active) {
            if (Math.abs(LANES[mesh.userData.lane] - player.position.x) > HIT_LANE_DISTANCE) continue
            if (Math.abs(this.#worldAngle(mesh, rotation)) >= HIT_ANGLE) continue

            const type = mesh.userData.type
            if (type === 'ground' && player.isJumping) continue
            if (type === 'high' && player.isSliding) continue
            return mesh
        }
        return null
    }


   
    reset(rotation = 0) {
        for (let i = this.#active.length - 1; i >= 0; i--) this.#release(this.#active[i], i)
        this.#lastRotation = rotation
        this.#sinceLastRow = 0
    }

    #spawnOne(lane, angle, type) {
        const pool = this.#pools[Math.floor(Math.random() * this.#pools.length)]
        const obstacle = pool.pop()
        if (!obstacle) return
        this.#place(obstacle, lane, angle, type)
        this.#active.push(obstacle)
    }


    #spawnRow(rotation) {
        if (this.#pools.length === 0) return
        const localAngle = SPAWN_ANGLE - rotation
        
        for (const lane of this.#randomPattern()) {
            const r = Math.random()
            if (r < WALL_CHANCE) {
                this.#spawnOne(lane, localAngle, 'ground')
                this.#spawnOne(lane, localAngle, 'high')
            } else if (r < WALL_CHANCE + HIGH_CHANCE) {
                this.#spawnOne(lane, localAngle, 'high')
            } else {
                this.#spawnOne(lane, localAngle, 'ground')
            }
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



    #place(mesh, lane, angle, type = 'ground') {
        const x = LANES[lane]
        const r = Math.sqrt(WORLD_RADIUS * WORLD_RADIUS - x * x)
        const radius = r + (type === 'high' ? FLOAT_HEIGHT : 0)

        // mesh.position.set(x, Math.cos(angle) * (radius + HEAD_SIZE / 2), Math.sin(angle) * radius)
        mesh.position.set(x, Math.cos(angle) * radius, Math.sin(angle) * radius)
        mesh.rotation.set(angle, 0, 0)
        mesh.userData.lane = lane
        mesh.userData.angle = angle
        mesh.userData.type = type
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