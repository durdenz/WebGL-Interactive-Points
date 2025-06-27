import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';
import { GLTFLoader } from 'jsm/loaders/GLTFLoader.js'; // G4 062725

let renderer, scene, camera;

let particles;

const PARTICLE_SIZE = 20;

let raycaster, intersects;
let pointer, INTERSECTED;
let fragmentshader, vertexshader;

await initShaders();
init();

async function initShaders() {
    fragmentshader = await (await fetch('shaders/shader.frag')).text();
    vertexshader = await (await fetch('shaders/shader.vert')).text();
}

async function init() {

    const container = document.getElementById( 'container' );

    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera( 45, window.innerWidth / window.innerHeight, 1, 10000 );
    camera.position.z = 250;

    //

    // G4 062725 Use GLB Geometry instead of BoxGeometry
    // let boxGeometry = new THREE.BoxGeometry( 200, 200, 200, 16, 16, 16 );
    let boxGeometry = await getGLBGeometry();


    // if normal and uv attributes are not removed, mergeVertices() can't consolidate identical vertices with different normal/uv data

    boxGeometry.deleteAttribute( 'normal' );
    boxGeometry.deleteAttribute( 'uv' );

    boxGeometry = BufferGeometryUtils.mergeVertices( boxGeometry );

    //

    const positionAttribute = boxGeometry.getAttribute( 'position' );

    const colors = [];
    const sizes = [];

    const color = new THREE.Color();

    for ( let i = 0, l = positionAttribute.count; i < l; i ++ ) {

        color.setHSL( 0.01 + 0.1 * ( i / l ), 1.0, 0.5 );
        color.toArray( colors, i * 3 );

        sizes[ i ] = PARTICLE_SIZE * 0.5;

    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute( 'position', positionAttribute );
    geometry.setAttribute( 'customColor', new THREE.Float32BufferAttribute( colors, 3 ) );
    geometry.setAttribute( 'size', new THREE.Float32BufferAttribute( sizes, 1 ) );

    //

    const material = new THREE.ShaderMaterial( {

        uniforms: {
            color: { value: new THREE.Color( 0xffffff ) },
            pointTexture: { value: new THREE.TextureLoader().load( 'textures/sprites/disc.png' ) },
            alphaTest: { value: 0.9 }
        },
        vertexShader: vertexshader,
        fragmentShader: fragmentshader 
    } );

    //

    particles = new THREE.Points( geometry, material );
    scene.add( particles );

    //

    renderer = new THREE.WebGLRenderer();
    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setSize( window.innerWidth, window.innerHeight );
    renderer.setAnimationLoop( animate );
    container.appendChild( renderer.domElement );

    //

    raycaster = new THREE.Raycaster();
    pointer = new THREE.Vector2();

    //

    window.addEventListener( 'resize', onWindowResize );
    document.addEventListener( 'pointermove', onPointerMove );

}

function onPointerMove( event ) {

    pointer.x = ( event.clientX / window.innerWidth ) * 2 - 1;
    pointer.y = - ( event.clientY / window.innerHeight ) * 2 + 1;

}

function onWindowResize() {

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize( window.innerWidth, window.innerHeight );

}

function animate() {

    render();

}

function render() {

    particles.rotation.x += 0.0005;
    particles.rotation.y += 0.001;

    const geometry = particles.geometry;
    const attributes = geometry.attributes;

    raycaster.setFromCamera( pointer, camera );

    intersects = raycaster.intersectObject( particles );

    if ( intersects.length > 0 ) {

        if ( INTERSECTED != intersects[ 0 ].index ) {

            attributes.size.array[ INTERSECTED ] = PARTICLE_SIZE;

            INTERSECTED = intersects[ 0 ].index;

            attributes.size.array[ INTERSECTED ] = PARTICLE_SIZE * 1.25;
            attributes.size.needsUpdate = true;

        }

    } else if ( INTERSECTED !== null ) {

        attributes.size.array[ INTERSECTED ] = PARTICLE_SIZE;
        attributes.size.needsUpdate = true;
        INTERSECTED = null;

    }

    renderer.render( scene, camera );

}

// G4 062725 Start GLB Load Section

let glbGeometry;

async function loadGLBModel() {
    const glbLoader = new GLTFLoader();
    const glbPath = "models/CG.glb";

    let promise = new Promise((resolve, reject) => {
      glbLoader.load(
        glbPath,
        (gltf) => {
          const model = gltf.scene;
          model.traverse((child) => {
            if (child.isMesh) {
              glbGeometry = child.geometry;
              console.log(`IsMesh`);
            }
          });
          resolve();
        },
        undefined,
        (error) => reject(error)
      );
    })

  try {
    await promise;
    console.log("All GLTF models loaded successfully.");
  } catch (error) {
    console.error("Error loading GLTF models:", error);
  }
}

async function getGLBGeometry() {
  const size = 30.0;

  await loadGLBModel();

  const geo = glbGeometry.clone();
  geo.scale(size, size, size);

  return geo;
}

// G4 062725 End GLB Load Section
