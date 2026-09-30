import * as THREE from 'three/webgpu'
import { color, mix, normalView, time, sin, smoothstep, vec2, vec3, positionLocal, normalize, mx_fractal_noise_float, uniform, cos, pass, screenUV, length, float, vec4, mrt, output, sample, saturation, packNormalToRGB, unpackRGBToNormal, atan, floor, fract, abs, hash, screenSize, step, luminance, renderOutput  } from 'three/tsl'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
// import { Inspector } from 'three/addons/inspector/Inspector.js'
import { Player } from './elements/Player.js'
import { Map } from './elements/Map.js'
import { Input } from './Input.js'
import { CameraRig } from './effects/CameraRig.js'
import { useAudio } from './useAudio.js'
import { UI } from './UI/UI.js'
import { Loader } from './UI/Loader.js'

import { bloom } from 'three/addons/tsl/display/BloomNode.js'
import { ao } from 'three/addons/tsl/display/GTAONode.js'
import { fxaa } from 'three/addons/tsl/display/FXAANode.js'
import { chromaticAberration } from './effects/ChromaticAberrationNode.js'

import GUI from 'lil-gui'


const audio = useAudio()

const skyHorizon = uniform(0.53)
const cloudScale = uniform(4.77)


export class Experience {
    // en premier : doit écouter le DefaultLoadingManager avant que Player/Map lancent leurs chargements
    loader = new Loader()

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
    renderer = new THREE.WebGPURenderer({ antialias: true });
    controls = new OrbitControls(this.camera, this.renderer.domElement);
   
    player = new Player();
    input = new Input();
    map = new Map();

    started = false
    isGameOver = false
    hitTime = 0
    distance = 0
    score = 0
    coinCount = 0 

    gameOverContainer = document.querySelector('.game-over-container')


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

        // this.renderer.inspector = new Inspector();
        document.body.appendChild(this.renderer.domElement);
        
        
        // this.controls = controls
        this.controls.enableDamping = true;

        this.timer = new THREE.Timer();
       

        // this.player = new Player();
        // this.input = new Input();


        this.params = {
            aoIntensity: uniform(0.9),
            saturation: uniform(1.25),
            vignetteStrength: uniform(1.0),
            vignetteSize: uniform(0.1),
            aberrationBase: uniform(0.02),
            aberrationSpeed: uniform(0.4),
            aberrationFalloff: uniform(1), 
            hitFx: uniform(0),
            hitFlash: uniform(0),
        }

        this.cameraRig = new CameraRig(this.camera, this.player)

        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight
            this.camera.updateProjectionMatrix()

            this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
            this.renderer.setSize(window.innerWidth, window.innerHeight)
        })




        this.ui = new UI()

        const startBtn = document.querySelector('#start-button')
        const reStartBtn = document.querySelector('#restart-button')
        const menuBtn = document.querySelector('#menu-button')
        const menu = document.querySelector('#menu')


        startBtn.addEventListener('click', () => {
            if (!this.started) {
                this.startGame()
                startBtn.classList.remove('appear')
                startBtn.classList.add('hide')
                menu.classList.remove('appear')
                menu.classList.add('hide')
                this.ui.show()
                this.gameOverContainer.classList.remove('show')
            }
        })

        reStartBtn.addEventListener('click', () => {
            
            // if (!this.started) {
                console.log('restart')
                this.restart()
                // reStartBtn.classList.add('hide')
                this.gameOverContainer.classList.remove('show')
            // }
        })


        menuBtn.addEventListener('click', () => {
            this.backToMenu()
            this.ui.hide()
            this.gameOverContainer.classList.remove('show')
            
            this.menuTimeout = setTimeout(() => {
                startBtn.classList.replace('hide', 'appear')
                menu.classList.replace('hide', 'appear')
            }, this.cameraRig.introDuration * 1000)
        })


        //restart temp avant ui
        // window.addEventListener('keydown', (e) => {
        //     if (e.code === 'KeyJ' && !this.started) this.startGame()
        //     if (e.code === 'KeyR' && this.isGameOver) this.restart()
        // })

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
        await Promise.all([
            this.map.environment.addModel('/models/flower.glb', 70, { minScale: 0.01, maxScale: 0.03 }),
            this.map.environment.addModel('/models/flower-orange.glb', 70, { minScale: 0.01, maxScale: 0.03 }),
            this.map.environment.addModel('/models/flower-blue.glb', 70, { minScale: 0.01, maxScale: 0.03 }),
            this.map.environment.addModel('/models/bush.glb', 250, { minScale: 0.005, maxScale: 0.015 }),

            this.map.coins.loadModel('/models/coin.glb'),

            this.map.obstacles.load([
                '/models/fafs/marine.glb',
                '/models/fafs/zemmour.glb',
                '/models/fafs/trump.glb',
                '/models/fafs/net.glb',
                '/models/fafs/musk.glb',
            ]),
        ])


        //sky
        const dir = normalize(positionLocal.add(vec3(0, skyHorizon, 0)))
        const sky = mix(color('#bfe3ff'), color('#2f7fe0'), smoothstep(-0.1, 0.6, dir.y))

        const noise = mx_fractal_noise_float(dir.mul(cloudScale).add(vec3(0, time.mul(0.02), time.mul(0.04))), 4, 2.0, 0.5)
        const clouds = smoothstep(0.05, 0.45, noise).mul(smoothstep(0.0, 0.25, dir.y))

        const skyMaterial = new THREE.MeshBasicNodeMaterial({ side: THREE.BackSide, depthWrite: false, fog: false })
        skyMaterial.colorNode = mix(sky, color('#e8f0ff'), clouds.mul(0.9))

        this.sky = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 32), skyMaterial)
        this.sky.scale.setScalar(50)
        this.sky.renderOrder = -1
        this.sky.frustumCulled = false
        this.scene.add(this.sky)

       


        // post pro

        this.renderPipeline = new THREE.RenderPipeline(this.renderer)

        const scenePass = pass(this.scene, this.camera, { samples: 0 })
        
        scenePass.setMRT(mrt({ output, normal: packNormalToRGB(normalView) }))

        const sceneColor = scenePass.getTextureNode('output')
        const sceneDepth = scenePass.getTextureNode('depth')
        const normalTex = scenePass.getTextureNode('normal')

        const sceneNormal = sample((uv) => unpackRGBToNormal(normalTex.sample(uv)))



        const aoPass = ao(sceneDepth, sceneNormal, this.camera)
        aoPass.resolutionScale = 0.5
        const aoValue = aoPass.getTextureNode().r

        let col = sceneColor.rgb.mul(mix(float(1), aoValue, this.params.aoIntensity))


        const bloomPass = bloom(sceneColor, 0.5, 0.5, 0.7)
        col = col.add(bloomPass.rgb)

        col = saturation(col, this.params.saturation)


        const vignette = smoothstep(0.85, this.params.vignetteSize, length(screenUV.sub(0.5)))
        col = col.mul(mix(float(1).sub(this.params.vignetteStrength), float(1), vignette))



        //wasted gameover

        const gray = luminance(col)
        const wasted = vec3(gray).mul(vec3(1.0, 0.45, 0.4))
        col = mix(col, wasted, this.params.hitFx)
        col = col.mul(float(1).sub(this.params.hitFx.mul(0.25)))

        // flash rouge
        col = mix(col, vec3(1, 0.08, 0.05), this.params.hitFlash.mul(0.55))

       


        // wind lines
        this.params.speedLines = uniform(0)
        this.params.linesStrength = uniform(0.6)

        const c = screenUV.sub(0.5).mul(vec2(screenSize.x.div(screenSize.y), 1))
        const radius = length(c)
        const angle = atan(c.y, c.x).div(Math.PI * 2).add(0.5)

        const LINE_COUNT = 140
        const cell = angle.mul(LINE_COUNT)
        const id = floor(cell)
        const rnd = hash(id)
        const rnd2 = hash(id.add(17.3))

        const thin = smoothstep(0.2, 0.5, abs(fract(cell).sub(0.5)).mul(2)).oneMinus()

        const dash = fract(radius.mul(3).sub(time.mul(rnd.mul(2).add(2))).add(rnd2))
        const streak = smoothstep(0.0, 0.05, dash).mul(smoothstep(0.05, 0.35, dash).oneMinus())

        const active = step(float(1).sub(this.params.speedLines.mul(0.6)), rnd)
        const edges = smoothstep(0.25, 0.7, radius)

        const lines = thin.mul(streak).mul(active).mul(edges).mul(this.params.speedLines)
       
        col = mix(col, vec3(1), lines.mul(this.params.linesStrength))



        //ca pass
        const caStrength = this.params.aberrationBase
            .add(this.params.aberrationSpeed.mul(this.params.speedLines))
            .add(this.params.hitFx.mul(0.04))
            .add(this.params.hitFlash.mul(0.12))

        const caPass = chromaticAberration(vec4(col, 1), caStrength, vec2(0.5), this.params.aberrationFalloff)

        this.setupGUI(aoPass, bloomPass)

        this.renderPipeline.outputColorTransform = false
        this.renderPipeline.outputNode = fxaa(renderOutput(caPass))

        // this.renderPipeline.outputNode = vec4(col, 1)

        await this.warmup()

        this.renderer.setAnimationLoop((time) => this.animate(time))

        await this.loader.waitForEnter()

        audio.initAudioContext()
        audio.playLobby()

    }



    // rendu et compil durant le chargement 
    async warmup() {
        await this.renderer.init()

        const restore = []
        this.scene.traverse((object) => {
            restore.push([object, object.visible, object.frustumCulled])
            object.visible = true
            object.frustumCulled = false
        })

        this.renderPipeline.render()

        for (const [object, visible, frustumCulled] of restore) {
            object.visible = visible
            object.frustumCulled = frustumCulled
        }
    }
    

    setupGUI(aoPass, bloomPass) {
        const gui = new GUI({ title: 'Réglages' })

        const aoFolder = gui.addFolder('ao')
        aoFolder.add(this.params.aoIntensity, 'value', 0, 1, 0.01).name('force')
        aoFolder.add(aoPass.radius, 'value', 0.01, 1, 0.01).name('Rayon')
        aoFolder.add(aoPass.thickness, 'value', 0.01, 2, 0.01).name('Épaisseur')

        const bloomFolder = gui.addFolder('bloom')
        bloomFolder.add(bloomPass.strength, 'value', 0, 3, 0.01).name('force')
        bloomFolder.add(bloomPass.radius, 'value', 0, 1, 0.01).name('Rayon')
        bloomFolder.add(bloomPass.threshold, 'value', 0, 1, 0.01).name('Seuil')

        const colorFolder = gui.addFolder('couleurs')
        colorFolder.add(this.params.saturation, 'value', 0, 2, 0.01).name('sat')
        colorFolder.add(this.renderer, 'toneMappingExposure', 0.5, 2, 0.01).name('expo')

        const vignetteFolder = gui.addFolder('vignette')
        vignetteFolder.add(this.params.vignetteStrength, 'value', 0, 1, 0.01).name('force')
        vignetteFolder.add(this.params.vignetteSize, 'value', 0, 0.8, 0.01).name('taille')


        const skyFolder = gui.addFolder('sky')
        skyFolder.add(skyHorizon, 'value', 0, 0.9, 0.01).name('horizon')
        skyFolder.add(cloudScale, 'value', 0.5, 8, 0.01).name('taille nuages')


        const rig = this.cameraRig
        const camFolder = gui.addFolder('Caméra')
        camFolder.add(rig.offset, 'y', 0, 2, 0.01).name('hauteur')
        camFolder.add(rig.offset, 'z', 0.3, 5, 0.01).name('distance')
        camFolder.add(rig.lookAhead, 'y', -1, 1, 0.01).name('cible hauteur')
        camFolder.add(rig.lookAhead, 'z', -5, 0, 0.01).name('cible prof')
        camFolder.add(rig, 'followX', 0, 1, 0.01).name('suivi lat')
        camFolder.add(rig, 'lookFollowX', 0, 1.5, 0.01).name('rotation')
        camFolder.add(rig, 'followY', 0, 1, 0.01).name('suivi du saut')
        camFolder.add(rig, 'lateralSmooth', 1, 20, 0.1).name('amorti lat')
        camFolder.add(rig, 'jumpSmooth', 1, 20, 0.1).name('amorti saut')
        camFolder.add(rig, 'rollAmount', 0, 2, 0.01).name('roulis')

        camFolder.add(rig, 'baseFov', 30, 80, 0.5).name('fov base')
        camFolder.add(rig, 'maxFov', 30, 100, 0.5).name('fov max')
        camFolder.add(rig, 'maxSpeed', 0.4, 3, 0.05).name('vitess fov max')
        camFolder.add(rig, 'fovSmooth', 0.5, 10, 0.1).name('amorti fov')


        const linesFolder = gui.addFolder('vent vitesse')
        linesFolder.add(this.params.linesStrength, 'value', 0, 1, 0.01).name('opacite')



        const caFolder = gui.addFolder('ca')
        caFolder.add(this.params.aberrationBase, 'value', 0, 0.03, 0.0005).name('perm')
        caFolder.add(this.params.aberrationSpeed, 'value', 0, 0.08, 0.001).name('avec la vitesse')
        caFolder.add(this.params.aberrationFalloff, 'value', 0, 4, 0.01).name('bords')


        const introFolder = gui.addFolder('intro cam')
        introFolder.add(rig.menuOffset, 'x', -4, 4, 0.01).name('menu x')
        introFolder.add(rig.menuOffset, 'y', 0, 3, 0.01).name('menu hauteur')
        introFolder.add(rig.menuOffset, 'z', 0, 5, 0.01).name('menu distance')
        introFolder.add(rig, 'introDuration', 0.3, 4, 0.05).name('durée transition')
        

        gui.hide()

    }

    animate(time) {
        this.timer.update(time);
        const delta = Math.min(this.timer.getDelta(), 0.1);

        if (this.started) {
            this.player.update(this.isGameOver ? delta * 0.3 : delta);
            if (!this.isGameOver){
                this.map.update(delta)
            }
        } else {
            this.player.mixer?.update(delta)
        }
        
        // if (!this.isGameOver && this.started) {
        //     this.map.update(delta);
        // }
       
        this.cameraRig.update(delta, this.map.speed)
        this.sky.position.copy(this.camera.position)

        const s = THREE.MathUtils.clamp((this.map.speed - 0.6) / 1.3, 0, 1)
        this.params.speedLines.value = THREE.MathUtils.damp(this.params.speedLines.value, s, 3, delta)

        
        // this.controls.update();
        // this.renderer.render(this.scene, this.camera);
        this.renderPipeline.render();


        
       
        if (this.started && !this.isGameOver) {

            //collision
            const hit = this.map.obstacles.checkCollision(this.player, this.map.rotation.x)
            if (hit) {
                console.log('perdu')
                this.map.speed = 0
                this.player.fail()

                
                this.gameOver()
              
                
            }


            //ui score
            this.score += this.map.passedThisFrame
            this.ui.set('score', this.score)
        
            
            // colision pieces
            const collected = this.map.coins.collect(this.player.position.x, this.player.position.y, this.map.rotation.x)
            if (collected) {
                this.coinCount += collected
                console.log('Pièces :', this.coinCount)
                this.ui.set('coins', this.coinCount)
                audio.playCoin()
            }

        }


        if (this.isGameOver) {
            console.log('game over')
            this.hitTime += delta
            const t = Math.min(this.hitTime / 0.6, 1)
            this.params.hitFx.value = 1 - (1 - t) ** 3 
            this.params.hitFlash.value = Math.max(0, 1 - this.hitTime / 0.25)
        }


        // console.log(this.player.isJumping)
    }


    gameOver() {
        audio.playHit()

        this.isGameOver = true
        this.hitTime = 0
        this.map.speed = 0
        this.cameraRig.punch()

        document.querySelector('#score span').textContent = this.score
        document.querySelector('#coins span').textContent = this.coinCount

        audio.initAudioContext()
        audio.playDefeat()

        audio.stopAmbient()

        setTimeout(() => {
            this.gameOverContainer.classList.add('show')
            this.ui.hide()
        }, 2000)
    }

    restart() {
        this.ui.show()
        this.isGameOver = false
        this.hitTime = 0
        // this.score = 0
        this.params.hitFx.value = 0
        this.params.hitFlash.value = 0
        this.params.speedLines.value = 0

        this.map.reset()
        this.player.reset()
        this.cameraRig.reset()

        this.score = 0
        // this.distance = 0
        this.coinCount = 0
        this.ui.set('score', 0)
        this.ui.set('coins', 0)
        audio.stopDefeat()
        audio.stopLobby()
        audio.playAmbient()
    }


    backToMenu() {
        this.restart()
        this.started = false
        this.player.reset(true)
        this.cameraRig.menu()
        audio.stopAmbient()
        audio.playLobby()
    }


    startGame() {
        clearTimeout(this.menuTimeout)
        this.started = true
        this.restart()
        this.cameraRig.start()
        audio.initAudioContext()
        audio.stopLobby()
        audio.playAmbient()
    }
}

const experience = new Experience();
experience.init();
