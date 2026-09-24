import * as THREE from 'three/webgpu'
import { color, mix, normalView, texture, uv, vec2, time, sin } from 'three/tsl'
import { Obstacles } from './Obstacle.js'
import { WORLD_RADIUS } from './Config.js'




export class Map extends THREE.Group {

    radius = 2

    radius = WORLD_RADIUS
    speed = 0.3

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


        this.obstacles = new Obstacles()
        this.obstacles.rotation.z = Math.PI / 2
        this.add(this.obstacles)

        this.position.set(0, -this.radius - 0.1, 0)
        this.rotation.set(0, 0, -Math.PI / 2)
    }


    update(delta) {

        this.speed += delta * 0.03

        this.rotation.x += delta * this.speed

        this.obstacles.update(this.rotation.x)
    }

}
