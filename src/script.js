import './style.css'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import * as dat from 'lil-gui'
import CANNON from 'cannon'


/**
 * Debug
 */
const gui = new dat.GUI()
const debugObject = {}

debugObject.createSphere = () => {
    createSphere(
        Math.random(),
        {
            x: (Math.random() - .5) * 1.5,
            y: (Math.random()) * 1.5,
            z: (Math.random() - .5) * 1.5
        }
    )
}
gui.add(debugObject, 'createSphere')

debugObject.createCube = () => {
    createCube (
        Math.random(),
        Math.random(),
        Math.random(),
        {
            x: (Math.random() - .5) * 1.5,
            y: (Math.random()) * 1.5,
            z: (Math.random() - .5) * 1.5
        }
    )
}
gui.add(debugObject, 'createCube')

/**
 * Base
 */
// Canvas
const canvas = document.querySelector('canvas.webgl')

// Scene
const scene = new THREE.Scene()

/**
 * Sounds
 */
const hitSound = new Audio('/sounds/hit.mp3')
const playHitSound = () => {
    hitSound.currentTime = 0
    hitSound.play()
}

/**
 * Textures
 */
const textureLoader = new THREE.TextureLoader()
const cubeTextureLoader = new THREE.CubeTextureLoader()

const environmentMapTexture = cubeTextureLoader.load([
    '/textures/environmentMaps/0/px.png',
    '/textures/environmentMaps/0/nx.png',
    '/textures/environmentMaps/0/py.png',
    '/textures/environmentMaps/0/ny.png',
    '/textures/environmentMaps/0/pz.png',
    '/textures/environmentMaps/0/nz.png'
])

/**
 * Physics
 */
// World
const world = new CANNON.World()
world.broadphase = new CANNON.SAPBroadphase(world) // this is how the physics engine tests whether obj's are colliding; SAP is more performant than default which is Naive (Grid is the other)
world.allowSleep = true // huuuuge improvement to performance; makes obj's that are not moving 'sleep' so they are not tested every frame

world.gravity.set(0, -9.82, 0)

// Materials
// const concreteMaterial = new CANNON.Material('concrete')
// const plasticMaterial = new CANNON.Material('plastic')
const defaultMaterial = new CANNON.Material('default') // this simplifies materials, do this unless there is a need for various different contactMaterials

// const concretePlasticContactMaterial = new CANNON.ContactMaterial(
const defaultContactMaterial = new CANNON.ContactMaterial(
    // concreteMaterial,
    // plasticMaterial,
    defaultMaterial,
    defaultMaterial,
    {
        friction: .1,
        restitution: .7
    }
)
world.addContactMaterial(defaultContactMaterial)
world.defaultContactMaterial = defaultContactMaterial

// Sphere
// const sphereShape = new CANNON.Sphere(.5)
// const sphereBody = new CANNON.Body({
//     mass: 1,
//     position: new CANNON.Vec3(0, 3, 0),
//     shape: sphereShape,
//     // material: defaultMaterial
// })
// sphereBody.applyLocalForce(new CANNON.Vec3(150, 0, 0), new CANNON.Vec3(0, 0, 0))
// world.addBody(sphereBody)

// Floor
const floorShape = new CANNON.Plane()
const floorBody = new CANNON.Body()
floorBody.mass = 0 // this tells cannon js that the object is immovable
floorBody.addShape(floorShape) // this allows you to add multiple shapes to a body, making the composed object one rigid body
floorBody.quaternion.setFromAxisAngle( new CANNON.Vec3( -1, 0, 0), Math.PI * .5 )
// floorBody.material = defaultMaterial
world.addBody(floorBody)


/**
 * Test sphere
 */
// const sphere = new THREE.Mesh(
//     new THREE.SphereGeometry(0.5, 32, 32),
//     new THREE.MeshStandardMaterial({
//         metalness: 0.3,
//         roughness: 0.4,
//         envMap: environmentMapTexture,
//         envMapIntensity: 0.5
//     })
// )
// sphere.castShadow = true
// sphere.position.y = 0.5
// scene.add(sphere)

/**
 * Floor
 */
const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(10, 10),
    new THREE.MeshStandardMaterial({
        color: '#777777',
        metalness: 0.3,
        roughness: 0.4,
        envMap: environmentMapTexture,
        envMapIntensity: 0.5
    })
)
floor.receiveShadow = true
floor.rotation.x = - Math.PI * 0.5
scene.add(floor)

/**
 * Lights
 */
const ambientLight = new THREE.AmbientLight(0xffffff, 0.7)
scene.add(ambientLight)

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.2)
directionalLight.castShadow = true
directionalLight.shadow.mapSize.set(1024, 1024)
directionalLight.shadow.camera.far = 15
directionalLight.shadow.camera.left = - 7
directionalLight.shadow.camera.top = 7
directionalLight.shadow.camera.right = 7
directionalLight.shadow.camera.bottom = - 7
directionalLight.position.set(5, 5, 5)
scene.add(directionalLight)

/**
 * Sizes
 */
const sizes = {
    width: window.innerWidth,
    height: window.innerHeight
}

window.addEventListener('resize', () =>
{
    // Update sizes
    sizes.width = window.innerWidth
    sizes.height = window.innerHeight

    // Update camera
    camera.aspect = sizes.width / sizes.height
    camera.updateProjectionMatrix()

    // Update renderer
    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
})

/**
 * Camera
 */
// Base camera
const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.1, 100)
camera.position.set(- 3, 3, 3)
scene.add(camera)

// Controls
const controls = new OrbitControls(camera, canvas)
controls.enableDamping = true

/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer({
    canvas: canvas
})
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

/**
 * Utils
 */
const objectsToUpdate = []

const material = new THREE.MeshStandardMaterial({
    metalness: .3,
    roughness: .4,
    envMap: environmentMapTexture
})

// Sphere creation
const sphereGeometry = new THREE.SphereGeometry(1, 20, 20)

const createSphere = (radius, position) => {
    // Three.js mesh
    const mesh = new THREE.Mesh( sphereGeometry, material )
    mesh.scale.set(radius, radius, radius)
    mesh.castShadow = true
    mesh.position.copy(position)
    scene.add(mesh)

    // Cannon.js body
    const shape = new CANNON.Sphere(radius)
    const body = new CANNON.Body({
        mass: 1,
        position: new CANNON.Vec3(0, 3, 0),
        shape,
        material: defaultMaterial
    })
    body.position.copy(position)
    world.addBody(body)

    // Save in objectsToUpdate
    objectsToUpdate.push({
        mesh,
        body
    })
}
// createSphere(.5, {x: 0, y: 3, z: 0})

// Cube creation
const cubeGeometry = new THREE.BoxGeometry(1, 1, 1)

const createCube = (width, height, depth, position) => {
    const mesh = new THREE.Mesh( cubeGeometry, material )
    mesh.scale.set(width, height, depth)
    mesh.castShadow = true
    mesh.position.copy(position)
    scene.add(mesh)

    // Cannon.js body
    const shape = new CANNON.Box(new CANNON.Vec3(width * .5, height * .5, depth * .5))
    const body = new CANNON.Body({
        mass: 1,
        position: new CANNON.Vec3(0, 3, 0),
        shape,
        material: defaultMaterial
    })
    body.position.copy(position)
    body.addEventListener('collide', playHitSound)
    world.addBody(body)

    // Save in objectsToUpdate
    objectsToUpdate.push({
        mesh,
        body
    })
}


/**
 * Animate
 */
const clock = new THREE.Clock()
let oldElapsedTime = 0

const tick = () =>
{
    const elapsedTime = clock.getElapsedTime()
    const deltaTime = elapsedTime - oldElapsedTime
    oldElapsedTime = elapsedTime

    // Update physics world
    // sphereBody.applyForce(new CANNON.Vec3(-.5, 0, 0), sphereBody.position)
    world.step(1 / 60, deltaTime, 3)

    for(const obj of objectsToUpdate) {
        obj.mesh.position.copy(obj.body.position)
        obj.mesh.quaternion.copy(obj.body.quaternion)
    }

    // Update sphere
    // sphere.position.copy(sphereBody.position)

    // Update controls
    controls.update()

    // Render
    renderer.render(scene, camera)

    // Call tick again on the next frame
    window.requestAnimationFrame(tick)
}

tick()