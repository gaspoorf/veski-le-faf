import * as THREE from 'three/webgpu'
import { color, mix, normalView, time, sin } from 'three/tsl'


export class Map extends THREE.Group {

    radius = 2

    constructor() {
        super()

        const material = new THREE.MeshBasicNodeMaterial()
        const fresnel = normalView.z.oneMinus().pow(2)
        const baseColor = mix(color('#1e3a8a'), color('#23d307'), sin(time).mul(0.5).add(0.5))
        material.colorNode = mix(baseColor, color('#ffffff'), fresnel)

        const sphere = new THREE.Mesh(new THREE.SphereGeometry(this.radius, 128, 128), material)
        this.add(sphere)

        this.position.set(0, -this.radius, 0)
    }

}
