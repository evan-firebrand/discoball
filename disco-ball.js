// Disco Ball Experience with Three.js
import { DEFAULT_CONFIG, SCENE_PRESETS, CONTROL_CONFIGS } from './constants.js';
import { 
    generateRandomSpherePosition, 
    rayPlaneIntersection, 
    isPointInSurfaceBounds,
    findClosestSurfaceIntersection,
    calculatePerformanceCost,
    calculateMotorImperfections,
    calculateSmoothedFPS,
    angleUtils
} from './utils/math-utils.js';

class DiscoBallExperience {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.discoBall = null;
        this.spotLight = null;
        this.spotLight2 = null;
        this.animationId = null;
        
        // Configuration - use imported defaults
        this.config = { ...DEFAULT_CONFIG };
        
        // Motor imperfection variables
        this.motorTime = 0;
        this.wobblePhase = Math.random() * Math.PI * 2;
        this.speedVariation = 0;
        
        // Performance tracking
        this.frameCount = 0;
        this.lastFrameTime = performance.now();
        this.fpsHistory = [];
        this.currentFPS = 60;
        this.performanceStats = {
            activeReflections: 0,
            totalFacets: 0,
            renderTime: 0,
            updateTime: 0
        };
        
        // Preset configurations - use imported presets  
        this.presets = { ...SCENE_PRESETS };
        
        // Reflection system
        this.reflectionSpots = [];
        this.roomSurfaces = [];
        this.facetData = [];
        this.ambientLightObj = null;
        
        // Light visualization
        this.lightBeamMesh = null;
        this.lightSourceMesh = null;
        this.lightBeamMesh2 = null;
        this.lightSourceMesh2 = null;
        
        this.init();
        this.setupControls();
        this.loadSavedPresets();
        this.animate();
    }
    
    init() {
        const canvas = document.getElementById('disco-canvas');
        
        // Scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x000000);
        
        // Camera
        this.camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        this.camera.position.set(5, 3, 5);
        
        // Renderer
        this.renderer = new THREE.WebGLRenderer({ 
            canvas: canvas,
            antialias: true
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        
        // Camera control system
        this.cameraMode = 'orbit'; // 'orbit' or 'fps'
        this.moveSpeed = 2.0;
        
        // Orbit controls
        this.mouse = { x: 0, y: 0 };
        this.isMouseDown = false;
        this.cameraDistance = 8;
        this.cameraAngleX = 0;
        this.cameraAngleY = 0;
        
        // First-person controls
        this.keys = {};
        this.pitchObject = new THREE.Object3D();
        this.yawObject = new THREE.Object3D();
        this.velocity = new THREE.Vector3();
        this.canJump = false;
        
        this.setupCameraControls();
        
        // Create scene elements
        this.createEnvironment();
        this.createDiscoBall();
        this.createLighting();
        
        // Handle window resize
        window.addEventListener('resize', () => this.onWindowResize());
        
        console.log('Disco Ball Experience initialized!');
    }
    
    createEnvironment() {
        // Use configurable room size
        const roomSize = this.config.roomSize;
        
        // Create room surfaces for reflections
        this.createRoomSurfaces(roomSize);
        
        // Simple room that works with reflections and ambient light
        const roomGeometry = new THREE.BoxGeometry(roomSize, roomSize, roomSize);
        const roomMaterial = new THREE.MeshLambertMaterial({ 
            color: 0x222222, // Slightly lighter for ambient light visibility
            side: THREE.BackSide
        });
        this.room = new THREE.Mesh(roomGeometry, roomMaterial);
        this.room.receiveShadow = true;
        this.scene.add(this.room);
        
        // Add a separate floor for better visibility
        const floorGeometry = new THREE.PlaneGeometry(roomSize, roomSize);
        const floorMaterial = new THREE.MeshLambertMaterial({ 
            color: 0x333333
        });
        this.floor = new THREE.Mesh(floorGeometry, floorMaterial);
        this.floor.rotation.x = -Math.PI / 2;
        this.floor.position.y = -roomSize / 2 + 0.01; // Slightly above room floor
        this.floor.receiveShadow = true;
        this.scene.add(this.floor);
        
        console.log('Environment created with room size:', roomSize);
    }
    
    createRoomSurfaces(size) {
        const halfSize = size / 2;
        
        console.log('Creating room surfaces for reflection calculations, room size:', size);
        
        // Define room surfaces for reflection calculations
        this.roomSurfaces = [
            // Floor
            { 
                normal: new THREE.Vector3(0, 1, 0), 
                point: new THREE.Vector3(0, -halfSize, 0),
                bounds: { minX: -halfSize, maxX: halfSize, minZ: -halfSize, maxZ: halfSize }
            },
            // Ceiling
            { 
                normal: new THREE.Vector3(0, -1, 0), 
                point: new THREE.Vector3(0, halfSize, 0),
                bounds: { minX: -halfSize, maxX: halfSize, minZ: -halfSize, maxZ: halfSize }
            },
            // Left wall
            { 
                normal: new THREE.Vector3(1, 0, 0), 
                point: new THREE.Vector3(-halfSize, 0, 0),
                bounds: { minY: -halfSize, maxY: halfSize, minZ: -halfSize, maxZ: halfSize }
            },
            // Right wall
            { 
                normal: new THREE.Vector3(-1, 0, 0), 
                point: new THREE.Vector3(halfSize, 0, 0),
                bounds: { minY: -halfSize, maxY: halfSize, minZ: -halfSize, maxZ: halfSize }
            },
            // Back wall
            { 
                normal: new THREE.Vector3(0, 0, 1), 
                point: new THREE.Vector3(0, 0, -halfSize),
                bounds: { minX: -halfSize, maxX: halfSize, minY: -halfSize, maxY: halfSize }
            },
            // Front wall
            { 
                normal: new THREE.Vector3(0, 0, -1), 
                point: new THREE.Vector3(0, 0, halfSize),
                bounds: { minX: -halfSize, maxX: halfSize, minY: -halfSize, maxY: halfSize }
            }
        ];
    }
    

    
    createDiscoBall() {
        this.discoBall = new THREE.Group();
        
        // Main ball sphere (slightly visible base)
        const ballGeometry = new THREE.SphereGeometry(this.config.ballSize, 32, 32);
        const ballMaterial = new THREE.MeshLambertMaterial({ 
            color: 0x333333,
            transparent: true,
            opacity: 0.2
        });
        const ballCore = new THREE.Mesh(ballGeometry, ballMaterial);
        ballCore.castShadow = true;
        this.discoBall.add(ballCore);
        
        // Create mirror facets
        this.createMirrorFacets();
        
        // Position the disco ball at center
        this.discoBall.position.set(0, 0, 0);
        this.scene.add(this.discoBall);
        
        console.log('Disco ball created with', this.config.mirrorFacets, 'facets');
    }
    
    createMirrorFacets() {
        // Create small square mirror facets
        const facetSize = 0.15;
        const facetGeometry = new THREE.PlaneGeometry(facetSize, facetSize);
        
        this.facetData = []; // Reset facet data array
        
        for (let i = 0; i < this.config.mirrorFacets; i++) {
            // Create material for each facet
            const facetMaterial = new THREE.MeshBasicMaterial({
                color: 0xffffff,
                transparent: true,
                opacity: 0.8,
                side: THREE.DoubleSide
            });
            
            const facet = new THREE.Mesh(facetGeometry, facetMaterial);
            
            // Random position on sphere surface using spherical coordinates
            const spherePos = generateRandomSpherePosition(this.config.ballSize);
            const localPosition = new THREE.Vector3(spherePos.x, spherePos.y, spherePos.z);
            facet.position.copy(localPosition);
            
            // Calculate facet normal (pointing outward from ball center)
            const facetNormal = localPosition.clone().normalize();
            
            // Orient facet to face outward from center with some randomness
            const center = new THREE.Vector3(0, 0, 0);
            facet.lookAt(center);
            facet.rotateX(Math.PI + (Math.random() - 0.5) * 0.2);
            facet.rotateY((Math.random() - 0.5) * 0.2);
            
            // Store facet data for reflection calculations
            this.facetData.push({
                mesh: facet,
                localPosition: localPosition.clone(),
                localNormal: facetNormal.clone(),
                id: i
            });
            
            // Slight size variation
            const sizeVariation = 0.8 + Math.random() * 0.4;
            facet.scale.set(sizeVariation, sizeVariation, 1);
            
            facet.castShadow = true;
            this.discoBall.add(facet);
        }
        
        // Create reflection spots container
        this.createReflectionSpots();
    }
    
    createReflectionSpots() {
        // Clear existing spots
        this.reflectionSpots.forEach(spot => {
            this.scene.remove(spot.mesh);
        });
        
        // Create a pool of light spots for reflections
        const maxSpots = this.config.maxSpots;
        this.reflectionSpots = [];
        
        for (let i = 0; i < maxSpots; i++) {
            const spotGeometry = new THREE.CircleGeometry(0.3, 8);
            const spotMaterial = new THREE.MeshBasicMaterial({
                color: new THREE.Color(this.config.lightColor), // Use light color instead of white
                transparent: true,
                opacity: 0,
                side: THREE.DoubleSide
            });
            
            const spot = new THREE.Mesh(spotGeometry, spotMaterial);
            spot.visible = false;
            this.scene.add(spot);
            
            this.reflectionSpots.push({
                mesh: spot,
                active: false,
                intensity: 0
            });
        }
        
        console.log('Created', maxSpots, 'reflection spots with light color:', this.config.lightColor);
    }
    
    createLighting() {
        // Ambient light (controllable) - make it more visible
        this.ambientLightObj = new THREE.AmbientLight(0xffffff, this.config.ambientLight);
        this.scene.add(this.ambientLightObj);
        console.log('Ambient light created with intensity:', this.config.ambientLight);
        
        // Main spot light with configurable properties
        const lightColor = new THREE.Color(this.config.lightColor);
        this.spotLight = new THREE.SpotLight(
            lightColor,
            this.config.lightIntensity,
            0, // distance (0 = infinite)
            angleUtils.degToRad(this.config.spotAngle),
            this.config.penumbra,
            2 // decay
        );
        
        // Position the spotlight
        this.updateLightPosition();
        
        this.spotLight.target.position.set(
            this.config.ballPosX,
            this.config.ballPosY,
            this.config.ballPosZ
        );
        this.spotLight.castShadow = true;
        
        // Shadow properties
        this.spotLight.shadow.mapSize.width = 1024;
        this.spotLight.shadow.mapSize.height = 1024;
        this.spotLight.shadow.camera.near = 0.5;
        this.spotLight.shadow.camera.far = 50;
        
        this.scene.add(this.spotLight);
        this.scene.add(this.spotLight.target);
        
        // Create visible light source and beam
        this.createLightVisualization();
        
        // Create second light (initially disabled)
        this.createSecondLight();
        
        console.log('Lighting created with color:', this.config.lightColor);
    }
    
    createLightVisualization() {
        try {
            // Light source representation (bulb/fixture)
            const lightSourceGeometry = new THREE.ConeGeometry(0.2, 0.4, 8);
            const lightSourceMaterial = new THREE.MeshLambertMaterial({ 
                color: this.config.lightColor,
                emissive: this.config.lightColor
            });
            this.lightSourceMesh = new THREE.Mesh(lightSourceGeometry, lightSourceMaterial);
            this.lightSourceMesh.position.copy(this.spotLight.position);
            
            // Point the cone toward the target
            if (this.spotLight.target) {
                this.lightSourceMesh.lookAt(this.spotLight.target.position);
                this.lightSourceMesh.rotateX(Math.PI); // Flip to point forward
            }
            
            this.scene.add(this.lightSourceMesh);
            
            // Light beam cone visualization
            this.createLightBeam();
            
            console.log('Light visualization created');
        } catch (error) {
            console.error('Error creating light visualization:', error);
        }
    }
    
    createLightBeam() {
        // Remove existing beam if it exists
        if (this.lightBeamMesh) {
            this.scene.remove(this.lightBeamMesh);
            this.lightBeamMesh = null;
        }
        
        if (!this.config.showLightBeam || !this.spotLight) return;
        
        try {
            // Calculate beam geometry based on light properties
            const distance = this.config.lightDistance;
            const angle = this.config.spotAngle;
            const radius = Math.tan(angleUtils.degToRad(angle / 2)) * distance;
            
            // Create cone geometry for the light beam
            const beamGeometry = new THREE.ConeGeometry(radius, distance, 16, 1, true);
            const beamMaterial = new THREE.MeshBasicMaterial({
                color: this.config.lightColor,
                transparent: true,
                opacity: 0.15,
                side: THREE.DoubleSide
            });
            
            this.lightBeamMesh = new THREE.Mesh(beamGeometry, beamMaterial);
            
            // Position the beam at light source
            this.lightBeamMesh.position.copy(this.spotLight.position);
            
            // Orient the beam toward the target
            if (this.spotLight.target) {
                this.lightBeamMesh.lookAt(this.spotLight.target.position);
                this.lightBeamMesh.rotateX(-Math.PI / 2); // Align with cone orientation
            }
            
            this.scene.add(this.lightBeamMesh);
            console.log('Light beam created');
        } catch (error) {
            console.error('Error creating light beam:', error);
        }
    }
    
    createSecondLight() {
        // Create second spotlight
        const light2Color = new THREE.Color(this.config.light2Color);
        this.spotLight2 = new THREE.SpotLight(
            light2Color,
            this.config.light2Intensity,
            0, // distance (0 = infinite)
            angleUtils.degToRad(this.config.light2SpotAngle),
            this.config.light2Penumbra,
            2 // decay
        );
        
        // Position the second spotlight
        this.updateSecondLightPosition();
        
        this.spotLight2.target.position.set(
            this.config.ballPosX,
            this.config.ballPosY,
            this.config.ballPosZ
        );
        this.spotLight2.castShadow = true;
        
        // Shadow properties
        this.spotLight2.shadow.mapSize.width = 1024;
        this.spotLight2.shadow.mapSize.height = 1024;
        this.spotLight2.shadow.camera.near = 0.5;
        this.spotLight2.shadow.camera.far = 50;
        
        // Initially disabled
        this.spotLight2.visible = this.config.enableSecondLight;
        this.spotLight2.intensity = this.config.enableSecondLight ? this.config.light2Intensity : 0;
        
        this.scene.add(this.spotLight2);
        this.scene.add(this.spotLight2.target);
        
        // Create second light visualization
        this.createSecondLightVisualization();
        
        console.log('Second light created with color:', this.config.light2Color);
    }
    
    createSecondLightVisualization() {
        try {
            // Light source representation (bulb/fixture) for second light
            const lightSourceGeometry = new THREE.ConeGeometry(0.2, 0.4, 8);
            const lightSourceMaterial = new THREE.MeshLambertMaterial({ 
                color: this.config.light2Color,
                emissive: this.config.light2Color
            });
            this.lightSourceMesh2 = new THREE.Mesh(lightSourceGeometry, lightSourceMaterial);
            this.lightSourceMesh2.position.copy(this.spotLight2.position);
            
            // Point the cone toward the target
            if (this.spotLight2.target) {
                this.lightSourceMesh2.lookAt(this.spotLight2.target.position);
                this.lightSourceMesh2.rotateX(Math.PI); // Flip to point forward
            }
            
            this.lightSourceMesh2.visible = this.config.enableSecondLight;
            this.scene.add(this.lightSourceMesh2);
            
            // Light beam cone visualization for second light
            this.createSecondLightBeam();
            
            console.log('Second light visualization created');
        } catch (error) {
            console.error('Error creating second light visualization:', error);
        }
    }
    
    createSecondLightBeam() {
        // Remove existing beam if it exists
        if (this.lightBeamMesh2) {
            this.scene.remove(this.lightBeamMesh2);
            this.lightBeamMesh2 = null;
        }
        
        if (!this.config.showLightBeam || !this.spotLight2 || !this.config.enableSecondLight) return;
        
        try {
            // Calculate beam geometry based on light properties
            const distance = this.config.light2Distance;
            const angle = this.config.light2SpotAngle;
            const radius = Math.tan(angleUtils.degToRad(angle / 2)) * distance;
            
            // Create cone geometry for the light beam
            const beamGeometry = new THREE.ConeGeometry(radius, distance, 16, 1, true);
            const beamMaterial = new THREE.MeshBasicMaterial({
                color: this.config.light2Color,
                transparent: true,
                opacity: 0.15,
                side: THREE.DoubleSide
            });
            
            this.lightBeamMesh2 = new THREE.Mesh(beamGeometry, beamMaterial);
            
            // Position the beam at light source
            this.lightBeamMesh2.position.copy(this.spotLight2.position);
            
            // Orient the beam toward the target
            if (this.spotLight2.target) {
                this.lightBeamMesh2.lookAt(this.spotLight2.target.position);
                this.lightBeamMesh2.rotateX(-Math.PI / 2); // Align with cone direction
                
                // Move the beam to start from the light source
                const beamOffset = new THREE.Vector3(0, distance / 2, 0);
                beamOffset.applyQuaternion(this.lightBeamMesh2.quaternion);
                this.lightBeamMesh2.position.add(beamOffset);
            }
            
            this.scene.add(this.lightBeamMesh2);
        } catch (error) {
            console.error('Error creating second light beam:', error);
        }
    }
    
    updateSecondLightPosition() {
        if (this.spotLight2) {
            const distance = this.config.light2Distance;
            const angleH = angleUtils.degToRad(this.config.light2AngleH);
            const height = this.config.light2Height;
            
            // Calculate position based on horizontal angle and height
            const x = distance * Math.cos(angleH);
            const z = distance * Math.sin(angleH);
            const y = height;
            
            this.spotLight2.position.set(x, y, z);
            
            // Update light source visualization
            if (this.lightSourceMesh2) {
                this.lightSourceMesh2.position.copy(this.spotLight2.position);
                this.lightSourceMesh2.lookAt(this.spotLight2.target.position);
                this.lightSourceMesh2.rotateX(Math.PI); // Flip to point forward
            }
            
            // Update light beam visualization
            this.createSecondLightBeam();
        }
    }
    
    setupCameraControls() {
        const canvas = this.renderer.domElement;
        
        // Setup first-person camera objects
        this.yawObject.add(this.pitchObject);
        this.yawObject.position.set(0, 2, 5);
        
        // Mouse controls (work for both modes)
        canvas.addEventListener('mousedown', (e) => {
            if (this.cameraMode === 'fps') {
                canvas.requestPointerLock();
            } else {
                this.isMouseDown = true;
                this.mouse.x = e.clientX;
                this.mouse.y = e.clientY;
            }
        });
        
        canvas.addEventListener('mousemove', (e) => {
            if (this.cameraMode === 'fps' && document.pointerLockElement === canvas) {
                // First-person mouse look
                const movementX = e.movementX || e.mozMovementX || e.webkitMovementX || 0;
                const movementY = e.movementY || e.mozMovementY || e.webkitMovementY || 0;
                
                this.yawObject.rotation.y -= movementX * 0.002;
                this.pitchObject.rotation.x -= movementY * 0.002;
                
                // Limit pitch
                this.pitchObject.rotation.x = Math.max(-Math.PI/2, Math.min(Math.PI/2, this.pitchObject.rotation.x));
            } else if (this.cameraMode === 'orbit' && this.isMouseDown) {
                // Orbit controls
                const deltaX = e.clientX - this.mouse.x;
                const deltaY = e.clientY - this.mouse.y;
                
                this.cameraAngleY += deltaX * 0.01;
                this.cameraAngleX += deltaY * 0.01;
                
                // Clamp vertical rotation
                this.cameraAngleX = Math.max(-Math.PI/2, Math.min(Math.PI/2, this.cameraAngleX));
                
                this.mouse.x = e.clientX;
                this.mouse.y = e.clientY;
            }
        });
        
        canvas.addEventListener('mouseup', () => {
            this.isMouseDown = false;
        });
        
        canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            if (this.cameraMode === 'orbit') {
                this.cameraDistance += e.deltaY * 0.01;
                this.cameraDistance = Math.max(2, Math.min(20, this.cameraDistance));
            }
        });
        
        // Keyboard controls for first-person mode
        document.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
        });
        
        document.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });
        
        // Pointer lock events
        document.addEventListener('pointerlockchange', () => {
            if (document.pointerLockElement !== canvas && this.cameraMode === 'fps') {
                console.log('Pointer lock released');
            }
        });
    }
    
    updateCameraPosition() {
        if (this.cameraMode === 'orbit') {
            // Orbit camera mode
            const x = Math.cos(this.cameraAngleY) * Math.cos(this.cameraAngleX) * this.cameraDistance;
            const y = Math.sin(this.cameraAngleX) * this.cameraDistance;
            const z = Math.sin(this.cameraAngleY) * Math.cos(this.cameraAngleX) * this.cameraDistance;
            
            this.camera.position.set(x, y, z);
            this.camera.lookAt(0, 0, 0);
        } else if (this.cameraMode === 'fps') {
            // First-person mode
            this.updateFirstPersonMovement();
            
            // Update camera based on first-person objects
            this.camera.position.copy(this.yawObject.position);
            this.camera.rotation.copy(this.pitchObject.rotation);
            this.camera.rotateY(this.yawObject.rotation.y);
        }
    }
    
    updateFirstPersonMovement() {
        const delta = 0.016; // Assume 60fps for consistent movement
        
        // Movement vector
        const direction = new THREE.Vector3();
        
        if (this.keys['KeyW'] || this.keys['ArrowUp']) direction.z -= 1;
        if (this.keys['KeyS'] || this.keys['ArrowDown']) direction.z += 1;
        if (this.keys['KeyA'] || this.keys['ArrowLeft']) direction.x -= 1;
        if (this.keys['KeyD'] || this.keys['ArrowRight']) direction.x += 1;
        if (this.keys['Space']) direction.y += 1;
        if (this.keys['ShiftLeft'] || this.keys['ShiftRight']) direction.y -= 1;
        
        // Normalize and apply speed
        if (direction.length() > 0) {
            direction.normalize();
            direction.multiplyScalar(this.moveSpeed * delta * 60); // Scale for frame rate
            
            // Apply yaw rotation to movement (move relative to look direction)
            direction.applyQuaternion(this.yawObject.quaternion);
            
            // Update position
            this.yawObject.position.add(direction);
        }
    }
    
    setupControls() {
        // Get all control elements and set up event listeners - use imported config
        const controls = CONTROL_CONFIGS;
        
        controls.forEach(control => {
            const slider = document.getElementById(control.id);
            const display = document.getElementById(control.display);
            
            if (slider && display) {
                slider.addEventListener('input', (e) => {
                    const value = parseFloat(e.target.value);
                    this.config[control.property] = value;
                    const decimals = control.decimals || 1;
                    display.textContent = value.toFixed(decimals) + control.suffix;
                    this.updateFromControls(control.property);
                });
            }
        });
        
        // Light color selector
        const lightColorSelect = document.getElementById('lightColor');
        if (lightColorSelect) {
            lightColorSelect.addEventListener('change', (e) => {
                this.config.lightColor = e.target.value;
                this.updateFromControls('lightColor');
            });
        }
        
        // Show light beam checkbox
        const showLightBeamCheck = document.getElementById('showLightBeam');
        if (showLightBeamCheck) {
            showLightBeamCheck.addEventListener('change', (e) => {
                this.config.showLightBeam = e.target.checked;
                this.updateFromControls('showLightBeam');
            });
        }
        
        // Enable wobble checkbox
        const enableWobbleCheck = document.getElementById('enableWobble');
        if (enableWobbleCheck) {
            enableWobbleCheck.addEventListener('change', (e) => {
                this.config.enableWobble = e.target.checked;
                console.log('Motor wobble', this.config.enableWobble ? 'enabled' : 'disabled');
            });
        }
        
        // Performance mode selector
        const performanceModeSelect = document.getElementById('performanceMode');
        if (performanceModeSelect) {
            performanceModeSelect.addEventListener('change', (e) => {
                this.config.performanceMode = e.target.value;
                this.applyPerformanceMode();
                console.log('Performance mode changed to:', this.config.performanceMode);
            });
        }
        
        // Show performance stats checkbox
        const showPerformanceStatsCheck = document.getElementById('showPerformanceStats');
        if (showPerformanceStatsCheck) {
            showPerformanceStatsCheck.addEventListener('change', (e) => {
                this.config.showPerformanceStats = e.target.checked;
                console.log('Performance stats', this.config.showPerformanceStats ? 'enabled' : 'disabled');
            });
        }
        
        // Enable second light checkbox
        const enableSecondLightCheck = document.getElementById('enableSecondLight');
        if (enableSecondLightCheck) {
            enableSecondLightCheck.addEventListener('change', (e) => {
                this.config.enableSecondLight = e.target.checked;
                this.updateSecondLightVisibility();
                console.log('Second light', this.config.enableSecondLight ? 'enabled' : 'disabled');
            });
        }
        
        // Second light color selector
        const light2ColorSelect = document.getElementById('light2Color');
        if (light2ColorSelect) {
            light2ColorSelect.addEventListener('change', (e) => {
                this.config.light2Color = e.target.value;
                this.updateSecondLightColor();
            });
        }
        
        // Preset selector
        const presetSelector = document.getElementById('presetSelector');
        if (presetSelector) {
            presetSelector.addEventListener('change', (e) => {
                if (e.target.value) {
                    this.loadPreset(e.target.value);
                }
            });
        }
        
        // Save preset button
        const savePresetBtn = document.getElementById('savePresetBtn');
        if (savePresetBtn) {
            savePresetBtn.addEventListener('click', () => {
                this.saveCurrentAsPreset();
            });
        }
        
        // Reset button
        const resetBtn = document.getElementById('resetBtn');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                this.resetToDefaults();
            });
        }
        
        // Camera mode selector
        const cameraModeSelect = document.getElementById('cameraMode');
        if (cameraModeSelect) {
            cameraModeSelect.addEventListener('change', (e) => {
                this.cameraMode = e.target.value;
                console.log('Camera mode changed to:', this.cameraMode);
                
                // Reset camera position when switching modes
                if (this.cameraMode === 'fps') {
                    this.yawObject.position.set(0, 2, 5);
                    this.yawObject.rotation.y = 0;
                    this.pitchObject.rotation.x = 0;
                } else {
                    this.cameraAngleX = 0.3;
                    this.cameraAngleY = 0.5;
                    this.cameraDistance = 8;
                }
            });
        }
        
        console.log('Controls initialized');
    }
    
    loadSavedPresets() {
        // Load any saved custom presets from localStorage
        this.updatePresetSelector();
        console.log('Saved presets loaded');
    }
    
    applyPerformanceMode() {
        const mode = this.config.performanceMode;
        
        switch (mode) {
            case 'low':
                // Optimize for lower-end devices
                this.config.mirrorFacets = Math.min(this.config.mirrorFacets, 80);
                this.config.maxSpots = Math.min(this.config.maxSpots, 30);
                this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1));
                console.log('Applied LOW performance settings');
                break;
                
            case 'medium':
                // Balanced performance and quality
                this.config.mirrorFacets = Math.min(this.config.mirrorFacets, 150);
                this.config.maxSpots = Math.min(this.config.maxSpots, 60);
                this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
                console.log('Applied MEDIUM performance settings');
                break;
                
            case 'high':
                // Maximum quality (let user choose settings)
                this.renderer.setPixelRatio(window.devicePixelRatio);
                console.log('Applied HIGH performance settings');
                break;
        }
        
        // Update control displays
        this.updateControlDisplays();
        
        // Regenerate disco ball if facet count changed
        if (mode !== 'high') {
            this.regenerateDiscoBall();
        }
    }
    
    updateControlDisplays() {
        // Update mirror facets display
        const facetsSlider = document.getElementById('mirrorFacets');
        const facetsDisplay = document.getElementById('mirrorFacetsValue');
        if (facetsSlider && facetsDisplay) {
            facetsSlider.value = this.config.mirrorFacets;
            facetsDisplay.textContent = this.config.mirrorFacets;
        }
        
        // Update max spots display
        const spotsSlider = document.getElementById('maxSpots');
        const spotsDisplay = document.getElementById('maxSpotsValue');
        if (spotsSlider && spotsDisplay) {
            spotsSlider.value = this.config.maxSpots;
            spotsDisplay.textContent = this.config.maxSpots;
        }
    }
    
    loadPreset(presetName) {
        const preset = this.presets[presetName];
        if (!preset) {
            console.error('Preset not found:', presetName);
            return;
        }
        
        console.log('Loading preset:', preset.name);
        
        // Apply preset settings to config
        Object.keys(preset).forEach(key => {
            if (key !== 'name' && this.config.hasOwnProperty(key)) {
                this.config[key] = preset[key];
            }
        });
        
        // Update all control displays
        this.updateAllControlDisplays();
        
        // Apply changes to the scene
        this.applyAllSettings();
        
        console.log('Preset loaded successfully');
    }
    
    saveCurrentAsPreset() {
        const name = prompt('Enter a name for this preset:');
        if (!name) return;
        
        const customPreset = {
            name: name,
            ballSize: this.config.ballSize,
            rotationSpeed: this.config.rotationSpeed,
            lightIntensity: this.config.lightIntensity,
            spotAngle: this.config.spotAngle,
            lightColor: this.config.lightColor,
            lightAngleH: this.config.lightAngleH,
            lightHeight: this.config.lightHeight,
            mirrorFacets: this.config.mirrorFacets,
            maxSpots: this.config.maxSpots,
            ambientLight: this.config.ambientLight,
            roomSize: this.config.roomSize,
            enableWobble: this.config.enableWobble,
            wobbleIntensity: this.config.wobbleIntensity
        };
        
        // Save to localStorage
        const savedPresets = JSON.parse(localStorage.getItem('discoPresets') || '{}');
        const presetKey = name.toLowerCase().replace(/\s+/g, '_');
        savedPresets[presetKey] = customPreset;
        localStorage.setItem('discoPresets', JSON.stringify(savedPresets));
        
        // Add to current presets
        this.presets[presetKey] = customPreset;
        
        // Update preset selector
        this.updatePresetSelector();
        
        console.log('Preset saved:', name);
        alert('Preset "' + name + '" saved successfully!');
    }
    
    resetToDefaults() {
        if (confirm('Reset all settings to defaults?')) {
            // Original default values
            this.config.ballSize = 1.5;
            this.config.rotationSpeed = 1.0;
            this.config.lightIntensity = 1.5;
            this.config.spotAngle = 30;
            this.config.lightColor = '#ffffff';
            this.config.lightAngleH = 45;
            this.config.lightHeight = 4;
            this.config.mirrorFacets = 100;
            this.config.maxSpots = 50;
            this.config.ambientLight = 0.2;
            this.config.roomSize = 10;
            this.config.enableWobble = true;
            this.config.wobbleIntensity = 0.02;
            
            // Update displays and apply changes
            this.updateAllControlDisplays();
            this.applyAllSettings();
            
            // Reset preset selector
            const presetSelector = document.getElementById('presetSelector');
            if (presetSelector) presetSelector.value = '';
            
            console.log('Settings reset to defaults');
        }
    }
    
    updateAllControlDisplays() {
        // Update all sliders and their displays
        const controls = [
            { id: 'ballSize', value: this.config.ballSize, decimals: 1 },
            { id: 'rotationSpeed', value: this.config.rotationSpeed, suffix: ' RPM', decimals: 1 },
            { id: 'lightIntensity', value: this.config.lightIntensity, decimals: 1 },
            { id: 'spotAngle', value: this.config.spotAngle, suffix: '°', decimals: 0 },
            { id: 'lightAngleH', value: this.config.lightAngleH, suffix: '°', decimals: 0 },
            { id: 'lightHeight', value: this.config.lightHeight, decimals: 1 },
            { id: 'mirrorFacets', value: this.config.mirrorFacets, decimals: 0 },
            { id: 'maxSpots', value: this.config.maxSpots, decimals: 0 },
            { id: 'ambientLight', value: this.config.ambientLight, decimals: 2 },
            { id: 'roomSize', value: this.config.roomSize, suffix: ' units', decimals: 0 },
            { id: 'wobbleIntensity', value: this.config.wobbleIntensity, decimals: 3 }
        ];
        
        controls.forEach(control => {
            const slider = document.getElementById(control.id);
            const display = document.getElementById(control.id + 'Value');
            
            if (slider) slider.value = control.value;
            if (display) {
                const suffix = control.suffix || '';
                display.textContent = control.value.toFixed(control.decimals) + suffix;
            }
        });
        
        // Update dropdowns and checkboxes
        const lightColor = document.getElementById('lightColor');
        if (lightColor) lightColor.value = this.config.lightColor;
        
        const enableWobble = document.getElementById('enableWobble');
        if (enableWobble) enableWobble.checked = this.config.enableWobble;
    }
    
    applyAllSettings() {
        // Apply all settings that have update functions
        this.updateLightColor();
        this.updateLightPosition();
        this.updateBallSize();
        this.updateBallPosition();
        this.updateRoomSize();
        this.regenerateDiscoBall();
        this.createReflectionSpots();
        
        // Update spotlight properties
        if (this.spotLight) {
            this.spotLight.intensity = this.config.lightIntensity;
            this.spotLight.angle = angleUtils.degToRad(this.config.spotAngle);
        }
        
        // Update ambient light
        if (this.ambientLightObj) {
            this.ambientLightObj.intensity = this.config.ambientLight;
        }
    }
    
    updatePresetSelector() {
        const presetSelector = document.getElementById('presetSelector');
        if (!presetSelector) return;
        
        // Clear existing custom options
        const customOptions = presetSelector.querySelectorAll('option[data-custom="true"]');
        customOptions.forEach(option => option.remove());
        
        // Load saved presets from localStorage
        const savedPresets = JSON.parse(localStorage.getItem('discoPresets') || '{}');
        
        // Add custom presets to selector
        Object.keys(savedPresets).forEach(key => {
            const preset = savedPresets[key];
            const option = document.createElement('option');
            option.value = key;
            option.textContent = preset.name + ' (Custom)';
            option.setAttribute('data-custom', 'true');
            presetSelector.appendChild(option);
            
            // Also add to presets object
            this.presets[key] = preset;
        });
    }
    
    updateFromControls(property) {
        switch(property) {
            case 'lightDistance':
                this.updateLightPosition();
                break;
            case 'lightIntensity':
                if (this.spotLight) {
                    this.spotLight.intensity = this.config.lightIntensity;
                }
                break;
            case 'spotAngle':
                if (this.spotLight) {
                    this.spotLight.angle = angleUtils.degToRad(this.config.spotAngle);
                    this.createLightBeam(); // Update beam visualization
                    this.updateReflections(); // Spot angle affects which facets are illuminated
                }
                break;
            case 'lightColor':
                this.updateLightColor();
                break;
            case 'lightAngleH':
            case 'lightHeight':
                this.updateLightPosition();
                break;
            case 'penumbra':
                if (this.spotLight) {
                    this.spotLight.penumbra = this.config.penumbra;
                }
                break;
            case 'showLightBeam':
                this.createLightBeam();
                break;
            case 'ballSize':
                this.updateBallSize();
                break;
            case 'mirrorFacets':
                this.regenerateDiscoBall();
                break;
            case 'maxSpots':
                this.createReflectionSpots();
                break;
            case 'ambientLight':
                if (this.ambientLightObj) {
                    this.ambientLightObj.intensity = this.config.ambientLight;
                    console.log('Ambient light intensity updated to:', this.config.ambientLight);
                }
                break;
            case 'ballPosX':
            case 'ballPosY':
            case 'ballPosZ':
                this.updateBallPosition();
                break;
            case 'moveSpeed':
                this.moveSpeed = this.config.moveSpeed;
                break;
            case 'roomSize':
                this.updateRoomSize();
                break;
            case 'light2Intensity':
            case 'light2SpotAngle':  
            case 'light2AngleH':
            case 'light2Height':
            case 'light2Distance':
                this.updateSecondLightProperties();
                break;
        }
    }
    
    updateLightPosition() {
        if (this.spotLight) {
            const distance = this.config.lightDistance;
            const angleH = angleUtils.degToRad(this.config.lightAngleH);
            const height = this.config.lightHeight;
            
            // Calculate position based on horizontal angle and height
            const x = distance * Math.cos(angleH);
            const z = distance * Math.sin(angleH);
            const y = height;
            
            this.spotLight.position.set(x, y, z);
            
            // Update light source visualization
            if (this.lightSourceMesh) {
                this.lightSourceMesh.position.copy(this.spotLight.position);
                this.lightSourceMesh.lookAt(this.spotLight.target.position);
                this.lightSourceMesh.rotateX(Math.PI); // Flip to point forward
            }
            
            // Update light beam visualization
            this.createLightBeam();
        }
    }
    
    updateBallSize() {
        if (this.discoBall) {
            const scale = this.config.ballSize / 1.5;
            this.discoBall.scale.set(scale, scale, scale);
            
            // Ball size change affects reflection spot sizes, so update immediately
            // This provides instant visual feedback when adjusting ball size
            this.updateReflections();
        }
    }
    
    updateBallPosition() {
        if (this.discoBall) {
            this.discoBall.position.set(
                this.config.ballPosX,
                this.config.ballPosY,
                this.config.ballPosZ
            );
            
            // Update light target to follow the disco ball
            if (this.spotLight && this.spotLight.target) {
                this.spotLight.target.position.set(
                    this.config.ballPosX,
                    this.config.ballPosY,
                    this.config.ballPosZ
                );
                
                // Update light visualization
                this.updateLightPosition();
                
                // Ball position change affects all reflection calculations
                this.updateReflections();
            }
        }
    }
    
    updateRoomSize() {
        // Remove existing room and floor
        if (this.room) {
            this.scene.remove(this.room);
        }
        if (this.floor) {
            this.scene.remove(this.floor);
        }
        
        // Recreate room with new size
        const roomSize = this.config.roomSize;
        
        // Update room surfaces for reflections
        this.createRoomSurfaces(roomSize);
        
        // Create new room
        const roomGeometry = new THREE.BoxGeometry(roomSize, roomSize, roomSize);
        const roomMaterial = new THREE.MeshLambertMaterial({ 
            color: 0x222222,
            side: THREE.BackSide
        });
        this.room = new THREE.Mesh(roomGeometry, roomMaterial);
        this.room.receiveShadow = true;
        this.scene.add(this.room);
        
        // Create new floor
        const floorGeometry = new THREE.PlaneGeometry(roomSize, roomSize);
        const floorMaterial = new THREE.MeshLambertMaterial({ 
            color: 0x333333
        });
        this.floor = new THREE.Mesh(floorGeometry, floorMaterial);
        this.floor.rotation.x = -Math.PI / 2;
        this.floor.position.y = -roomSize / 2 + 0.01;
        this.floor.receiveShadow = true;
        this.scene.add(this.floor);
        
        // Room size change affects all reflections
        this.updateReflections();
        
        console.log('Room size updated to:', roomSize);
    }
    
    updateSecondLightVisibility() {
        if (this.spotLight2) {
            this.spotLight2.visible = this.config.enableSecondLight;
            this.spotLight2.intensity = this.config.enableSecondLight ? this.config.light2Intensity : 0;
        }
        
        if (this.lightSourceMesh2) {
            this.lightSourceMesh2.visible = this.config.enableSecondLight;
        }
        
        // Update light beam
        this.createSecondLightBeam();
        
        // Show/hide second light controls
        const controlIds = ['light2Controls', 'light2IntensityControl', 'light2AngleControl', 
                           'light2PositionHControl', 'light2HeightControl', 'light2DistanceControl'];
        controlIds.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.style.display = this.config.enableSecondLight ? 'block' : 'none';
            }
        });
        
        console.log('Second light visibility updated:', this.config.enableSecondLight);
    }
    
    updateSecondLightColor() {
        const color = new THREE.Color(this.config.light2Color);
        
        // Update spotlight color
        if (this.spotLight2) {
            this.spotLight2.color = color;
        }
        
        // Update light source visualization
        if (this.lightSourceMesh2) {
            this.lightSourceMesh2.material.color = color;
            this.lightSourceMesh2.material.emissive = color;
        }
        
        // Update light beam color
        if (this.lightBeamMesh2) {
            this.lightBeamMesh2.material.color = color;
        }
        
        console.log('Second light color updated to:', this.config.light2Color);
    }
    
    updateSecondLightProperties() {
        if (!this.spotLight2) return;
        
        // Update intensity
        this.spotLight2.intensity = this.config.enableSecondLight ? this.config.light2Intensity : 0;
        
        // Update spot angle  
        this.spotLight2.angle = angleUtils.degToRad(this.config.light2SpotAngle);
        
        // Update position
        this.updateSecondLightPosition();
        
        console.log('Second light properties updated');
    }
    
    regenerateDiscoBall() {
        if (!this.discoBall) return;
        
        // Remove existing facets (keep the core sphere)
        const ballCore = this.discoBall.children[0]; // First child is always the core sphere
        
        // Remove all facets
        for (let i = this.discoBall.children.length - 1; i >= 1; i--) {
            this.discoBall.remove(this.discoBall.children[i]);
        }
        
        // Clear facet data
        this.facetData = [];
        
        // Recreate facets with new count
        const facetSize = 0.15;
        const facetGeometry = new THREE.PlaneGeometry(facetSize, facetSize);
        
        for (let i = 0; i < this.config.mirrorFacets; i++) {
            // Create material for each facet
            const facetMaterial = new THREE.MeshBasicMaterial({
                color: 0xffffff,
                transparent: true,
                opacity: 0.8,
                side: THREE.DoubleSide
            });
            
            const facet = new THREE.Mesh(facetGeometry, facetMaterial);
            
            // Random position on sphere surface using spherical coordinates
            const spherePos = generateRandomSpherePosition(this.config.ballSize);
            const localPosition = new THREE.Vector3(spherePos.x, spherePos.y, spherePos.z);
            facet.position.copy(localPosition);
            
            // Calculate facet normal (pointing outward from ball center)
            const facetNormal = localPosition.clone().normalize();
            
            // Orient facet to face outward from center with some randomness
            const center = new THREE.Vector3(0, 0, 0);
            facet.lookAt(center);
            facet.rotateX(Math.PI + (Math.random() - 0.5) * 0.2);
            facet.rotateY((Math.random() - 0.5) * 0.2);
            
            // Store facet data for reflection calculations
            this.facetData.push({
                mesh: facet,
                localPosition: localPosition.clone(),
                localNormal: facetNormal.clone(),
                id: i
            });
            
            // Slight size variation
            const sizeVariation = 0.8 + Math.random() * 0.4;
            facet.scale.set(sizeVariation, sizeVariation, 1);
            
            facet.castShadow = true;
            this.discoBall.add(facet);
        }
        
        console.log('Regenerated disco ball with', this.config.mirrorFacets, 'facets');
    }
    
    updateLightColor() {
        const color = new THREE.Color(this.config.lightColor);
        
        // Update spotlight color
        if (this.spotLight) {
            this.spotLight.color = color;
        }
        
        // Update light source visualization
        if (this.lightSourceMesh) {
            this.lightSourceMesh.material.color = color;
            this.lightSourceMesh.material.emissive = color;
        }
        
        // Update light beam color
        if (this.lightBeamMesh) {
            this.lightBeamMesh.material.color = color;
        }
        
        // Update all reflection spot colors
        this.reflectionSpots.forEach(spot => {
            spot.mesh.material.color = color;
        });
        
        console.log('Light color updated to:', this.config.lightColor, '- Updated spotlight, beam, source, and', this.reflectionSpots.length, 'reflection spots');
    }
    
    animate() {
        this.animationId = requestAnimationFrame(() => this.animate());
        
        const frameStartTime = performance.now();
        
        // Rotate disco ball with motor imperfections
        if (this.discoBall) {
            this.motorTime += 0.016; // Approximately 60fps
            
            if (this.config.enableWobble) {
                // Calculate motor imperfections using utility function
                const motorCalc = calculateMotorImperfections(
                    this.motorTime, 
                    this.wobblePhase, 
                    this.config.rotationSpeed, 
                    this.config.wobbleIntensity
                );
                
                // Main Y rotation with speed variations
                this.discoBall.rotation.y += motorCalc.actualSpeed * 0.01;
                
                // Apply wobble/tilt
                this.discoBall.rotation.x = motorCalc.wobbleX;
                this.discoBall.rotation.z = motorCalc.wobbleZ;
            } else {
                // Perfect rotation (no wobble)
                this.discoBall.rotation.y += this.config.rotationSpeed * 0.01;
                this.discoBall.rotation.x = 0;
                this.discoBall.rotation.z = 0;
            }
        }
        
        // Update reflections (measure performance)
        const reflectionsStartTime = performance.now();
        this.updateReflections();
        this.performanceStats.updateTime = performance.now() - reflectionsStartTime;
        
        // Update camera position
        this.updateCameraPosition();
        
        // Update performance metrics
        this.updatePerformanceMetrics();
        
        // Render scene (measure performance)
        const renderStartTime = performance.now();
        this.renderer.render(this.scene, this.camera);
        this.performanceStats.renderTime = performance.now() - renderStartTime;
        
        // Calculate total frame time
        const frameEndTime = performance.now();
        const frameDuration = frameEndTime - frameStartTime;
        this.updateFPS(frameDuration);
    }
    
    updateFPS(frameDuration) {
        this.frameCount++;
        const currentTime = performance.now();
        
        // Calculate FPS based on frame duration using utility function
        const instantFPS = 1000 / frameDuration;
        const fpsCalc = calculateSmoothedFPS(this.fpsHistory, instantFPS);
        
        this.fpsHistory = fpsCalc.history;
        this.currentFPS = fpsCalc.smoothedFPS;
    }
    
    updatePerformanceMetrics() {
        if (!this.config.showPerformanceStats) return;
        
        // Count active reflections
        const activeReflections = this.reflectionSpots.filter(spot => spot.active).length;
        this.performanceStats.activeReflections = activeReflections;
        this.performanceStats.totalFacets = this.config.mirrorFacets;
        
        // Calculate performance cost based on various factors
        const performanceCost = this.calculatePerformanceCost();
        
        // Update display elements
        this.updatePerformanceDisplay(performanceCost);
    }
    
    calculatePerformanceCost() {
        // Use utility function for performance cost calculation
        return calculatePerformanceCost(this.config, this.performanceStats);
    }
    
    updatePerformanceDisplay(performanceCost) {
        // Update FPS display
        const fpsElement = document.getElementById('fps-display');
        if (fpsElement) {
            const fps = Math.round(this.currentFPS);
            fpsElement.textContent = fps;
            
            // Color coding for FPS
            fpsElement.className = 'stat-value';
            if (fps < 30) fpsElement.classList.add('critical');
            else if (fps < 50) fpsElement.classList.add('warning');
        }
        
        // Update reflections counter
        const reflectionsElement = document.getElementById('reflections-display');
        if (reflectionsElement) {
            reflectionsElement.textContent = `${this.performanceStats.activeReflections}/${this.config.maxSpots}`;
        }
        
        // Update facets counter
        const facetsElement = document.getElementById('facets-display');
        if (facetsElement) {
            facetsElement.textContent = this.performanceStats.totalFacets;
        }
        
        // Update performance cost
        const costElement = document.getElementById('performance-cost');
        if (costElement) {
            let costLabel = 'Low';
            let costClass = 'stat-value';
            
            if (performanceCost > 80) {
                costLabel = 'Very High';
                costClass = 'stat-value critical';
            } else if (performanceCost > 60) {
                costLabel = 'High';
                costClass = 'stat-value warning';
            } else if (performanceCost > 40) {
                costLabel = 'Medium';
                costClass = 'stat-value';
            } else if (performanceCost > 20) {
                costLabel = 'Low';
                costClass = 'stat-value';
            }
            
            costElement.textContent = costLabel;
            costElement.className = costClass;
        }
        
        // Hide/show panel based on setting
        const panel = document.getElementById('performance-panel');
        if (panel) {
            panel.style.display = this.config.showPerformanceStats ? 'block' : 'none';
        }
    }
    
    updateReflections() {
        if (!this.discoBall || !this.spotLight || !this.facetData.length) return;
        
        // Reset all reflection spots
        this.reflectionSpots.forEach(spot => {
            spot.active = false;
            spot.mesh.visible = false;
            spot.mesh.material.opacity = 0;
        });
        
        const ballWorldPos = new THREE.Vector3();
        this.discoBall.getWorldPosition(ballWorldPos);
        let activeSpotIndex = 0;
        
        // Create array of active lights with their properties
        const activeLights = [
            {
                light: this.spotLight,
                color: this.config.lightColor,
                intensity: this.config.lightIntensity,
                name: 'Light 1'
            }
        ];
        
        if (this.config.enableSecondLight && this.spotLight2) {
            activeLights.push({
                light: this.spotLight2,
                color: this.config.light2Color,
                intensity: this.config.light2Intensity,
                name: 'Light 2'
            });
        }
        
        // Process each light source separately to create individual reflections
        activeLights.forEach((lightSource, lightIndex) => {
            this.facetData.forEach((facetInfo, facetIndex) => {
                if (activeSpotIndex >= this.reflectionSpots.length) return;
                
                // Get current world position and normal of the facet
                const worldPos = new THREE.Vector3();
                facetInfo.mesh.getWorldPosition(worldPos);
                
                // Calculate world normal (rotated with the disco ball)
                const worldNormal = facetInfo.localNormal.clone();
                worldNormal.applyQuaternion(this.discoBall.quaternion);
                
                const lightPos = lightSource.light.position.clone();
                const lightColor = new THREE.Color(lightSource.color);
                
                // Calculate incident light direction to this facet
                const incidentDir = worldPos.clone().sub(lightPos).normalize();
                
                // Check if facet is facing the light (dot product > 0)
                const facingLight = worldNormal.dot(incidentDir.clone().negate()) > 0.1;
                
                // Check if facet is within the spotlight cone
                const lightToTarget = lightSource.light.target.position.clone().sub(lightPos).normalize();
                const lightToFacet = worldPos.clone().sub(lightPos).normalize();
                const angleToFacet = Math.acos(Math.max(-1, Math.min(1, lightToTarget.dot(lightToFacet))));
                const spotHalfAngle = lightSource.light.angle / 2;
                const withinSpotlightCone = angleToFacet <= spotHalfAngle;
                
                if (facingLight && withinSpotlightCone) {
                    // Calculate reflected ray using: R = I - 2(I·N)N
                    const reflectionDir = incidentDir.clone().sub(
                        worldNormal.clone().multiplyScalar(2 * incidentDir.dot(worldNormal))
                    );
                    
                    // Find intersection with room surfaces
                    const intersection = this.findSurfaceIntersection(worldPos, reflectionDir);
                    
                    if (intersection && activeSpotIndex < this.reflectionSpots.length) {
                        const spot = this.reflectionSpots[activeSpotIndex];
                        
                        // Position the light spot
                        spot.mesh.position.copy(intersection.point);
                        
                        // Orient the spot to face the surface normal
                        const targetPos = intersection.point.clone().add(intersection.normal);
                        spot.mesh.lookAt(targetPos);
                        
                        // Calculate intensity based on angle and distance
                        const distance = worldPos.distanceTo(intersection.point);
                        const angle = Math.abs(worldNormal.dot(incidentDir.clone().negate()));
                        const baseIntensity = Math.pow(angle, 2);
                        const distanceFalloff = Math.max(0.1, 1 / (1 + distance * 0.1));
                        
                        // Room size affects reflection brightness - larger rooms = dimmer reflections
                        const roomSizeEffect = 10 / this.config.roomSize;
                        const finalIntensity = baseIntensity * distanceFalloff * lightSource.intensity * 0.3 * roomSizeEffect;
                        
                        // Set spot properties with light color - each light creates its own colored spot
                        spot.mesh.visible = true;
                        spot.mesh.material.color.copy(lightColor);
                        spot.mesh.material.opacity = Math.min(0.8, finalIntensity);
                        
                        // Ball size affects reflection spot size
                        const ballSizeMultiplier = this.config.ballSize / 1.5;
                        const roomSizeMultiplier = 10 / this.config.roomSize;
                        const baseSpotSize = 0.5 + finalIntensity * 2;
                        spot.mesh.scale.setScalar(baseSpotSize * ballSizeMultiplier * roomSizeMultiplier);
                        spot.active = true;
                        spot.lightSource = lightSource.name; // Track which light created this spot
                        
                        activeSpotIndex++;
                    }
                }
            });
        });
        
        // Update facet brightness based on all illuminating lights
        this.facetData.forEach((facetInfo) => {
            const worldPos = new THREE.Vector3();
            facetInfo.mesh.getWorldPosition(worldPos);
            
            const worldNormal = facetInfo.localNormal.clone();
            worldNormal.applyQuaternion(this.discoBall.quaternion);
            
            let maxFacetOpacity = 0.4;
            
            // Check illumination from all lights
            activeLights.forEach((lightSource) => {
                const lightPos = lightSource.light.position.clone();
                const incidentDir = worldPos.clone().sub(lightPos).normalize();
                const facingLight = worldNormal.dot(incidentDir.clone().negate()) > 0.1;
                
                const lightToTarget = lightSource.light.target.position.clone().sub(lightPos).normalize();
                const lightToFacet = worldPos.clone().sub(lightPos).normalize();
                const angleToFacet = Math.acos(Math.max(-1, Math.min(1, lightToTarget.dot(lightToFacet))));
                const spotHalfAngle = lightSource.light.angle / 2;
                const withinSpotlightCone = angleToFacet <= spotHalfAngle;
                
                if (facingLight && withinSpotlightCone) {
                    const angle = Math.abs(worldNormal.dot(incidentDir.clone().negate()));
                    const intensity = Math.pow(angle, 2) * lightSource.intensity * 0.4;
                    maxFacetOpacity = Math.max(maxFacetOpacity, 0.6 + intensity);
                }
            });
            
            facetInfo.mesh.material.opacity = Math.min(1.0, maxFacetOpacity);
        });
    }
    
    findSurfaceIntersection(rayOrigin, rayDirection) {
        // Use utility function for surface intersection
        return findClosestSurfaceIntersection(rayOrigin, rayDirection, this.roomSurfaces);
    }
    
    onWindowResize() {
        if (this.camera && this.renderer) {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        }
    }
    
    destroy() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        if (this.renderer) {
            this.renderer.dispose();
        }
    }
}

// Initialize when page loads
let discoBallApp;

// Wait for both DOM and Three.js to load
function initializeApp() {
    if (typeof THREE !== 'undefined' && document.readyState === 'complete') {
        console.log('Initializing disco ball app...');
        discoBallApp = new DiscoBallExperience();
    } else {
        console.log('Waiting for dependencies...');
        setTimeout(initializeApp, 100);
    }
}

// Start initialization
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (discoBallApp) {
        discoBallApp.destroy();
    }
});