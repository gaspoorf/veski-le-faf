import * as THREE from 'three/webgpu'
import { Input } from '../Input.js'
import { LANES } from '../Config.js'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js'
import { clayify } from '../effects/Clay.js'
import { useAudio } from '../useAudio.js'


// const LANES = [-0.2, 0, 0.2]
const audio = useAudio()

export class Player extends THREE.Group {

    lane = 1
    prevLeft = false
    prevRight = false

    isJumping = false
    prevJump = false
    jumpBufferTimer = 0
    landSquash = 0

    // jump
    jumpHeight = 0.35
    jumpDuration = 0.75
    jumpHang = 3
    jumpBuffer = 0.12
    jumpTime = 0
    isFlipping = false
    flipWindow = 0.4
    flipStart = 0.35


    isSliding = false
    prevSlide = false
    slideBufferTimer = 0
    slideDuration = 0.75
    slideBuffer = 0.12
    slideTime = 0


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

        this.input = new Input()
        this.laneSpeed = 20
        // this.activePos.set(0, 0, 0)
        this.position.set(LANES[this.lane], 0, 0)

        // this.pos1.set(-1, 0, 0)
        // this.pos2.set(0, 0, 0)
        // this.pos3.set(1, 0, 0)
    }


    async loadModel() {
        const dracoLoader = new DRACOLoader()
        dracoLoader.setDecoderPath('/draco/')

        const loader = new GLTFLoader()
        loader.setDRACOLoader(dracoLoader)
        const gltf = await loader.loadAsync('/models/man-animated.glb')
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

        const idleClip = getClip('idle')
        const jumpClip= getClip('jump')
        const runClip= getClip('run')
        const failClip= getClip('mixamo.com.002')
        const slideClip= getClip('slide')
        const flipClip= getClip('flip')

        if (idleClip) this.actions.idle = this.mixer.clipAction(idleClip)
        if (runClip) this.actions.run = this.mixer.clipAction(runClip)

        if (jumpClip) {
            const jump = this.mixer.clipAction(jumpClip)
            jump.setLoop(THREE.LoopOnce)
            jump.clampWhenFinished = true
            jump.timeScale = jumpClip.duration / this.jumpDuration
            this.actions.jump = jump
        }

        if (flipClip) {
            const flip = this.mixer.clipAction(flipClip)
            flip.setLoop(THREE.LoopOnce)
            flip.clampWhenFinished = true
            this.actions.flip = flip
        }

        if (slideClip) {
            this.removeRootMotion(slideClip)
            const slide = this.mixer.clipAction(slideClip)
            slide.setLoop(THREE.LoopOnce)
            slide.clampWhenFinished = true
            slide.timeScale = slideClip.duration / this.slideDuration
            this.actions.slide = slide
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

        if (left && !this.prevLeft && this.lane > 0) {
            this.lane--
            audio.playSwoosh()
        }
        if (right && !this.prevRight && this.lane < LANES.length - 1) {
            this.lane++
            audio.playSwoosh()
        }

        this.jump(delta)
        this.slide(delta)

        this.prevLeft = left
        this.prevRight = right

       
        const targetX = LANES[this.lane]
        this.position.x = THREE.MathUtils.damp(this.position.x, targetX, this.laneSpeed, delta)
    }


    jump(delta) {
        const jump = !!this.input.jump
        const pressed = jump && !this.prevJump
        this.prevJump = jump

        // this.jumpBufferTimer = pressed ? this.jumpBuffer : Math.max(0, this.jumpBufferTimer - delta)


        const canFlip = this.isJumping && !this.isFlipping && this.jumpTime / this.jumpDuration < this.flipWindow

        if (pressed && canFlip) {
            this.isFlipping = true
            const flip = this.actions.flip
            // if (flip) {
            //     flip.timeScale = flip.getClip().duration / (this.jumpDuration - this.jumpTime)
            //     this.playAction('flip', 0.08)
            // }
            if (flip) {
                const clipDuration = flip.getClip().duration
                const remaining = this.jumpDuration - this.jumpTime
                flip.timeScale = (clipDuration - this.flipStart) / remaining
                this.playAction('flip', 0.05)
                flip.time = this.flipStart
            }

        } else {
            this.jumpBufferTimer = pressed ? this.jumpBuffer : Math.max(0, this.jumpBufferTimer - delta)
        }



        if (this.jumpBufferTimer > 0 && !this.isJumping) {
            this.isJumping = true
            this.jumpTime = 0
            this.jumpBufferTimer = 0
            audio.playSwoosh()
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
                this.isFlipping = false
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


    slide(delta) {
        const slide = !!this.input.slide
        const pressed = slide && !this.prevSlide
        this.prevSlide = slide

        this.slideBufferTimer = pressed ? this.slideBuffer : Math.max(0, this.slideBufferTimer - delta)

        if (this.slideBufferTimer > 0 && !this.isSliding && !this.isJumping) {
            this.isSliding = true
            this.slideTime = 0
            this.slideBufferTimer = 0
            audio.playSwoosh()
            this.playAction('slide', 0.08)
        }

        if (this.isSliding) {
            this.slideTime += delta
            if (this.slideTime >= this.slideDuration) {
                this.isSliding = false
                if (!this.isJumping) this.playAction('run', 0.15)
            }
        }
    }

    removeRootMotion(clip) {
        const track = clip.tracks.find(t => t.name.endsWith('Hips.position'))
        if (!track) return
        const v = track.values
        const x0 = v[0], y0 = v[1]
        for (let i = 0; i < v.length; i += 3) {
            v[i] = x0
            v[i + 1] = y0
            // v[i + 2] (hauteur) conservé
        }
    }



    fail() {
        this.dead = true
        this.isJumping = false
        this.isSliding = false
        this.jumpBufferTimer = 0
        this.slideBufferTimer = 0

        if (this.model) this.model.scale.setScalar(this.baseScale)

        this.playAction('fail', 0.15)
    }


    reset(waiting = false) {
        this.dead = false
        this.waiting = waiting
        this.lane = 1
        this.position.set(LANES[this.lane], 0, 0)

        this.isJumping = false
        this.isSliding = false
        this.isFlipping = false


        this.jumpTime = 0
        this.jumpBufferTimer = 0
        this.landSquash = 0
        this.slideBufferTimer = 0

        this.prevLeft = !!this.input.left
        this.prevRight = !!this.input.right
        this.prevJump = !!this.input.jump
        this.prevSlide = !!this.input.slide

        if (this.model) {
            this.model.scale.setScalar(this.baseScale)
        }

        this.mixer?.stopAllAction()
        this.currentAction = null

        this.playAction(waiting ? 'idle' : 'run', 0)

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
