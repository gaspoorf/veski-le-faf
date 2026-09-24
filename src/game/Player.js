import * as THREE from 'three/webgpu'
import { color } from 'three/tsl'
import { Input } from './Input.js'
import { LANES } from './Config.js'

import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';


// const LANES = [-0.2, 0, 0.2]


export class Player extends THREE.Group {

    lane = 1
    prevLeft = false
    prevRight = false

    isJumping = false
    prevJump = false
    velocityY = 0
    jumpCut = false
    jumpBufferTimer = 0
    landSquash = 0

    // jump
    jumpHeight = 0.35
    timeToApex = 0.28
    fallMultiplier = 1.8
    jumpCutMultiplier = 0.45
    jumpBuffer = 0.12

    // pos1 = new THREE.Vector3();
    // pos2 = new THREE.Vector3();
    // pos3 = new THREE.Vector3();

    constructor() {
        super()

        this.model = null

        this.loadModel()

        const material = new THREE.MeshStandardNodeMaterial()
        material.colorNode = color('green')

        this.capsule = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.1, 8, 16), material)
        // this.add(this.capsule)

        this.gravity = (2 * this.jumpHeight) / (this.timeToApex ** 2)
        this.jumpVelocity = this.gravity * this.timeToApex

        this.input = new Input()
        this.laneSpeed = 20
        // this.activePos.set(0, 0, 0)

        this.position.set(LANES[this.lane], 0, 0)
        

        // this.pos1.set(-1, 0, 0)
        // this.pos2.set(0, 0, 0)
        // this.pos3.set(1, 0, 0)
    }


    async loadModel() {
        const loader = new GLTFLoader()
        const gltf = await loader.loadAsync('/models/bro.glb')
        const model = gltf.scene

        const box = new THREE.Box3().setFromObject(model)
        const size = box.getSize(new THREE.Vector3())
        this.baseScale = 0.2 / size.y
        model.scale.setScalar(this.baseScale)
        model.rotation.set(0, -Math.PI, 0)

        box.setFromObject(model)
        
        const center = box.getCenter(new THREE.Vector3())
        model.position.set(-center.x, -box.min.y - 0.1, -center.z)

        //lancer animation
        const mixer = new THREE.AnimationMixer(model)
        const action = mixer.clipAction(gltf.animations[0])
        action.play()

        this.mixer = mixer

        this.model = model
        this.add(model)
    }


    move(delta) {
        const input = this.input;

        const left = !!input.left;
        const right = !!input.right;

        if (left && !this.prevLeft) {
            this.lane = Math.max(0, this.lane - 1)
        }
        if (right && !this.prevRight) {
            this.lane = Math.min(LANES.length - 1, this.lane + 1)
        }

        this.jump(delta)

        this.prevLeft = left
        this.prevRight = right

       
        const targetX = LANES[this.lane]
        this.position.x = THREE.MathUtils.damp(this.position.x, targetX, this.laneSpeed, delta)

       
        
    }


    jump(delta) {
        const jump = !!this.input.jump
        const jumpPressed = jump && !this.prevJump
        this.prevJump = jump

        this.jumpBufferTimer = jumpPressed ? this.jumpBuffer : Math.max(0, this.jumpBufferTimer - delta)

        if (this.jumpBufferTimer > 0 && !this.isJumping) {
            this.isJumping = true
            this.velocityY = this.jumpVelocity
            this.jumpBufferTimer = 0
            this.jumpCut = false
        }

        if (this.isJumping) {

            if (!jump && this.velocityY > 0 && !this.jumpCut) {
                this.velocityY *= this.jumpCutMultiplier
                this.jumpCut = true
            }

            const g = this.velocityY < 0 ? this.gravity * this.fallMultiplier : this.gravity
            this.velocityY -= g * delta
            this.position.y += this.velocityY * delta

            if (this.position.y <= 0) {
                this.position.y = 0
                this.landSquash = Math.min(1, -this.velocityY / this.jumpVelocity)
                this.velocityY = 0
                this.isJumping = false
            }
        }

        // squash et stresqh
        this.landSquash = THREE.MathUtils.damp(this.landSquash, 0, 12, delta)
        const stretch = this.isJumping ? Math.abs(this.velocityY) / this.jumpVelocity * 0.25 : 0
        const scaleY = 1 + stretch - this.landSquash * 0.35
        const scaleXZ = 1 / Math.sqrt(scaleY)

        if (this.model) {
            const s = this.baseScale
            this.model.scale.set(scaleXZ * s, scaleY * s, scaleXZ * s)
        }
    }


    update(delta) {
        this.move(delta)
        this.mixer?.update(delta)
    }

}
