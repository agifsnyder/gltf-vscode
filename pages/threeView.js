/*global mainViewModel,ko*/
import * as THREE from '../node_modules/three/build/three.module.js';
import { GLTFLoader } from '../node_modules/three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from '../node_modules/three/examples/jsm/loaders/DRACOLoader.js';
import { OrbitControls } from '../node_modules/three/examples/jsm/controls/OrbitControls.js';

// Tracks if this engine is currently the active engine.
var enabled = false;

var orbitControls = null;
var container = null;
var camera = null;
var scene = null;
var renderer = null;
var loader = null;
var gltf = null;
var mixer = null;
var clock = new THREE.Clock();
var sceneList = null;
var backgroundSubscription;

export class ThreeView {
    constructor() {
    }

    _subscribeToAnimUI(anim) {
        anim.active.subscribe(function(newValue) {
            mainViewModel.anyAnimChanged();
            var action = anim.clipAction;
            if (!newValue) {
                action.stop();
            } else {
                action.play();
            }
        });
    }

    _initScene() {
        container = document.getElementById('threeContainer');

        scene = new THREE.Scene();

        // Note: The near and far planes can be set this way due to the use of "logarithmicDepthBuffer" in the renderer below.
        camera = new THREE.PerspectiveCamera(45, container.offsetWidth / container.offsetHeight, 1e-5, 1e10);

        scene.add(camera);

        var sceneInfo = sceneList[0];

        var spot1 = null;

        if (sceneInfo.addLights) {
          var hemispheric = new THREE.HemisphereLight(0xffffff, 0x222222, 1.2);
          scene.add(hemispheric);

            if (sceneInfo.shadows) {
                hemispheric.intensity = 0.5;
                spot1 = new THREE.SpotLight(0xffffff, 0.7);
                spot1.position.set(10, 20, 10);
                spot1.angle = 0.25;
                spot1.distance = 1024;
                spot1.penumbra = 0.75;
                spot1.castShadow = true;
                spot1.shadow.bias = 0.0001;
                spot1.shadow.mapSize.width = 2048;
                spot1.shadow.mapSize.height = 2048;
                scene.add(spot1);
            }
        }

        // RENDERER
        renderer = new THREE.WebGLRenderer({ antialias: true, logarithmicDepthBuffer: true });
        renderer.setClearColor(0x222222);
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.outputEncoding = THREE.sRGBEncoding;

        if (sceneInfo.shadows) {
            renderer.shadowMap.enabled = true;
            renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        }

        container.appendChild(renderer.domElement);

        var ground = null;

        if (sceneInfo.addGround) {
            var groundMaterial = new THREE.MeshPhongMaterial({
                color: 0xFFFFFF,
                shading: THREE.SmoothShading
            });
            ground = new THREE.Mesh(new THREE.PlaneBufferGeometry(512, 512), groundMaterial);

            if (sceneInfo.shadows) {
                ground.receiveShadow = true;
            }

            if (sceneInfo.groundPos) {
                ground.position.copy(sceneInfo.groundPos);
            } else {
                ground.position.z = -70;
            }

            ground.rotation.x = -Math.PI / 2;

            scene.add(ground);
        }

        loader = new GLTFLoader();

        var dracoLoaderPathAndFile = document.getElementById('dracoLoaderPath').textContent;
        // Replace a slash followed by anything but a slash, to the end, with just a slash.
        var dracoLoaderPath = dracoLoaderPathAndFile.replace(/\/[^\/]*$/, '/');
        var dracoLoader = new DRACOLoader();
        dracoLoader.setDecoderPath(dracoLoaderPath);

        loader.setDRACOLoader( dracoLoader );

        var url = sceneInfo.url;

        loader.load(url, function(data) {
            gltf = data;

            var object = gltf.scene;

            var defaultThreeReflection = document.getElementById('defaultThreeReflection').textContent.split('{face}');
            var envPath = defaultThreeReflection[0];
            var envFormat = defaultThreeReflection[1];

            var envMap = new THREE.CubeTextureLoader().load([
                envPath + 'posx' + envFormat, envPath + 'negx' + envFormat,
                envPath + 'posy' + envFormat, envPath + 'negy' + envFormat,
                envPath + 'posz' + envFormat, envPath + 'negz' + envFormat
            ]);
            envMap.format = THREE.RGBFormat;
            object.traverse(function(node) {
                if (node.isMesh) {
                    const materials = Array.isArray(node.material) ? node.material : [node.material];
                    materials.forEach((material) => {
                        // MeshBasicMaterial means that KHR_materials_unlit is set, so reflections are not needed.
                        if ('envMap' in material && !material.isMeshBasicMaterial) {
                            material.envMap = envMap;
                            material.needsUpdate = true;
                        }
                    });
                }
            });

            mainViewModel.hasBackground(true);
            function applyBackground(showBackground) {
                scene.background = showBackground ? envMap : null;
            }
            applyBackground(mainViewModel.showBackground());
            backgroundSubscription = mainViewModel.showBackground.subscribe(applyBackground);

            if (sceneInfo.cameraPos) {
                object.updateMatrixWorld();
                var boundingBox = new THREE.Box3().setFromObject(object);
                var modelSizeVec3 = new THREE.Vector3();
                boundingBox.getSize(modelSizeVec3);
                var modelSize = modelSizeVec3.length();
                var modelCenter = new THREE.Vector3();
                boundingBox.getCenter(modelCenter);

                orbitControls.reset();
                orbitControls.maxDistance = modelSize * 50;
                orbitControls.enableDamping = true;
                orbitControls.dampingFactor = 0.07;
                orbitControls.rotateSpeed = 0.4;
                orbitControls.panSpeed = 0.4;
                orbitControls.screenSpacePanning = true;

                object.position.x = -modelCenter.x;
                object.position.y = -modelCenter.y;
                object.position.z = -modelCenter.z;
                camera.position.copy(modelCenter);
                camera.position.x += modelSize * sceneInfo.cameraPos.x;
                camera.position.y += modelSize * sceneInfo.cameraPos.y;
                camera.position.z += modelSize * sceneInfo.cameraPos.z;
                camera.near = modelSize / 100;
                camera.far = modelSize * 100;
                camera.updateProjectionMatrix();
                camera.lookAt(modelCenter);
            }

            if (sceneInfo.center) {
                orbitControls.target.copy(sceneInfo.center);
            }

            if (sceneInfo.objectPosition) {
                object.position.copy(sceneInfo.objectPosition);

                if (spot1) {
                    spot1.position.set(sceneInfo.objectPosition.x - 100, sceneInfo.objectPosition.y + 200, sceneInfo.objectPosition.z - 100);
                    spot1.target.position.copy(sceneInfo.objectPosition);
                }
            }

            if (sceneInfo.objectRotation) {
                object.rotation.copy(sceneInfo.objectRotation);
            }

            if (sceneInfo.objectScale) {
                object.scale.copy(sceneInfo.objectScale);
            }

            var gltfAnimations = gltf.animations;
            var koAnimations = [];
            if (gltfAnimations && gltfAnimations.length) {
                mixer = new THREE.AnimationMixer(object);

                for (let i = 0; i < gltfAnimations.length; i++) {
                    var animation = gltfAnimations[i];

                    // There's .3333 seconds junk at the tail of the Monster animation that
                    // keeps it from looping cleanly. Clip it at 3 seconds
                    if (sceneInfo.animationTime) {
                        animation.duration = sceneInfo.animationTime;
                    }

                    var clipAction = mixer.clipAction(animation);

                    var anim = {
                        index: i,
                        name: gltfAnimations[i].name || i,
                        active: ko.observable(false),
                        clipAction: clipAction
                    };
                    this._subscribeToAnimUI(anim);
                    koAnimations.push(anim);
                }

                mainViewModel.animations(koAnimations);
                mainViewModel.anyAnimChanged();
            }

            scene.add(object);
            ThreeView._onWindowResize();

            mainViewModel.onReady();
        }, undefined, function(error) {
            console.error(error);
            mainViewModel.showErrorMessage(error.stack);
        });

        orbitControls = new OrbitControls(camera, renderer.domElement);
    }

    static _onWindowResize() {
        if (!enabled) {
            return;
        }

        camera.aspect = container.offsetWidth / container.offsetHeight;
        camera.updateProjectionMatrix();

        renderer.setSize(window.innerWidth, window.innerHeight);
    }

    static _animate() {
        if (!enabled) {
            return;
        }

        requestAnimationFrame(ThreeView._animate);

        if (mixer) {
            mixer.update(clock.getDelta());
        }

        orbitControls.update();
        ThreeView._render();
    }

    static _render() {
        renderer.render(scene, camera);
    }

    /**
    * @function cleanup
    * Perform any cleanup that needs to happen to stop rendering the current model.
    * This is called right before the active engine for the preview window is switched.
    */
    cleanup() {
        if (backgroundSubscription) {
            backgroundSubscription.dispose();
            backgroundSubscription = undefined;
        }
        enabled = false;

        if (container && renderer) {
            container.removeChild(renderer.domElement);
        }

        camera = null;

        if (!loader || !mixer) {
            return;
        }

        mainViewModel.animations([]);
        mixer.stopAllAction();
        window.removeEventListener('resize', ThreeView._onWindowResize, false);
    }

    startPreview() {
        var rev = document.getElementById('threeRevision');
        rev.textContent = 'r' + THREE.REVISION;

        var rootPath = document.getElementById('gltfRootPath').textContent;
        var fileName = document.getElementById('gltfFileName').textContent;
        sceneList = [
            {
                name: 'glTF Preview', url: rootPath + fileName,
                cameraPos: new THREE.Vector3(-0.2, 0.4, 1.4),
                addLights: true
            }
        ];

        enabled = true;
        this._initScene();
        ThreeView._animate();
        window.addEventListener('resize', ThreeView._onWindowResize, false);
    }
}
