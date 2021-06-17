# merging-webgl-and-html
 How to build website with webgl and shaders

![preview](https://user-images.githubusercontent.com/45975492/122372673-27b6c980-cf61-11eb-9bda-ed8fba837ee1.JPG)

# used imports
    import * as THREE from 'three';
    import imagesLoaded from 'imagesloaded';
    import gsap from 'gsap';
    import FontFaceObserver from 'fontfaceobserver';
    import Scroll from '../js/scroll';

    import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
    import fragment from './shaders/fragmet.glsl';
    import vertex from './shaders/vertex.glsl';
    
    //Postprocessing
    import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
    import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
    import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
    import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
    
# Performance Safer
    # antialias
    this.renderer = new THREE.WebGLRenderer( { 
       antialias: true,
       alpha: true,
     });
     
    # setPixelRatio
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio,2))
    
    # use Promise. If all Done make Action
     preload(){
        const fontOpen = new Promise(resolve => {
          new FontFaceObserver("Open Sans").load().then(() => {
            resolve();
          });
        });

        // Preload images
        const preloadImages = new Promise((resolve, reject) => {
          imagesLoaded(document.querySelectorAll("img"), {
              background: true 
            }, resolve);
        });

        let allDone = [fontOpen]

        //if Preloading done
        Promise.all(allDone).then(()=>{
          //actions and rendering
          this.render();
        })
      }
      
      
    # Render only by Scrolling. Init in Preload (this.currentScroll = 0; this.previewScroll = 0;)
       render(){
        //render time is running
        this.time += 0.05;

        this.scroll.render()

        //trick: set preview scroll to this.currentScroll (Safe render performance)
        this.previewScroll = this.currentScroll;
        //updating position of the scroll and same request animation frame
        this.currentScroll = this.scroll.scrollToRender;

        //Render only not equal - Safe Performance, because this.previewScroll = this.currentScroll;
        if(Math.round(this.currentScroll)!==Math.round(this.previewScroll)){
        
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

# Class Sketch
    Need one Parameter (options) for the container
    this.container = options.dom
    this.container.appendChild( this.renderer.domElement );

    new Sketch({
     dom: document.querySelector('#container')
    })

# Tricks Three JS
    # Calculate Camera angle to get exact Pixel Size of the image. -- 180/Math.PI make from rad a deg value
    this.camera.fov = 2*Math.atan( (this.height/2)/this.camera.position.z )*(180/Math.PI)
    
    # Do not stretching the object and scene
    this.camera.updateProjectionMatrix();
     
    # shift the demension of images (reposition with currentScroll) - shift the demensions of dom and threejs objects 
    setPosition(){
     this.imageStore.forEach( object => {
       object.mesh.position.y = this.currentScroll -object.top + this.height/2 - object.height/2;
       object.mesh.position.x = object.left - this.width/2 + object.width/2;
     })
    }
     
