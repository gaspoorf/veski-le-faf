import * as THREE from 'three/webgpu'
import { color } from 'three/tsl'
import { Input } from './Input.js'
import { LANES } from './Config.js'

import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

import { clayify } from './effects/Clay.js'


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
    jumpDuration = 0.75
    jumpHang = 3
    jumpBuffer = 0.12
    jumpTime = 0


    // animations
    mixer = null
    actions = {}
    currentAction = null

    waiting = true

    dead = false

    constructor() {
        super()

        this.model = null

        this.loadModel()

        const material = new THREE.MeshStandardNodeMaterial()
        material.colorNode = color('green')

        this.capsule = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.1, 8, 16), material)
        // this.add(this.capsule)

        // this.gravity = (2 * this.jumpHeight) / (this.timeToApex ** 2)
        // this.jumpVelocity = this.gravity * this.timeToApex

        // this.airTime = this.#simulateAirTime()

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
        const gltf = await loader.loadAsync('/models/man-animated2.glb')
        const model = gltf.scene

        clayify(model, { saturationAmount: 1.4, brightness: 1.3 })

        const box = new THREE.Box3().setFromObject(model)
        const size = box.getSize(new THREE.Vector3())
        this.baseScale = 0.2 / size.y
        model.scale.setScalar(this.baseScale)
        model.rotation.set(0, -Math.PI, 0)

        box.setFromObject(model)
        
        const center = box.getCenter(new THREE.Vector3())
        model.position.set(-center.x, -box.min.y - 0.1, -center.z)

        //lancer animation
        this.mixer = new THREE.AnimationMixer(model)
        console.log('Animations :', gltf.animations.map(clip => clip.name))

        const getClip = (name) => {
            const clip = THREE.AnimationClip.findByName(gltf.animations, name)
            if (!clip) console.warn(`Animation "${name}" introuvable dans le GLB`)
            return clip
        }

        const idleClip = getClip('idle2')
        const jumpClip= getClip('mixamo.com')
        const runClip= getClip('mixamo.com.003')
        const failClip= getClip('fail-anim')

        if (idleClip) this.actions.idle = this.mixer.clipAction(idleClip)
        if (runClip) this.actions.run = this.mixer.clipAction(runClip)

        if (jumpClip) {
            const jump = this.mixer.clipAction(jumpClip)
            jump.setLoop(THREE.LoopOnce)
            jump.clampWhenFinished = true
            jump.timeScale = jumpClip.duration / this.jumpDuration
            this.actions.jump = jump
        }

        if (failClip) {
            const fail = this.mixer.clipAction(failClip)
            fail.setLoop(THREE.LoopOnce)
            fail.clampWhenFinished = true
            fail.timeScale = failClip.duration / 1.5
            this.actions.fail = fail
        }

        // this.mixer = mixer

        this.model = model
        this.add(model)

        // this.playAction(this.isJumping ? 'jump' : 'run', 0)
        this.playAction(this.waiting ? 'idle' : 'run', 0)
    }


    playAction(name, fade = 0.15) {
        const next = this.actions[name]
        if (!next || next === this.currentAction) return

        next.reset().setEffectiveWeight(1).play()

        if (this.currentAction && fade > 0) {
            next.crossFadeFrom(this.currentAction, fade, false)
        } else if (this.currentAction) {
            this.currentAction.stop()
        }

        this.currentAction = next
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
        const pressed = jump && !this.prevJump
        this.prevJump = jump

        this.jumpBufferTimer = pressed ? this.jumpBuffer : Math.max(0, this.jumpBufferTimer - delta)

        if (this.jumpBufferTimer > 0 && !this.isJumping) {
            this.isJumping = true
            this.jumpTime = 0
            this.jumpBufferTimer = 0
            this.playAction('jump', 0.08)
        }

        const prevY = this.position.y

        if (this.isJumping) {
            this.jumpTime += delta
            const p = Math.min(this.jumpTime / this.jumpDuration, 1)

            this.position.y = this.jumpHeight * (1 - Math.abs(2 * p - 1) ** this.jumpHang)

            if (p >= 1) {
                this.position.y = 0
                this.isJumping = false
                this.landSquash = 1
                this.playAction('run', 0.15)
            }
        }


        const speedY = delta > 0 ? Math.abs(this.position.y - prevY) / delta : 0
        const maxSpeedY = (2 * this.jumpHang * this.jumpHeight) / this.jumpDuration
        const stretch = this.isJumping ? Math.min(speedY / maxSpeedY, 1) * 0.25 : 0

        this.landSquash = THREE.MathUtils.damp(this.landSquash, 0, 12, delta)
        const scaleY = 1 + stretch - this.landSquash * 0.35
        const scaleXZ = 1 / Math.sqrt(scaleY)

        if (this.model) {
            const s = this.baseScale
            this.model.scale.set(scaleXZ * s, scaleY * s, scaleXZ * s)
        }
    }


    fail() {
        this.dead = true
        this.isJumping = false
        this.jumpBufferTimer = 0

        if (this.model) this.model.scale.setScalar(this.baseScale)

        this.playAction('fail', 0.15)
    }


    reset() {
        this.dead = false
        this.waiting = false
        this.lane = 1
        this.position.set(LANES[this.lane], 0, 0)

        this.isJumping = false

        this.jumpTime = 0
        this.jumpBufferTimer = 0
        this.landSquash = 0

        this.prevLeft = !!this.input.left
        this.prevRight = !!this.input.right
        this.prevJump = !!this.input.jump

        if (this.model) {
            this.model.scale.setScalar(this.baseScale)
        }

        this.mixer?.stopAllAction()
        this.currentAction = null

        this.playAction('run', 0)

    }


    update(delta) {
        if (this.dead) {
            this.position.y = THREE.MathUtils.damp(this.position.y, 0, 10, delta)
        } else {
            this.move(delta)
        }

        this.mixer?.update(delta)
    }

}
