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


    // animations
    mixer = null
    actions = {}
    currentAction = null



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

        this.airTime = this.timeToApex * (1 + 1 / Math.sqrt(this.fallMultiplier))

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
        const gltf = await loader.loadAsync('/models/man-animated.glb')
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

        if (idleClip) this.actions.idle = this.mixer.clipAction(idleClip)
        if (runClip) this.actions.run = this.mixer.clipAction(runClip)

        if (jumpClip) {
            const jump = this.mixer.clipAction(jumpClip)
            jump.setLoop(THREE.LoopOnce)
            jump.clampWhenFinished = true
            jump.timeScale = jumpClip.duration / this.airTime
            this.actions.jump = jump
        }

        // this.mixer = mixer

        this.model = model
        this.add(model)

        this.playAction(this.isJumping ? 'jump' : 'run', 0)
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
        const jumpPressed = jump && !this.prevJump
        this.prevJump = jump

        this.jumpBufferTimer = jumpPressed ? this.jumpBuffer : Math.max(0, this.jumpBufferTimer - delta)

        if (this.jumpBufferTimer > 0 && !this.isJumping) {
            this.isJumping = true
            this.velocityY = this.jumpVelocity
            this.jumpBufferTimer = 0
            this.jumpCut = false
            this.playAction('jump', 0.08)
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
                this.playAction('run', 0.15)
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
