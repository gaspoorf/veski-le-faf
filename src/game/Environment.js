import * as THREE from 'three/webgpu'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { LANES, WORLD_RADIUS } from './Config.js'

// la bande du centre libre
const LANE_CLEARANCE = Math.max(...LANES.map(Math.abs)) + 0.15


const loader = new GLTFLoader()


const _up = new THREE.Vector3(0, 1, 0)
const _dir = new THREE.Vector3()
const _quat = new THREE.Quaternion()
const _spin = new THREE.Quaternion()
const _scale = new THREE.Vector3()



function randomMatrices(count, { minScale = 0.8, maxScale = 1.2, clearance = LANE_CLEARANCE } = {}) {
    const matrices = []

    while (matrices.length < count) {
        _dir.randomDirection()
        if (Math.abs(_dir.x * WORLD_RADIUS) < clearance) continue

        _quat.setFromUnitVectors(_up, _dir)
        _spin.setFromAxisAngle(_up, Math.random() * Math.PI * 2)
        _quat.multiply(_spin)

        _scale.setScalar(THREE.MathUtils.lerp(minScale, maxScale, Math.random()))

        const position = _dir.clone().multiplyScalar(WORLD_RADIUS * 0.995)
        matrices.push(new THREE.Matrix4().compose(position, _quat, _scale))
    }

    return matrices
}



export class Environment extends THREE.Group {

    constructor() {
        super()

        this.rotation.z = Math.PI / 2
    }

   
    async addModel(url, count, options = {}) {
        const gltf = await loader.loadAsync(url)
        gltf.scene.updateMatrixWorld(true)

        const matrices = randomMatrices(count, options)

        gltf.scene.traverse((child) => {
            if (!child.isMesh) return

            const geometry = child.geometry.clone().applyMatrix4(child.matrixWorld)
            const mesh = new THREE.InstancedMesh(geometry, child.material, count)
            matrices.forEach((m, i) => mesh.setMatrixAt(i, m))

            this.add(mesh)
        })
    }

}