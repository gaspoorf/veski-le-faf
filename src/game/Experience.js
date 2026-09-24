import * as THREE from 'three/webgpu'
import { color, mix, normalView, time, sin } from 'three/tsl'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { Inspector } from 'three/addons/inspector/Inspector.js'
import { Player } from './Player.js'
import { Map } from './Map.js'
import { Input } from './Input.js'




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
        this.renderer.inspector = new Inspector();
        document.body.appendChild(this.renderer.domElement);
        
        
        // this.controls = controls
        this.controls.enableDamping = true;

        this.timer = new THREE.Timer();
       

        this.player = new Player();
        this.input = new Input();
    }


    async init() {
        this.scene.add(new THREE.AmbientLight(0xffffff, 0.5));
        const light = new THREE.DirectionalLight(0xffffff, 2);
        light.position.set(3, 5, 4);
        this.scene.add(light);
        
        this.scene.add(this.player);
        const map = new Map();
        this.scene.add(map);

        this.renderer.setAnimationLoop((time) => this.animate(time));
    }

    animate(time) {
        this.timer.update(time);
        const delta = Math.min(this.timer.getDelta(), 0.1); // évite un gros saut si l'onglet était en pause

        this.player.update(delta);

        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }
}

const experience = new Experience();
experience.init();
