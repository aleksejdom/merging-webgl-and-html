import * as THREE from 'three';
import imagesLoaded from 'imagesloaded';
import gsap from 'gsap';
import FontFaceObserver from 'fontfaceobserver';
import Scroll from '../js/scroll';

import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import fragment from './shaders/fragmet.glsl';
import vertex from './shaders/vertex.glsl';

import ocean from 'url:../images/robot.jpg';

//Postprocessing
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';


export default class Sketch{
  constructor(options){
    this.time = 0;

    //otions
    this.container = options.dom;
    this.width = this.container.offsetWidth;
    this.height = this.container.offsetHeight;

    //scene
    this.scene = new THREE.Scene()
    this.camera();

    //render init
    this.renderer = new THREE.WebGLRenderer( { 
      antialias: true,
      alpha: true,
    } );
    
    //safe Performance
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio,2))

    this.container.appendChild( this.renderer.domElement );

    //control
    this.controls();

    //images
    this.images = [...document.querySelectorAll('img')];

    this.preload();



  } //end of consturctor

  camera(){
    this.camera = new THREE.PerspectiveCamera( 70, this.width / this.height, 100, 2000 );
	  this.camera.position.z = 600;
    //Calculate Camera angle to get exact Pixel Size of the image. / 180/Math.PI make from rad a deg value
    this.camera.fov = 2*Math.atan( (this.height/2)/this.camera.position.z )*(180/Math.PI)
  }

  setupResize(){
    //bind setupResize to resize for watching the resize event
    window.addEventListener('resize', this.resize.bind(this))
  }

  resize(){
    this.width = this.container.offsetWidth;
    this.height = this.container.offsetHeight;
    this.renderer.setSize( this.width, this.height );
    this.camera.aspect = this.width / this.height;
    //for not stretching the object and scene
    this.camera.updateProjectionMatrix();
  }

  preload(){
    const fontOpen = new Promise(resolve => {
      new FontFaceObserver("Open Sans").load().then(() => {
        resolve();
      });
    });

    const fontPlayfair = new Promise(resolve => {
      new FontFaceObserver("Playfair Display").load().then(() => {
        resolve();
      });
    });

    // Preload images
    const preloadImages = new Promise((resolve, reject) => {
      imagesLoaded(document.querySelectorAll("img"), {
          background: true 
        }, resolve);
    });

    let allDone = [fontOpen, fontPlayfair, preloadImages]
    this.currentScroll = 0;
    this.previewScroll = 0;

    //raycaster get details about the mouse over the three js object
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();


    //if Preloading done
    Promise.all(allDone).then(()=>{

      this.scroll = new Scroll()
      this.addImages()
      this.setPosition()
  
      //Effect on Mousemove Three.Raycaaster
      this.mouseMovement()

      //resize
      this.resize()
      this.setupResize()
      
      //Postprocessing
      this.composerPass()
      //start rendering add Objects
      //this.addObjects();
      this.render();
    })
  }

  composerPass(){
    this.composer = new EffectComposer(this.renderer);
      this.renderPass = new RenderPass(this.scene, this.camera);
      this.composer.addPass(this.renderPass);

      //custom shader pass
      var counter = 0.0;
      this.myEffect = {
        uniforms: {
          "tDiffuse": { value: null },
          "scrollSpeed": { value: null },
          "time": { value: null },
        },
        vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix 
            * modelViewMatrix 
            * vec4( position, 1.0 );
        }
        `,
        fragmentShader: `
        uniform sampler2D tDiffuse;
        varying vec2 vUv;

        void main(){

          vec2 newUV = vUv;
          float area = smoothstep(0.4, 0., vUv.y);
          area = pow(area,4.);

          newUV.x -= (vUv.x - 0.5)*0.04*area;

          gl_FragColor = texture2D( tDiffuse, newUV);

        }
        `
      }

      this.customPass = new ShaderPass(this.myEffect);
      this.customPass.renderToScreen = true;

      this.composer.addPass(this.customPass);
  }

  mouseMovement(){
    window.addEventListener( 'mousemove', (event)=>{
      this.mouse.x = ( event.clientX / this.width ) * 2 - 1;
      this.mouse.y = - ( event.clientY / this.height ) * 2 + 1;

      // update the picking ray with the camera and mouse position
      this.raycaster.setFromCamera( this.mouse, this.camera );

      // calculate objects intersecting the picking ray
      const intersects = this.raycaster.intersectObjects( this.scene.children );

      if(intersects.length>0){
          // console.log(intersects[0]);
          let obj = intersects[0].object;
          obj.material.uniforms.hover.value = intersects[0].uv;
      }
    }, false );
  }

  addImages(){
    this.material = new THREE.ShaderMaterial({
      uniforms:{
        time: {value:0},
        uImage: {value:0},
        //set the center of the image 0.5, 0.5
        hover: {value: new THREE.Vector2(0.5,0.5)},
        hoverState: {value: 0},
        oceanTexture: {value: new THREE.TextureLoader().load(ocean)},
      },
      side: THREE.DoubleSide,
      fragmentShader: fragment,
      vertexShader: vertex,
      /* wireframe: false, */
    })

    this.materials = []

    //create a object of images, image positions and create new plane meshes for entry image.
    this.imageStore = this.images.map(img => {
      //.getBoundingClientRect()  gibt die Größe eines Elementes und dessen relative Position zum Viewport zurück.
        let bounds = img.getBoundingClientRect()
        console.log(bounds)

        let geometry = new THREE.PlaneBufferGeometry(1, 1, 10, 10);
        let texture = new THREE.Texture(img);
        texture.needsUpdate = true;
        /*let material = new THREE.MeshBasicMaterial({
          //color: 0xff0000,
          map: texture
        }) */

        //set the material
        let material = this.material.clone();

        //mouse over element event
        img.addEventListener('mouseenter',()=>{
            gsap.to(material.uniforms.hoverState,{
                duration:1,
                value:1,
                ease: "power3.out"
            })
        })
        img.addEventListener('mouseout',()=>{
            gsap.to(material.uniforms.hoverState,{
                duration:1,
                value:0,
                ease: "power3.out"
            })
        })

        this.materials.push(material)

        material.uniforms.uImage.value = texture;

        let mesh = new THREE.Mesh(geometry, material);
        //safe the performance... scale on the end of building a mesh
        mesh.scale.set(bounds.width, bounds.height, 1);

        this.scene.add(mesh)

        return {
          img: img,
          mesh: mesh,
          top: bounds.top,
          left: bounds.left,
          width: bounds.width,
          height: bounds.height,
        }
    })
    console.log('imageStore: ', this.imageStore)
  }

  setPosition(){
    this.imageStore.forEach( object => {
      //shift the demension of images (reposition with currentScroll)  -   shift the demensions of dom and threejs objects
      object.mesh.position.y = this.currentScroll -object.top + this.height/2 - object.height/2;
      object.mesh.position.x = object.left - this.width/2 + object.width/2;
    })
  }

  addObjects(){
    //PlaneBufferGeometry( size x, size y, poly count y, poly count x);
    //if you degrees the poly count you performance was higher
    this.geometry = new THREE.SphereGeometry(1, 40, 40);
    this.geometry = new THREE.PlaneBufferGeometry( 200, 400, 10, 10);
    this.material = new THREE.MeshNormalMaterial();
    //shaders
    this.material = new THREE.ShaderMaterial({
      //time handling vertex
      uniforms:{
        time: {value:0},
        uImage: {value:0},
        //o.5, 0.5 set the center of the object
        hover: {value: new THREE.Vector2(0.5, 0.5)},
        oceanTexture: {value: new THREE.TextureLoader().load(ocean)}
      },
      side: THREE.DoubleSide,
      fragmentShader: fragment,
      vertexShader: vertex,
      //set wireframe true for seeing the vertex shader (building process of shader)
      wireframe: true,
    })

    this.mesh = new THREE.Mesh( this.geometry, this.material );
    this.scene.add( this.mesh );
  }

  controls(){
    this.controls = new OrbitControls( this.camera, this.renderer.domElement );
  }

  //update()
  render(){
    //render time is running
    this.time += 0.05;
   
    this.scroll.render()

    //trick: set preview scroll to this.currentScroll (Safe render performance)
    this.previewScroll = this.currentScroll;
     //updating position of the scroll and same request animation frame
    this.currentScroll = this.scroll.scrollToRender;

    //Render only not equal - Safe Performance
   if(Math.round(this.currentScroll)!==Math.round(this.previewScroll)){
      //because this.previewScroll = this.currentScroll;
      console.log('should render')

      //updating the position of the meshes
      this.setPosition();
      this.customPass.uniforms.scrollSpeed.value = this.scroll.speedTarget;

      //rendering materials all the time
              this.materials.forEach(m=>{
                  m.uniforms.time.value = this.time;
      })

      //usual renderer
      //this.renderer.render( this.scene, this.camera );

      this.composer.render()
   }

    
    //bind the same function render to the requestAnimationFrame
    window.requestAnimationFrame(this.render.bind(this))
  }
}

new Sketch({
  dom: document.querySelector('#container')
})