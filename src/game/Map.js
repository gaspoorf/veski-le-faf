import * as THREE from 'three/webgpu'
import { color, mix, normalView, texture, uv, vec2, time, sin } from 'three/tsl'


export class Map extends THREE.Group {

    radius = 2

    constructor() {
        super()

        const loader = new THREE.TextureLoader()
        const map = loader.load('/textures/ground.jpg')
        map.colorSpace = THREE.SRGBColorSpace 
        map.wrapS = THREE.RepeatWrapping 
        map.wrapT = THREE.RepeatWrapping

        const material = new THREE.MeshBasicNodeMaterial()
        // material.wireframe = true

        const textColor = texture(map, uv().mul(vec2(4, 2)))



        const fresnel = normalView.z.oneMinus().pow(2)
        // const baseColor = mix(color('#1e3a8a'), color('#23d307'), sin(time).mul(0.5).add(0.5))
        material.colorNode = mix(textColor, color('#ffffff'), fresnel)

        const sphere = new THREE.Mesh(new THREE.SphereGeometry(this.radius, 128, 128), material)
        this.add(sphere)

        this.position.set(0, -this.radius - 0.1, 0)
        this.rotation.set(0, 0, -Math.PI / 2)
    }


    rotateEarth(delta){
        // console.log(delta)  

        this.rotation.x += delta * 0.5
    }


    update(delta) {
        this.rotateEarth(delta)
    }


}
