import * as THREE from 'three/webgpu'
import { color, float, normalView, texture, saturation } from 'three/tsl'


const CLAY = {
    roughness: 0.7,
    sheen: 0.45,
    sheenRoughness: 0.5,
    rim: 0.12,
}


// material en clay
export function toClay(original, { saturationAmount = 1.3, brightness = 1.15, tint = null } = {}) {
    
    const material = new THREE.MeshPhysicalNodeMaterial()

    let base = original?.color ? color(original.color) : color('#ffffff')
    if (original?.map) base = texture(original.map).rgb.mul(base)
  
    if (tint) base = color(tint)

    material.colorNode = saturation(base, float(saturationAmount)).mul(brightness)
    material.roughnessNode = float(CLAY.roughness)
    material.metalnessNode = float(0)

    material.sheenNode = color('#ffffff').mul(CLAY.sheen)
    material.sheenRoughnessNode = float(CLAY.sheenRoughness)

    const rim = normalView.z.oneMinus().pow(3)
    material.emissiveNode = color('#ffffff').mul(rim).mul(CLAY.rim)


    if (original) {
        material.side = original.side
        material.transparent = original.transparent
        material.alphaTest = original.alphaTest
        if (original.map && (original.transparent || original.alphaTest > 0)) {
            material.opacityNode = texture(original.map).a
        }
    }

    return material
    
}


export function clayify(object, options = {}) {

    object.traverse((child) => {
        if (!child.isMesh) return

        child.material = Array.isArray(child.material) ? child.material.map((mat) => toClay(mat, options)) : toClay(child.material, options)

        child.castShadow = true
    })
}