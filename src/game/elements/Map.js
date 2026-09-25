import * as THREE from 'three/webgpu'
import { color, mix, normalView, texture, uv, vec2, time, sin,smoothstep, normalMap, float, positionLocal, mx_fractal_noise_float } from 'three/tsl'
import { Obstacles } from './Obstacle.js'
import { Coins } from './Coins.js'
import { WORLD_RADIUS } from '../Config.js'

import { Environment } from '../Environment.js'

export class Map extends THREE.Group {

    radius = 2

    radius = WORLD_RADIUS
    initialSpeed = 0.3
    speed = this.initialSpeed

    constructor() {
        super()

        // normal map
        const normalTex = new THREE.TextureLoader().load('/textures/bosse.jpg')
        normalTex.wrapS = normalTex.wrapT = THREE.RepeatWrapping

        const p = positionLocal.mul(1.5)
        const patches = mx_fractal_noise_float(p, 3, 2.0, 0.5)
        const green = mix(color('#3fae2a'), color('#7ed957'), smoothstep(-0.3, 0.4, patches))

        const tufts = smoothstep(0.25, 0.6, mx_fractal_noise_float(p.mul(6), 2, 2.0, 0.5))
        const baseColor = mix(green, color('#2d8a1f'), tufts.mul(0.6))


        const material = new THREE.MeshStandardNodeMaterial()
        material.colorNode = baseColor
        material.roughnessNode = float(0.85)
        material.metalnessNode = float(0)
        material.normalNode = normalMap(texture(normalTex, uv().mul(vec2(8, 4))), vec2(1.8))
        // material.wireframe = true

        // const textColor = texture(map, uv().mul(vec2(4, 2)))



        // const fresnel = normalView.z.oneMinus().pow(2)
        const fresnel = normalView.z.oneMinus().pow(3)
        // const baseColor = mix(color('#1e3a8a'), color('#23d307'), sin(time).mul(0.5).add(0.5))
        // material.colorNode = mix(textColor, color('#ffffff'), fresnel)
        material.emissiveNode = color('#b6f59a').mul(fresnel).mul(0.4)

        const sphere = new THREE.Mesh(new THREE.SphereGeometry(this.radius, 128, 128), material)
        sphere.receiveShadow = true
        this.add(sphere)


        this.obstacles = new Obstacles()
        this.obstacles.rotation.z = Math.PI / 2
        this.add(this.obstacles)

        this.coins = new Coins()
        this.coins.rotation.z = Math.PI / 2
        this.add(this.coins)

        this.position.set(0, -this.radius - 0.1, 0)
        this.rotation.set(0, 0, -Math.PI / 2)


        this.environment = new Environment({ tuftCount: 400 })
        this.add(this.environment)
    }


    update(delta) {

        this.speed += delta * 0.03

        this.rotation.x += delta * this.speed

        this.obstacles.update(this.rotation.x)
        this.coins.update(this.rotation.x, delta)
    }


    reset() {
        this.speed = this.initialSpeed
        this.obstacles.reset(this.rotation.x)
        this.coins.reset(this.rotation.x)
    }

}
