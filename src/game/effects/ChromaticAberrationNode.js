import * as THREE from 'three/webgpu'
import { convertToTexture, float, nodeObject, uv, vec2, vec4 } from 'three/tsl'

export class ChromaticAberrationNode extends THREE.TempNode {
  static get type() {
    return 'ChromaticAberrationNode'
  }

  constructor(textureNode, strength, center, falloff) {
    super('vec4')

    this.textureNode = textureNode
    this.strength = strength
    this.center = center
    this.falloff = falloff
  }

  setup() {
    const delta = uv().sub(this.center)
    const offset = delta.mul(delta.length().pow(this.falloff)).mul(this.strength)

    const r = this.textureNode.sample(uv().add(offset)).r
    const g = this.textureNode.sample(uv()).g
    const b = this.textureNode.sample(uv().sub(offset)).b

    return vec4(r, g, b, 1)
  }
}

export const chromaticAberration = (node, strength = float(0.05), center = vec2(0.5), falloff = float(1)) =>
  new ChromaticAberrationNode(convertToTexture(node), nodeObject(strength), nodeObject(center), nodeObject(falloff))
