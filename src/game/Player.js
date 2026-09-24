import * as THREE from 'three/webgpu'
import { color } from 'three/tsl'
import { Input } from './Input.js'


const LANES = [-0.5, 0, 0.5]


export class Player extends THREE.Group {

    lane = 1
    prevLeft = false
    prevRight = false

    // pos1 = new THREE.Vector3();
    // pos2 = new THREE.Vector3();
    // pos3 = new THREE.Vector3();

    constructor() {
        super()

        const material = new THREE.MeshStandardNodeMaterial()
        material.colorNode = color('red')

        const capsule = new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.2, 8, 16), material)
        this.add(capsule)

        this.input = new Input()
        this.laneSpeed = 20
        // this.activePos.set(0, 0, 0)

        this.position.set(LANES[this.lane], 0, 0)
        

        // this.pos1.set(-1, 0, 0)
        // this.pos2.set(0, 0, 0)
        // this.pos3.set(1, 0, 0)
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

        this.prevLeft = left
        this.prevRight = right

        const targetX = LANES[this.lane]
        this.position.x = THREE.MathUtils.damp(this.position.x, targetX, this.laneSpeed, delta)

        
    }

    update(delta) {
        this.move(delta)
    }

}
