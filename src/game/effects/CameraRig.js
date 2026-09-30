import * as THREE from 'three/webgpu'

const { damp } = THREE.MathUtils

const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2)

const isMobile = window.innerWidth < 768

export class CameraRig {

    isMobile = isMobile
    camDistance = isMobile ? 1.22 : 1.3
    targetHeight = isMobile ? -0.35 : -0.3

    posY = isMobile ? 0.75 : 0.85
    

    //repos
    offset = new THREE.Vector3(0, this.posY, this.camDistance)
    lookAhead = new THREE.Vector3(0, this.targetHeight, -1) 


    followX = 0.6
    lookFollowX = 0.85
    followY = 0.35 


    lateralSmooth = 5
    lookSmooth = 8
    jumpSmooth = 4


    // ptit roulis
    rollAmount = 0.5


    //fov
    baseFov = 50
    maxFov = 65
    minSpeed = 0.3
    maxSpeed = 1.2
    fovSmooth = 3


    //gameover
    zoomFov = 18
    zoomDistance = 0.4
    zoomSmooth = 18
    zoomRoll = 0.08
    
    
    menuOffset = new THREE.Vector3(1.6, 0.7, 1.8)
    menuTarget = new THREE.Vector3(0, 0.2, 0)
    introDuration = 1.6                    

    mouseYawMax = 0.35
    mousePitchMax = 0.15
    mouseSmooth = 4

    
    
    #x = 0
    #y = 0
    #fov = 50
    #lookX = 0
    #zoom = 0
    #zoomTarget = 0
    #intro = 0 
    #introDir = 0
    #mouse = new THREE.Vector2()
    #yaw = 0
    #pitch = 0
    #menuPos = new THREE.Vector3()
    #euler = new THREE.Euler(0, 0, 0, 'YXZ')

    #target = new THREE.Vector3()
    #gamePos = new THREE.Vector3()
    #gameLook = new THREE.Vector3()
    
    

    constructor(camera, player) {
        this.camera = camera
        this.player = player

        this.#fov = camera.fov

        window.addEventListener('pointermove', (e) => {
            this.#mouse.set(
                (e.clientX / window.innerWidth) * 2 - 1,
                (e.clientY / window.innerHeight) * 2 - 1
            )
        })

        this.update(0)
    }


    
    update(delta, speed = this.minSpeed ) {
        const p = this.player.position
 

        this.#x = damp(this.#x, p.x * this.followX, this.lateralSmooth, delta)
        this.#lookX = damp(this.#lookX, p.x * this.lookFollowX, this.lookSmooth, delta)

        this.#zoom = damp(this.#zoom, this.#zoomTarget, this.zoomSmooth, delta)

        this.#y = damp(this.#y, p.y * this.followY, this.jumpSmooth, delta)


        this.#gamePos.set(
            this.offset.x + this.#x,
            this.offset.y + this.#y,
            this.offset.z * (1 - this.zoomDistance * this.#zoom)
        )
        this.#gameLook.set(
            this.lookAhead.x + this.#lookX,
            this.lookAhead.y + this.#y,
            this.lookAhead.z
        )

        
        if (this.#introDir) this.#intro = THREE.MathUtils.clamp(this.#intro + this.#introDir * delta / this.introDuration, 0, 1)
        const k = easeInOutCubic(this.#intro)
        
        // mvt de cam menu
        const clamp = THREE.MathUtils.clamp
        this.#yaw = damp(this.#yaw, clamp(-this.#mouse.x, -1, 1) * this.mouseYawMax, this.mouseSmooth, delta)
        this.#pitch = damp(this.#pitch, clamp(-this.#mouse.y, -1, 1) * this.mousePitchMax, this.mouseSmooth, delta)
        this.#euler.set(this.#pitch, this.#yaw, 0)
        this.#menuPos.copy(this.menuOffset).sub(this.menuTarget).applyEuler(this.#euler).add(this.menuTarget)

        this.camera.position.lerpVectors(this.#menuPos, this.#gamePos, k)
        this.#target.lerpVectors(this.menuTarget, this.#gameLook, k)
        this.camera.lookAt(this.#target)


 
        // this.camera.position.set( this.offset.x + this.#x, this.offset.y + this.#y, this.offset.z * (1 - this.zoomDistance * this.#zoom))
 

        // //lookat
        // this.#target.set( this.lookAhead.x + this.#lookX, this.lookAhead.y + this.#y, this.lookAhead.z)
        // this.camera.lookAt(this.#target)

        
       

 
        //roulis
        const lag = p.x * this.followX - this.#x
        this.camera.rotateZ(-lag * this.rollAmount)

        //gameover
        this.camera.rotateZ(this.zoomRoll * this.#zoom)


        //fov speed
        const t = THREE.MathUtils.clamp((speed - this.minSpeed) / (this.maxSpeed - this.minSpeed), 0, 1)
        const eased = t * (2 - t)
        const targetFov = THREE.MathUtils.lerp(this.baseFov, this.maxFov, eased)

        this.#fov = damp(this.#fov, targetFov, this.fovSmooth, delta)

        const finalFov = this.#fov - this.zoomFov * this.#zoom


        if (Math.abs(this.camera.fov - finalFov) > 0.01) {
            this.camera.fov = this.#fov
            this.camera.updateProjectionMatrix()
        }

    }

    start() {
        this.#introDir = 1
    }

    menu() {
        this.#introDir = -1
        this.#zoomTarget = 0
    }

    punch() {
        this.#zoomTarget = 0.6
    }

    reset() { 
        this.#zoomTarget = 0 
    }

}
