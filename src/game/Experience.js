import * as THREE from 'three/webgpu'
import { color, mix, normalView, time, sin, smoothstep, vec2, vec3, positionWorldDirection, mx_fractal_noise_float, uniform, cos } from 'three/tsl'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { Inspector } from 'three/addons/inspector/Inspector.js'
import { Player } from './Player.js'
import { Map } from './Map.js'
import { Input } from './Input.js'



const skyTilt = uniform(0.5)


export class Experience {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
    renderer = new THREE.WebGPURenderer({ antialias: true });
    controls = new OrbitControls(this.camera, this.renderer.domElement);
   
    player = new Player();
    input = new Input();
    map = new Map();



    constructor() {
        // this.scene = scene;
        this.camera.position.set(0, 0, 4);
        // this.camera.lookAt(20, 20, 0);

        // this.renderer = renderer;
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.toneMapping = THREE.NeutralToneMapping
        this.renderer.toneMappingExposure = 1.1
        this.renderer.shadowMap.enabled = true
        this.renderer.shadowMap.type = THREE.VSMShadowMap

        this.renderer.inspector = new Inspector();
        document.body.appendChild(this.renderer.domElement);
        
        
        // this.controls = controls
        this.controls.enableDamping = true;

        this.timer = new THREE.Timer();
       

        this.player = new Player();
        this.input = new Input();
    }


    async init() {
        // this.scene.add(new THREE.AmbientLight(0xffffff, 0.5));
        // const light = new THREE.DirectionalLight(0xffffff, 2);
        // light.position.set(3, 5, 4);
        // this.scene.add(light);
        

        this.scene.add(new THREE.HemisphereLight('#cfe8ff', '#5fae3a', 1.3))

        const sun = new THREE.DirectionalLight('#fff1d6', 2.5)
        sun.position.set(2, 4, 3)
        sun.castShadow = true
        sun.shadow.mapSize.set(2048, 2048)
        sun.shadow.camera.left = sun.shadow.camera.bottom = -2.5
        sun.shadow.camera.right = sun.shadow.camera.top = 2.5
        sun.shadow.camera.near = 0.5
        sun.shadow.camera.far = 10
        sun.shadow.radius = 6
        sun.shadow.bias = -0.0005
        this.scene.add(sun)


        this.scene.add(this.player);
        this.scene.add(this.map);


        // fleurs et hebres glb
        await this.map.environment.addModel('/models/flower.glb', 100, { minScale: 0.01, maxScale: 0.025 })
        await this.map.environment.addModel('/models/bush.glb', 220, { minScale: 0.005, maxScale: 0.01 })


        //sky
        const d = positionWorldDirection
        const dir = vec3( d.x,d.y.mul(cos(skyTilt)).sub(d.z.mul(sin(skyTilt))), d.y.mul(sin(skyTilt)).add(d.z.mul(cos(skyTilt))))
        const sky = mix(color('#bfe3ff'), color('#2f7fe0'), smoothstep(-0.1, 0.6, dir.y))

        // Nuages
        const cloudUv = dir.xz.div(dir.y.max(0.05)).mul(0.6).add(vec2(0, time.mul(0.03)))
        const noise = mx_fractal_noise_float(vec3(cloudUv, time.mul(0.02)), 4, 2.0, 0.5)
        const clouds = smoothstep(0.05, 0.45, noise).mul(smoothstep(0.0, 0.25, dir.y))

        this.scene.backgroundNode = mix(sky, color('#ffffff'), clouds.mul(0.9))

        this.renderer.setAnimationLoop((time) => this.animate(time));
    }

    animate(time) {
        this.timer.update(time);
        const delta = Math.min(this.timer.getDelta(), 0.1);

        this.player.update(delta);
        this.map.update(delta);

        this.controls.update();
        this.renderer.render(this.scene, this.camera);


        //collision
        const hit = this.map.obstacles.checkCollision(this.player.position.x, this.map.rotation.x)
        if (hit && !this.player.isJumping) {
            console.log('perdu')
            this.map.speed = 0
        }

        console.log(this.player.isJumping)
    }

}

const experience = new Experience();
experience.init();
