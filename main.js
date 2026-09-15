// GHD Interactive Studio - 3D Interactive Engine (Three.js)

function init3DStudio() {
    const canvas = document.getElementById('webgl-canvas');
    if (!canvas) {
        console.warn('[GHD 3D] Canvas #webgl-canvas not found');
        return;
    }

    if (typeof THREE === 'undefined') {
        console.error('[GHD 3D] Three.js is not loaded');
        return;
    }

    // 1. Scene, Camera & WebGL Renderer
    const scene = new THREE.Scene();
    
    const camera = new THREE.PerspectiveCamera(
        60,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
    );
    camera.position.z = 7;

    let renderer;
    try {
        renderer = new THREE.WebGLRenderer({
            canvas: canvas,
            alpha: true,
            antialias: true,
            powerPreference: 'high-performance'
        });
    } catch (e) {
        console.error('[GHD 3D] WebGL not supported or initialization failed:', e);
        return;
    }

    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // 2. Lighting (Neon Cyan, Neon Violet & Google Play accents)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const cyanPointLight = new THREE.PointLight(0x00f0ff, 3.5, 60);
    cyanPointLight.position.set(6, 6, 8);
    scene.add(cyanPointLight);

    const violetPointLight = new THREE.PointLight(0x8a2be2, 3.5, 60);
    violetPointLight.position.set(-6, -6, 8);
    scene.add(violetPointLight);

    const blueSubLight = new THREE.DirectionalLight(0x005691, 1.2);
    blueSubLight.position.set(0, 10, 5);
    scene.add(blueSubLight);

    const redSubLight = new THREE.DirectionalLight(0xea4335, 0.8);
    redSubLight.position.set(-5, -10, 2);
    scene.add(redSubLight);

    // 3. Central Interactive 3D Shape
    const centralGroup = new THREE.Group();
    scene.add(centralGroup);

    // Responsive scaling (minimized size for optimal visual balance)
    function updateScale() {
        const isMobile = window.innerWidth < 768;
        const scale = isMobile ? 0.50 : 0.68;
        centralGroup.scale.set(scale, scale, scale);
    }
    updateScale();

    // A. Outer Twisted Ring (Torus Knot) - Solid Metallic + Neon Cyan Wireframe
    const outerGeo = new THREE.TorusKnotGeometry(1.65, 0.42, 128, 32, 2, 3);
    
    // Solid glossy body
    const outerSolidMat = new THREE.MeshStandardMaterial({
        color: 0x03182b,
        emissive: 0x00384d,
        roughness: 0.15,
        metalness: 0.85
    });
    const outerSolidMesh = new THREE.Mesh(outerGeo, outerSolidMat);
    centralGroup.add(outerSolidMesh);

    // Glowing wireframe cage
    const outerWireMat = new THREE.MeshBasicMaterial({
        color: 0x00f0ff,
        wireframe: true,
        transparent: true,
        opacity: 0.65
    });
    const outerWireMesh = new THREE.Mesh(outerGeo, outerWireMat);
    centralGroup.add(outerWireMesh);

    // B. Inner Geometric Core (Icosahedron) - Neon Violet Facets & Wireframe
    const innerGeo = new THREE.IcosahedronGeometry(0.85, 1);
    
    const innerSolidMat = new THREE.MeshStandardMaterial({
        color: 0x240046,
        emissive: 0x7b2cbf,
        emissiveIntensity: 0.6,
        roughness: 0.2,
        metalness: 0.8,
        flatShading: true
    });
    const innerSolidMesh = new THREE.Mesh(innerGeo, innerSolidMat);
    centralGroup.add(innerSolidMesh);

    const innerWireMat = new THREE.MeshBasicMaterial({
        color: 0xc77dff,
        wireframe: true,
        transparent: true,
        opacity: 0.7
    });
    const innerWireMesh = new THREE.Mesh(innerGeo, innerWireMat);
    centralGroup.add(innerWireMesh);

    // C. Orbiting Neon Rings
    const ring1Geo = new THREE.TorusGeometry(2.35, 0.035, 16, 120);
    const ring1Mat = new THREE.MeshBasicMaterial({
        color: 0x00f0ff,
        transparent: true,
        opacity: 0.5
    });
    const ring1Mesh = new THREE.Mesh(ring1Geo, ring1Mat);
    ring1Mesh.rotation.x = Math.PI / 3;
    centralGroup.add(ring1Mesh);

    const ring2Geo = new THREE.TorusGeometry(2.55, 0.025, 16, 120);
    const ring2Mat = new THREE.MeshBasicMaterial({
        color: 0x8a2be2,
        transparent: true,
        opacity: 0.45
    });
    const ring2Mesh = new THREE.Mesh(ring2Geo, ring2Mat);
    ring2Mesh.rotation.y = Math.PI / 4;
    centralGroup.add(ring2Mesh);

    // 4. Floating Snow Fragments & Sparkling White Stars
    function createStarSnowTexture() {
        const pCanvas = document.createElement('canvas');
        pCanvas.width = 64;
        pCanvas.height = 64;
        const ctx = pCanvas.getContext('2d');
        const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
        gradient.addColorStop(0.2, 'rgba(255, 255, 255, 0.9)');
        gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.35)');
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(32, 32, 32, 0, Math.PI * 2);
        ctx.fill();

        return new THREE.CanvasTexture(pCanvas);
    }

    const particleCount = 2200;
    const particleGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const velocities = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount * 3; i += 3) {
        positions[i] = (Math.random() - 0.5) * 45;      // x
        positions[i + 1] = (Math.random() - 0.5) * 40;  // y
        positions[i + 2] = (Math.random() - 0.5) * 35;  // z

        velocities[i] = (Math.random() - 0.5) * 0.008;
        velocities[i + 1] = -0.01 - Math.random() * 0.02; // falling snow drift
        velocities[i + 2] = (Math.random() - 0.5) * 0.008;
    }

    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const particleMat = new THREE.PointsMaterial({
        size: 0.42,
        map: createStarSnowTexture(),
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        color: 0xffffff
    });

    const particleSystem = new THREE.Points(particleGeo, particleMat);
    scene.add(particleSystem);

    // 5. Mouse & Touch Interaction
    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;

    function handlePointer(clientX, clientY) {
        targetX = (clientX / window.innerWidth) * 2 - 1;
        targetY = -(clientY / window.innerHeight) * 2 + 1;
    }

    window.addEventListener('mousemove', (e) => {
        handlePointer(e.clientX, e.clientY);
    }, { passive: true });

    window.addEventListener('touchmove', (e) => {
        if (e.touches.length > 0) {
            handlePointer(e.touches[0].clientX, e.touches[0].clientY);
        }
    }, { passive: true });

    // 6. Window Resize
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        updateScale();
    });

    // 7. Render Loop
    const clock = new THREE.Clock();

    function renderFrame() {
        requestAnimationFrame(renderFrame);

        const delta = clock.getDelta();
        const elapsed = clock.getElapsedTime();

        // Smooth Lerp Damping
        currentX += (targetX - currentX) * 0.05;
        currentY += (targetY - currentY) * 0.05;

        // Animate Central Group
        centralGroup.rotation.x = currentY * 0.95 + elapsed * 0.28;
        centralGroup.rotation.y = currentX * 0.95 + elapsed * 0.38;
        centralGroup.position.x = currentX * 0.65;
        centralGroup.position.y = currentY * 0.50;

        // Counter-rotation of inner core
        innerSolidMesh.rotation.x -= delta * 0.7;
        innerSolidMesh.rotation.y -= delta * 0.9;
        innerWireMesh.rotation.x -= delta * 0.7;
        innerWireMesh.rotation.y -= delta * 0.9;

        // Rings rotation
        ring1Mesh.rotation.z += delta * 0.4;
        ring2Mesh.rotation.z -= delta * 0.3;

        // Snow / Star particles drift
        const posAttr = particleGeo.attributes.position;
        const posArray = posAttr.array;

        for (let i = 0; i < particleCount * 3; i += 3) {
            posArray[i + 1] += velocities[i + 1];
            posArray[i] += velocities[i];

            if (posArray[i + 1] < -20) {
                posArray[i + 1] = 20;
                posArray[i] = (Math.random() - 0.5) * 45;
            }
        }
        posAttr.needsUpdate = true;

        // Subtle camera tracking
        camera.position.x = currentX * 0.35;
        camera.position.y = currentY * 0.35;
        camera.lookAt(0, 0, 0);

        renderer.render(scene, camera);
    }

    renderFrame();
    console.log('[GHD 3D] Engine initialized successfully');
}

// Ensure execution once DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init3DStudio);
} else {
    init3DStudio();
}
