import * as THREE from 'three/webgpu'

const { damp } = THREE.MathUtils


export class CameraRig {


    //repos
    offset = new THREE.Vector3(0, 0.35, 1.3)
    lookAhead = new THREE.Vector3(0, 0.05, -1) 


    followX = 0.6
    lookFollowX = 0.85
    followY = 0.35 


    lateralSmooth = 5
    lookSmooth = 8
    jumpSmooth = 4


    // ptit roulis
    rollAmount = 0.5
 
    #x = 0
    #lookX = 0
    #y = 0
    #target = new THREE.Vector3()
 

    constructor(camera, player) {
        this.camera = camera
        this.player = player

        this.update(0)
    }


    
    update(delta) {
        const p = this.player.position
 

        this.#x = damp(this.#x, p.x * this.followX, this.lateralSmooth, delta)
        this.#lookX = damp(this.#lookX, p.x * this.lookFollowX, this.lookSmooth, delta)

        this.#y = damp(this.#y, p.y * this.followY, this.jumpSmooth, delta)
 
        this.camera.position.set( this.offset.x + this.#x, this.offset.y + this.#y, this.offset.z )
 

        //lookat
        this.#target.set( this.lookAhead.x + this.#lookX, this.lookAhead.y + this.#y, this.lookAhead.z)
        this.camera.lookAt(this.#target)
 
        //roulis
        const lag = p.x * this.followX - this.#x
        this.camera.rotateZ(-lag * this.rollAmount)

    }


}
