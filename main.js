// GHD Interactive Studio — Neural Network 3D Engine + Theme System
// v2.0 | Three.js Neural Net | Dark/Light Mode | Mobile Ready

// ═══════════════════════════════════════════════════════════════
//  THEME PALETTE
// ═══════════════════════════════════════════════════════════════
const GHD_THEME = {
    dark: {
        node:        0x00f0ff,
        line:        0x00f0ff,
        signal:      0xff7b00,
        nodeSize:    0.07,
        nodeOpacity: 0.90,
        lineOpacity: 0.50,
        blending:    null   // THREE.AdditiveBlending — set after THREE loads
    },
    light: {
        node:        0x2563eb,
        line:        0x2563eb,
        signal:      0xea580c,
        nodeSize:    0.07,
        nodeOpacity: 0.75,
        lineOpacity: 0.28,
        blending:    null   // THREE.NormalBlending — set after THREE loads
    }
};

// ═══════════════════════════════════════════════════════════════
//  NEURAL NETWORK 3D
// ═══════════════════════════════════════════════════════════════
function initNeuralNetwork() {
    const canvas = document.getElementById('webgl-canvas');
    if (!canvas) { console.warn('[GHD Neural] Canvas not found'); return; }
    if (typeof THREE === 'undefined') { console.error('[GHD Neural] Three.js not loaded'); return; }

    // Fill blending refs now that THREE is loaded
    GHD_THEME.dark.blending  = THREE.AdditiveBlending;
    GHD_THEME.light.blending = THREE.NormalBlending;

    // ── Scene / Camera / Renderer ───────────────────────────────
    const scene  = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.z = 8;

    let renderer;
    try {
        renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
    } catch (e) {
        console.error('[GHD Neural] WebGL init failed', e);
        return;
    }
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // ── Neural Net Group (slightly behind UI) ────────────────────
    const neuralNetGroup = new THREE.Group();
    neuralNetGroup.position.z = -1;
    scene.add(neuralNetGroup);

    // ── Config ───────────────────────────────────────────────────
    const NODE_COUNT  = 90;          // more nodes = denser network
    const MAX_DIST    = 1.4;          // shorter synapses (was 2.2)
    const MAX_SIGNALS = 40;           // many more impulses (was 20)
    const BOUNDS      = new THREE.Vector3(4.5, 3.5, 2.5);

    // ── Nodes ────────────────────────────────────────────────────
    const nodePos = [];
    const nodeVel = [];

    for (let i = 0; i < NODE_COUNT; i++) {
        nodePos.push(new THREE.Vector3(
            (Math.random() - 0.5) * BOUNDS.x * 2,
            (Math.random() - 0.5) * BOUNDS.y * 2,
            (Math.random() - 0.5) * BOUNDS.z * 2
        ));
        nodeVel.push(new THREE.Vector3(
            (Math.random() - 0.5) * 0.010,   // faster drift (was 0.006)
            (Math.random() - 0.5) * 0.010,
            (Math.random() - 0.5) * 0.006
        ));
    }

    const nodeGeoArr = new Float32Array(NODE_COUNT * 3);
    const nodeGeo    = new THREE.BufferGeometry();
    nodeGeo.setAttribute('position', new THREE.BufferAttribute(nodeGeoArr, 3));

    const nodeMat = new THREE.PointsMaterial({
        color:       GHD_THEME.dark.node,
        size:        GHD_THEME.dark.nodeSize,
        transparent: true,
        opacity:     GHD_THEME.dark.nodeOpacity,
        blending:    THREE.AdditiveBlending,
        depthWrite:  false,
        sizeAttenuation: true
    });
    const nodePoints = new THREE.Points(nodeGeo, nodeMat);
    neuralNetGroup.add(nodePoints);

    // ── Synapses ─────────────────────────────────────────────────
    // Pre-allocate worst-case buffer (N*(N-1)/2 pairs × 2 points × 3 coords)
    const MAX_LINE_VERTS = Math.ceil(NODE_COUNT * (NODE_COUNT - 1) / 2) * 2;
    const lineGeoArr     = new Float32Array(MAX_LINE_VERTS * 3);
    const lineGeo        = new THREE.BufferGeometry();
    lineGeo.setAttribute('position', new THREE.BufferAttribute(lineGeoArr, 3));

    const lineMat = new THREE.LineBasicMaterial({
        color:       GHD_THEME.dark.line,
        transparent: true,
        opacity:     GHD_THEME.dark.lineOpacity,
        blending:    THREE.AdditiveBlending,
        depthWrite:  false
    });
    const lineSegs = new THREE.LineSegments(lineGeo, lineMat);
    neuralNetGroup.add(lineSegs);

    // ── Signals (data impulses) ──────────────────────────────────
    const signals      = [];
    const signalGeoArr = new Float32Array(MAX_SIGNALS * 3);
    const signalGeo    = new THREE.BufferGeometry();
    signalGeo.setAttribute('position', new THREE.BufferAttribute(signalGeoArr, 3));

    const signalMat = new THREE.PointsMaterial({
        color:       GHD_THEME.dark.signal,
        size:        0.15,
        transparent: true,
        opacity:     0.95,
        blending:    THREE.AdditiveBlending,
        depthWrite:  false,
        sizeAttenuation: true
    });
    const signalPts = new THREE.Points(signalGeo, signalMat);
    neuralNetGroup.add(signalPts);

    // Park all unused signals far off-screen
    for (let i = 0; i < MAX_SIGNALS; i++) {
        signalGeoArr[i * 3]     = 999;
        signalGeoArr[i * 3 + 1] = 999;
        signalGeoArr[i * 3 + 2] = 999;
    }

    // ── Active connections (rebuilt each frame) ──────────────────
    let activeConns = [];

    // ── Pointer interaction ──────────────────────────────────────
    let targetRotX = 0, targetRotY = 0;
    let currentRotX = 0, currentRotY = 0;

    function handlePointer(nx, ny) {
        targetRotY = (nx - 0.5) * 0.7;
        targetRotX = (ny - 0.5) * 0.45;
    }
    window.addEventListener('pointermove', e => {
        handlePointer(e.clientX / window.innerWidth, e.clientY / window.innerHeight);
    }, { passive: true });
    window.addEventListener('touchmove', e => {
        if (e.touches.length > 0) {
            handlePointer(e.touches[0].clientX / window.innerWidth, e.touches[0].clientY / window.innerHeight);
        }
    }, { passive: true });

    // ── Resize ───────────────────────────────────────────────────
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    });

    // ── Signal spawner ───────────────────────────────────────────
    function spawnSignal() {
        if (signals.length >= MAX_SIGNALS || activeConns.length === 0) return;
        const conn = activeConns[Math.floor(Math.random() * activeConns.length)];
        signals.push({
            from:  nodePos[conn.a].clone(),
            to:    nodePos[conn.b].clone(),
            t:     0,
            speed: 0.55 + Math.random() * 0.70   // much faster (was 0.25–0.70)
        });
    }

    // ── Expose for theme switcher ────────────────────────────────
    window._ghdScene = {
        renderer, scene, camera,
        nodeMat, lineMat, signalMat,
        neuralNetGroup
    };

    // ── Render loop ──────────────────────────────────────────────
    const clock = new THREE.Clock();
    let   lastSpawn = 0;

    function animate() {
        requestAnimationFrame(animate);
        const delta   = clock.getDelta();
        const elapsed = clock.getElapsedTime();

        // Update node positions (bounce)
        for (let i = 0; i < NODE_COUNT; i++) {
            const p = nodePos[i], v = nodeVel[i];
            p.x += v.x; p.y += v.y; p.z += v.z;
            if (Math.abs(p.x) > BOUNDS.x) v.x *= -1;
            if (Math.abs(p.y) > BOUNDS.y) v.y *= -1;
            if (Math.abs(p.z) > BOUNDS.z) v.z *= -1;
            nodeGeoArr[i * 3]     = p.x;
            nodeGeoArr[i * 3 + 1] = p.y;
            nodeGeoArr[i * 3 + 2] = p.z;
        }
        nodeGeo.attributes.position.needsUpdate = true;

        // Rebuild synapses
        let vi = 0;
        activeConns = [];
        for (let i = 0; i < NODE_COUNT; i++) {
            for (let j = i + 1; j < NODE_COUNT; j++) {
                const dx   = nodePos[i].x - nodePos[j].x;
                const dy   = nodePos[i].y - nodePos[j].y;
                const dz   = nodePos[i].z - nodePos[j].z;
                const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
                if (dist < MAX_DIST) {
                    lineGeoArr[vi++] = nodePos[i].x;
                    lineGeoArr[vi++] = nodePos[i].y;
                    lineGeoArr[vi++] = nodePos[i].z;
                    lineGeoArr[vi++] = nodePos[j].x;
                    lineGeoArr[vi++] = nodePos[j].y;
                    lineGeoArr[vi++] = nodePos[j].z;
                    activeConns.push({ a: i, b: j });
                }
            }
        }
        lineGeo.setDrawRange(0, vi / 3);
        lineGeo.attributes.position.needsUpdate = true;

        // Spawn signals — 2 per tick, every 0.06s = high activity
        if (elapsed - lastSpawn > 0.06) {
            spawnSignal();
            spawnSignal();   // spawn 2 at once
            lastSpawn = elapsed;
        }

        // Update signals
        const _v3 = new THREE.Vector3();
        for (let s = signals.length - 1; s >= 0; s--) {
            signals[s].t += delta * signals[s].speed;
            if (signals[s].t >= 1) {
                // Park this slot
                signalGeoArr[s * 3]     = 999;
                signalGeoArr[s * 3 + 1] = 999;
                signalGeoArr[s * 3 + 2] = 999;
                signals.splice(s, 1);
                continue;
            }
            _v3.lerpVectors(signals[s].from, signals[s].to, signals[s].t);
            signalGeoArr[s * 3]     = _v3.x;
            signalGeoArr[s * 3 + 1] = _v3.y;
            signalGeoArr[s * 3 + 2] = _v3.z;
        }
        signalGeo.attributes.position.needsUpdate = true;

        // Smooth rotation + slow auto-drift
        currentRotX += (targetRotX - currentRotX) * 0.035;
        currentRotY += (targetRotY - currentRotY) * 0.035;
        neuralNetGroup.rotation.x = currentRotX;
        neuralNetGroup.rotation.y = currentRotY + elapsed * 0.035;

        renderer.render(scene, camera);
    }

    animate();
    console.log('[GHD Neural] Initialized — nodes:', NODE_COUNT);
}

// ═══════════════════════════════════════════════════════════════
//  THEME SYSTEM
// ═══════════════════════════════════════════════════════════════

/**
 * Apply theme to CSS (html class) + Three.js materials
 * @param {boolean} isLight
 */
function updateTheme(isLight) {
    const html = document.documentElement;

    // ── CSS ──────────────────────────────────────────────────────
    if (isLight) {
        html.classList.add('light-mode');
    } else {
        html.classList.remove('light-mode');
    }

    // ── Persist ──────────────────────────────────────────────────
    try { localStorage.setItem('ghd_theme', isLight ? 'light' : 'dark'); } catch(_) {}

    // ── Three.js materials ───────────────────────────────────────
    const S = window._ghdScene;
    if (S && typeof THREE !== 'undefined') {
        const t = isLight ? GHD_THEME.light : GHD_THEME.dark;

        S.nodeMat.color.setHex(t.node);
        S.nodeMat.opacity  = t.nodeOpacity;
        S.nodeMat.blending = t.blending;
        S.nodeMat.needsUpdate = true;

        S.lineMat.color.setHex(t.line);
        S.lineMat.opacity  = t.lineOpacity;
        S.lineMat.blending = t.blending;
        S.lineMat.needsUpdate = true;

        S.signalMat.color.setHex(t.signal);
        S.signalMat.needsUpdate = true;
    }

    // ── Toggle button icon ───────────────────────────────────────
    document.querySelectorAll('.theme-toggle').forEach(btn => {
        btn.setAttribute('aria-label', isLight ? 'Mode sombre' : 'Mode clair');
        btn.title = isLight ? 'Passer en mode sombre' : 'Passer en mode clair';
    });
}

/**
 * Read saved preference or detect system preference
 * @returns {boolean} isLight
 */
function detectTheme() {
    try {
        const saved = localStorage.getItem('ghd_theme');
        if (saved === 'light') return true;
        if (saved === 'dark')  return false;
    } catch(_) {}
    // Fallback: system preference (default to dark for studio aesthetic)
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
}

// ── Theme toggle button wiring ────────────────────────────────
function initThemeToggle() {
    let isLight = detectTheme();
    // Apply immediately (suppress flash)
    updateTheme(isLight);

    document.querySelectorAll('.theme-toggle').forEach(btn => {
        btn.addEventListener('click', () => {
            isLight = !isLight;
            updateTheme(isLight);
        });
    });
}

// ═══════════════════════════════════════════════════════════════
//  MOBILE NAVIGATION — close on outside tap / link click
// ═══════════════════════════════════════════════════════════════
function initMobileMenu() {
    const nav = document.getElementById('mainNav') || document.querySelector('.glass-nav');
    if (!nav) return;

    nav.querySelectorAll('.nav-links a').forEach(link => {
        link.addEventListener('click', () => {
            nav.classList.remove('mobile-menu-active');
        });
    });

    document.addEventListener('click', e => {
        if (!nav.contains(e.target)) {
            nav.classList.remove('mobile-menu-active');
        }
    });
}

// ═══════════════════════════════════════════════════════════════
//  BOOT
// ═══════════════════════════════════════════════════════════════
function initApp() {
    initThemeToggle();   // theme first (no flash)
    initNeuralNetwork(); // then 3D
    initMobileMenu();    // then nav
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}
