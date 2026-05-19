/* avatar3d.js — Avaka 3D Character (Three.js, fully offline) */
let avatarScene, avatarCamera, avatarRenderer, avatarAnimId, avatarGroup, avatarComposer, avatarParticles;
let isDragging = false, prevMouse = {x:0,y:0}, rotY = 0.3, rotX = -0.05;
let targetHeadRotY = 0, targetHeadRotX = 0;

// Advanced Idle Rig Node References
let idleRig = { torso: null, shoulders: [], armGroups: [], pecs: [], abs: [] };
let currentBodySwing = 0; // tracks body sway for head coupling


const avatarState = {
    skin:'#A0622A', hair:'short', hairColor:'#0d0d0d',
    eye:'#2a1a08', face:'round', accessory:'none', cloth:'loincloth'
};

const C = (hex) => new THREE.Color(hex);

function initAvatar3D() {
    const canvas = document.getElementById('avatar-canvas');
    if (!canvas) return;
    const W = canvas.offsetWidth || 320, H = canvas.offsetHeight || 420;
    canvas.width = W * window.devicePixelRatio;
    canvas.height = H * window.devicePixelRatio;

    avatarScene = new THREE.Scene();
    avatarScene.background = new THREE.Color('#060d1a');
    avatarScene.fog = new THREE.Fog('#060d1a', 12, 30);

    avatarCamera = new THREE.PerspectiveCamera(44, W/H, 0.1, 100);
    avatarCamera.position.set(0, 0.8, 6.2);
    avatarCamera.lookAt(0, 0.5, 0);

    avatarRenderer = new THREE.WebGLRenderer({canvas, antialias:true});
    avatarRenderer.setPixelRatio(window.devicePixelRatio);
    avatarRenderer.setSize(W, H);
    avatarRenderer.shadowMap.enabled = true;
    avatarRenderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Premium Cinematic Studio Lighting (100% offline cross-platform safe)
    avatarScene.add(new THREE.AmbientLight(0xffeedd, 0.55));
    
    // Main sunlight key
    const sun = new THREE.DirectionalLight(0xfff5e0, 1.15);
    sun.position.set(3, 6, 5); sun.castShadow = true;
    sun.shadow.mapSize.width = 1024; sun.shadow.mapSize.height = 1024;
    avatarScene.add(sun);
    
    // Cool shadow fill
    const fill = new THREE.DirectionalLight(0x8899cc, 0.45);
    fill.position.set(-4, 2, -3); avatarScene.add(fill);
    
    // Vivid blue rim light from the rear
    const rim = new THREE.PointLight(0x38bdf8, 0.7, 18);
    rim.position.set(0, 4, -4); avatarScene.add(rim);
    
    // Warm accent key for rich glowing skin tones
    const accent = new THREE.DirectionalLight(0xffaa66, 0.35);
    accent.position.set(-3, 3, 4); avatarScene.add(accent);

    // Ground
    const gnd = new THREE.Mesh(
        new THREE.CircleGeometry(3.5, 40),
        new THREE.MeshStandardMaterial({color:0x0a1520, roughness:0.9, metalness:0.1})
    );
    gnd.rotation.x = -Math.PI/2; 
    gnd.position.y = -1.98; // Positioned exactly beneath lowest foot boundary
    gnd.receiveShadow = true;
    avatarScene.add(gnd);

    avatarGroup = new THREE.Group();
    avatarScene.add(avatarGroup);
    buildCharacter();
    
    // 旗艦級後處理光效管線 (Post-Processing UnrealBloomPass)
    // 賦予純銀高光反射點、明亮邊緣極致迷人的大氣擴散輝光光暈
    try {
        if (THREE.EffectComposer && THREE.RenderPass && THREE.UnrealBloomPass) {
            avatarComposer = new THREE.EffectComposer(avatarRenderer);
            const renderPass = new THREE.RenderPass(avatarScene, avatarCamera);
            avatarComposer.addPass(renderPass);
            
            // UnrealBloomPass(解析度, 輝光強度, 擴散半徑, 觸發閾值)
            // 精心設定高閾值(0.65)，確保僅有受光強烈的金屬高光與明亮膚色邊緣產生光暈，避免全螢幕過曝
            const bloomPass = new THREE.UnrealBloomPass(new THREE.Vector2(W, H), 0.38, 0.85, 0.65);
            avatarComposer.addPass(bloomPass);
        }
    } catch(e) {
        console.warn("Bloom FX skipped:", e);
        avatarComposer = null;
    }

    setupControls(canvas);

    // Epic Ocean Particle Aura (Proposal 5)
    // 300 ocean-tone micro-glowing particles that spiral upward around the character
    avatarParticles = buildParticleAura();
    avatarScene.add(avatarParticles.points);

    animate();
}

function mat(color, rough=0.75, metal=0.0) {
    return new THREE.MeshStandardMaterial({
        color: C(color),
        roughness: rough,
        metalness: metal
    });
}

// ── Epic Ocean Particle Aura System ─────────────────────────────────────────
function buildParticleAura() {
    const COUNT = 300;
    const positions = new Float32Array(COUNT * 3);
    const colors    = new Float32Array(COUNT * 3);
    const meta = []; // per-particle lifecycle data

    // Ocean palette: deep navy, cyan, teal, ice-blue
    const palette = [
        new THREE.Color('#00d4ff'), // cyan
        new THREE.Color('#0ea5e9'), // sky-blue
        new THREE.Color('#06b6d4'), // teal
        new THREE.Color('#38bdf8'), // light sky
        new THREE.Color('#7dd3fc'), // ice blue
        new THREE.Color('#bae6fd'), // pale mist
    ];

    for (let i = 0; i < COUNT; i++) {
        const angle  = Math.random() * Math.PI * 2;
        const radius = 0.45 + Math.random() * 0.80; // ring around character
        const yStart = -2.0 + Math.random() * 4.2;  // full height span
        positions[i*3+0] = Math.cos(angle) * radius;
        positions[i*3+1] = yStart;
        positions[i*3+2] = Math.sin(angle) * radius;

        const col = palette[Math.floor(Math.random() * palette.length)];
        colors[i*3+0] = col.r;
        colors[i*3+1] = col.g;
        colors[i*3+2] = col.b;

        meta.push({
            angle,
            radius,
            y: yStart,
            speed:    0.004 + Math.random() * 0.010, // rise speed
            drift:    (Math.random() - 0.5) * 0.004, // angular drift
            lifespan: 0.3 + Math.random() * 0.7,     // 0-1 opacity phase position
            fadeDir:  Math.random() > 0.5 ? 1 : -1,  // fade in or out initially
        });
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color',    new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.PointsMaterial({
        size: 0.045,
        vertexColors: true,
        transparent: true,
        opacity: 0.75,
        depthWrite: false,
        blending: THREE.AdditiveBlending, // additive blend for glowing aura look
        sizeAttenuation: true,
    });

    const points = new THREE.Points(geo, mat);
    return { points, geo, meta, positions };
}

let headGroup = null;
let currentGroup = null;

function buildCharacter() {
    while (avatarGroup.children.length) avatarGroup.remove(avatarGroup.children[0]);
    headGroup = new THREE.Group();
    avatarGroup.add(headGroup);

    // Scale down head for realistic proportions (approx 1/7 heads tall instead of 1/3)
    headGroup.scale.set(0.72, 0.72, 0.72);
    // Offset head up so scaled neck aligns with torso top (y=1.6)
    headGroup.position.y = 1.6 - (1.59 * 0.72); 
    currentGroup = headGroup;

    const sk = avatarState.skin;
    const hc = avatarState.hairColor;
    const ec = avatarState.eye;
    const faceType = avatarState.face;

    // ── Face shape ──
    let fw = 0.52, fh = 0.58, fd = 0.50;
    if (faceType==='square') { fw=0.60; fh=0.54; fd=0.50; }
    if (faceType==='slim')   { fw=0.42; fh=0.66; fd=0.48; }

    // ── Head ──
    const headGeo = new THREE.SphereGeometry(0.5, 36, 28);
    headGeo.scale(fw/0.5, fh/0.5, fd/0.5);
    const head = add(headGeo, mat(sk, 0.7));
    head.position.set(0, 2.1, 0);

    // ── Ears (Clean soft integration) ──
    [-1,1].forEach(s => {
        const e = add(new THREE.SphereGeometry(0.09, 16, 12), mat(sk, 0.8));
        e.position.set(s*(fw+0.03), 2.06, -0.02); e.scale.set(0.5, 0.85, 0.35);
    });

    // Realistic Face Proportions
    const eyeY = 2.06, browY = 2.15, noseY = 1.94, mouthY = 1.84;

    // ── Eyes (Perfectly flush embedded/decal-like integration) ──
    [-0.17, 0.17].forEach(x => {
        // Sclera (White) - extremely flat along Z, flush with face surface
        const ew = add(new THREE.SphereGeometry(0.08, 16, 12), mat('#fafafa',0.2));
        ew.position.set(x, eyeY, fd - 0.002);
        ew.scale.set(1.1, 0.85, 0.05); // perfectly flat
        // Iris
        const iris = add(new THREE.SphereGeometry(0.048, 16, 12), mat(ec,0.4));
        iris.position.set(x, eyeY, fd);
        iris.scale.set(1.0, 1.0, 0.05);
        // Pupil
        const pu = add(new THREE.SphereGeometry(0.024, 12, 10), mat('#050505',0.3));
        pu.position.set(x, eyeY, fd + 0.002);
        pu.scale.set(1.0, 1.0, 0.05);
        // Subtle Highlight
        const hl = add(new THREE.SphereGeometry(0.008, 8, 8), mat('#ffffff',0.1));
        hl.position.set(x+0.012, eyeY+0.01, fd + 0.004);
        hl.scale.set(1.0, 1.0, 0.05);
    });

    // ── Eyebrows (Flush decal-like arches) ──
    [-0.17,0.17].forEach(x => {
        const brow = add(new THREE.BoxGeometry(0.12, 0.012, 0.005), mat('#1a0e04',0.9));
        brow.position.set(x, browY, fd); 
        brow.rotation.z = x>0 ? -0.08 : 0.08;
    });

    // ── Nose (Soft continuous contour blending into face) ──
    // Single smooth tapered ellipsoid pushed deeper to avoid sharp floating seams
    const nose = add(new THREE.SphereGeometry(0.042, 16, 16), mat(sk,0.72));
    nose.position.set(0, noseY+0.02, fd+0.02); 
    nose.scale.set(0.8, 1.4, 0.6); // smooth, narrow, softly raised

    // ── Mouth (Soft flush embedded lips) ──
    // Upper lip flat soft shape
    const lipTop = add(new THREE.SphereGeometry(0.035, 16, 12), mat('#a86050',0.7));
    lipTop.position.set(0, mouthY+0.008, fd - 0.002);
    lipTop.scale.set(1.1, 0.35, 0.1); // extremely flat against skin
    // Lower lip
    const lipBot = add(new THREE.SphereGeometry(0.035, 16, 12), mat('#c07060',0.7));
    lipBot.position.set(0, mouthY-0.006, fd - 0.002); 
    lipBot.scale.set(1.2, 0.45, 0.1);

    // ── Hair ──
    if (avatarState.accessory !== 'silver_helmet') {
        buildHair(hc, fw, fh, fd);
    }

    // ── Neck ──
    const neck = add(new THREE.CylinderGeometry(0.12,0.15,0.26,18), mat(sk,0.7));
    neck.position.set(0, 1.72, 0);

    currentGroup = null; // Switch back to body

    // ── Body / Clothing ──
    buildBody(sk);

    // ── Accessory ──
    buildAccessory(fw, fh, fd);

    avatarGroup.position.y = -1.15;
}

function add(geo, material) {
    const m = new THREE.Mesh(geo, material);
    m.castShadow = true; m.receiveShadow = true;
    if (currentGroup) currentGroup.add(m);
    else avatarGroup.add(m);
    return m;
}

function darken(hex) {
    return '#' + hex.replace('#','').match(/.{2}/g)
        .map(v=>Math.max(0,parseInt(v,16)-30).toString(16).padStart(2,'0')).join('');
}

function buildHair(hc, fw, fh, fd) {
    if (avatarState.hair === 'bald') return;
    const hmat = mat(hc, 0.88);
    const hzScale = fd / 0.5;
    const shiftBack = -0.02; // closer natural scalp fit

    // Main protective top cap going completely around horizontally, stopping neatly above eyebrows vertically
    const capGeo = new THREE.SphereGeometry(0.515, 32, 20, 0, Math.PI*2, 0, Math.PI*0.45);
    const cap = add(capGeo, hmat);
    cap.position.set(0, 2.1, shiftBack);
    cap.scale.set(fw/0.5+0.02, fh/0.5+0.02, hzScale+0.01);

    // Back scalp filler: fully enclosed complete sphere shifted backward and unflattened
    // Guaranteed to avoid phi-cut vertical plane seams on profile views and zero rear hole clipping
    const backFill = add(new THREE.SphereGeometry(0.51, 32, 20), hmat);
    backFill.position.set(0, 2.06, -0.06); // shifted backwards
    backFill.scale.set(fw/0.5+0.015, fh/0.5+0.015, hzScale+0.03);

    // Natural curved soft swept bangs hugging the upper forehead smoothly
    // thetaStart=PI*0.12, thetaLength=PI*0.22 ends at PI*0.34 (well above the eyes)
    const bangGeo = new THREE.SphereGeometry(0.52, 24, 12, Math.PI*0.3, Math.PI*0.4, Math.PI*0.12, Math.PI*0.22);
    const bangs = add(bangGeo, hmat);
    bangs.position.set(0, 2.1, shiftBack); // centered perfectly on head origin
    bangs.scale.set(fw/0.5+0.02, fh/0.5+0.02, hzScale+0.015);
    bangs.rotation.z = 0.04; // slight elegant asymmetrical tilt

    // Soft side frame locks hugging the upper temples
    [-1,1].forEach(s => {
        const side = add(new THREE.SphereGeometry(0.06, 16, 8), hmat);
        side.position.set(s*(fw+0.02), 2.12, 0.02);
        side.scale.set(0.2, 1.2, 0.4);
        side.rotation.z = s * 0.12;
    });

    if (avatarState.hair === 'long') {
        // Smooth sleek back mass
        const back = add(new THREE.CylinderGeometry(0.28, 0.32, 1.1, 24, 1, false, Math.PI*0.7, Math.PI*0.6), hmat);
        back.position.set(0, 1.55, -fd+0.03);
        back.scale.set(1, 1, 0.4);
        // Rounded soft base
        const backBot = add(new THREE.SphereGeometry(0.32, 24, 12, 0, Math.PI*2, Math.PI*0.5, Math.PI*0.5), hmat);
        backBot.position.set(0, 1.0, -fd+0.03); 
        backBot.scale.set(1, 0.4, 0.35);
    }

    if (avatarState.hair === 'bun') {
        // Elegant Gathered Bun
        const gather = add(new THREE.CylinderGeometry(0.08, 0.14, 0.38, 24), hmat);
        gather.position.set(0, 2.54, -0.05);
        // Smooth tie ring
        const tie = add(new THREE.TorusGeometry(0.09, 0.022, 16, 32), mat('#222222', 0.95));
        tie.position.set(0, 2.66, -0.05); tie.rotation.x = Math.PI/2;
        // Clean high bun ball
        const bunCore = add(new THREE.SphereGeometry(0.18, 24, 24), hmat);
        bunCore.position.set(0, 2.82, -0.05);
        bunCore.scale.set(1.0, 0.95, 1.0);
    }
}

function buildBody(sk) {
    const cloth = avatarState.cloth;
    const stripeW = '#e8e4d8';
    const stripeD = '#2d4a6e';
    const skinMat = mat(sk, 0.7);

    // Reset idle rig refs on each rebuild
    idleRig = { torso: null, shoulders: [], armGroups: [], pecs: [], abs: [] };
    currentBodySwing = 0;

    const torsoSkinMat = cloth==='loincloth' ? skinMat : mat(stripeW, 0.82);

    // Torso (Elliptical Cylinder for organic shape)
    const torso = add(new THREE.CylinderGeometry(0.40, 0.38, 0.90, 32), torsoSkinMat);
    torso.position.set(0, 1.18, 0);
    torso.scale.set(1.0, 1.0, 0.55);
    idleRig.torso = torso;

    // Premium Sculpted Muscular overlay seamlessly integrated with delicate decal-depth relief
    // Strictly visible only when bare-chested (wearing traditional loincloth)
    if (cloth === 'loincloth') {
        // Pectorals (Chest muscles - spaced cleanly apart to form a natural central sternum groove without overlapping seams)
        [-0.155, 0.155].forEach(x => {
            const pec = add(new THREE.SphereGeometry(0.13, 24, 16), skinMat);
            pec.position.set(x, 1.43, 0.218);
            pec.scale.set(1.1, 0.7, 0.025);
            pec.castShadow = false; pec.receiveShadow = false;
            idleRig.pecs.push(pec);
        });

        // Abdominals (Continuous soft core definition)
        const absY = [1.24, 1.13, 1.02];
        absY.forEach(y => {
            [-0.058, 0.058].forEach(x => {
                const ab = add(new THREE.SphereGeometry(0.065, 16, 12), skinMat);
                ab.position.set(x, y, 0.219);
                ab.scale.set(1.3, 0.88, 0.025);
                ab.rotation.z = x > 0 ? 0.03 : -0.03;
                ab.castShadow = false; ab.receiveShadow = false;
                idleRig.abs.push(ab);
            });
        });
    }

    // Striped vest
    if (cloth !== 'loincloth') {
        const stripes = [1.50, 1.38, 1.26, 1.14, 1.02, 0.90, 0.78];
        stripes.forEach((y, i) => {
            const col = i % 2 === 0 ? stripeD : stripeW;
            const s = add(new THREE.CylinderGeometry(0.405, 0.405, 0.10, 32), mat(col, 0.83));
            s.position.set(0, y, 0);
            s.scale.set(1.0, 1.0, 0.55);
        });
        // Vest edge trim
        [-0.15, 0.15].forEach(x => {
            const trim = add(new THREE.CylinderGeometry(0.015, 0.015, 0.90, 8), mat(stripeD, 0.85));
            trim.position.set(x, 1.18, 0.22);
        });
    }

    // Shoulders (decorative sphere, still visible)
    [-1,1].forEach(s => {
        const shldr = add(new THREE.SphereGeometry(0.12, 16, 12), skinMat);
        shldr.position.set(s*0.42, 1.55, 0);
        idleRig.shoulders.push(shldr);
    });

    // ARM HIERARCHY: shoulder-root Group -> upperArm -> elbowGroup -> forearm+bracelet+hand
    // Rotation at armGroup level cascades naturally to every child, zero gaps possible
    [-1,1].forEach((s, idx) => {
        // Shoulder-root Group anchored at shoulder-ball centre
        const armGroup = new THREE.Group();
        armGroup.position.set(s * 0.42, 1.55, 0);
        avatarGroup.add(armGroup);
        idleRig.armGroups.push({ group: armGroup, side: s });

        // Upper arm: positioned relative to shoulder centre (offset downward by half-length)
        const upperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.08, 0.65, 24), skinMat);
        upperArm.position.set(s * 0.04, -0.325, 0);
        upperArm.castShadow = true; upperArm.receiveShadow = true;
        armGroup.add(upperArm);

        // Elbow Group anchored at the bottom end of upper arm
        const elbowGroup = new THREE.Group();
        elbowGroup.position.set(s * 0.04, -0.65, 0);
        armGroup.add(elbowGroup);

        // Elbow ball
        const elbow = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 12), skinMat);
        elbow.castShadow = true; elbow.receiveShadow = true;
        elbowGroup.add(elbow);

        // Forearm: hangs from elbow, slight natural outward angle stored via elbowGroup.rotation.z
        elbowGroup.rotation.z = s * 0.08; // natural resting carry angle
        const forearm = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.065, 0.52, 24), skinMat);
        forearm.position.set(0, -0.26, 0);
        forearm.castShadow = true; forearm.receiveShadow = true;
        elbowGroup.add(forearm);

        // Silver bracelet at wrist (end of forearm)
        const bracelet = new THREE.Mesh(new THREE.TorusGeometry(0.072, 0.015, 12, 24), mat('#c8ccd0', 0.15, 0.9));
        bracelet.position.set(0, -0.52, 0);
        bracelet.rotation.x = Math.PI / 2;
        bracelet.castShadow = true;
        elbowGroup.add(bracelet);

        // Hand flush against wrist
        const hand = new THREE.Mesh(new THREE.SphereGeometry(0.085, 16, 12), skinMat);
        hand.position.set(0, -0.62, 0);
        hand.scale.set(1, 1.2, 0.6);
        hand.castShadow = true;
        elbowGroup.add(hand);
    });

    // Waist
    const waist = add(new THREE.CylinderGeometry(0.38, 0.38, 0.16, 32), mat('#c8b870', 0.88));
    waist.position.set(0, 0.70, 0);
    waist.scale.set(1.0, 1.0, 0.55);

    // Hips
    const hips = add(new THREE.CylinderGeometry(0.38, 0.36, 0.26, 32), skinMat);
    hips.position.set(0, 0.60, 0);
    hips.scale.set(1.0, 1.0, 0.55);

    // Loincloth (Blue and white horizontal stripes)
    const loincMat = mat('#ffffff', 0.85); // Pure white
    const loinStripe = mat('#1a2b4c', 0.88); // Dark navy stripes
    
    // Front flap with 8 alternating white/blue horizontal segments
    for (let i = 0; i < 8; i++) {
        const isBlue = (i % 2 !== 0); // Alternate colors
        const bandMat = isBlue ? loinStripe : loincMat;
        const radiusTop = 0.12 - i * 0.002;
        const radiusBot = 0.12 - (i + 1) * 0.002;
        const band = add(new THREE.CylinderGeometry(radiusTop, radiusBot, 0.065, 16, 1, false, 0, Math.PI), bandMat);
        band.position.set(0, 0.6675 - i * 0.065, 0.20);
        band.scale.set(1, 1, 0.2);
    }

    // Back flap
    const bflap = add(new THREE.CylinderGeometry(0.11, 0.09, 0.40, 16, 1, false, Math.PI, Math.PI));
    bflap.position.set(0, 0.46, -0.20);
    bflap.scale.set(1, 1, 0.2);

    // Legs
    [-1,1].forEach(s => {
        const thigh = add(new THREE.CylinderGeometry(0.125, 0.10, 0.70, 24), skinMat);
        thigh.position.set(s*0.18, 0.22, 0);
        
        // Knee
        const knee = add(new THREE.SphereGeometry(0.10, 16, 12), skinMat);
        knee.position.set(s*0.18, -0.12, 0);

        const calf = add(new THREE.CylinderGeometry(0.095, 0.075, 0.65, 24), skinMat);
        calf.position.set(s*0.18, -0.42, 0);
        
        // Ankle silver ring
        const anklet = add(new THREE.TorusGeometry(0.082, 0.014, 12, 24), mat('#c8ccd0', 0.15, 0.9));
        anklet.position.set(s*0.18, -0.70, 0); anklet.rotation.x = Math.PI/2;
        
        // Bare foot (organic oval shape)
        const foot = add(new THREE.SphereGeometry(0.08, 24, 16), skinMat);
        foot.position.set(s*0.18, -0.77, 0.06);
        foot.scale.set(1, 0.6, 1.6);
    });
}

function buildAccessory(fw, fh, fd) {
    const acc = avatarState.accessory;
    if (acc==='none') return;

    if (acc==='rattan_armor') {
        // 藤甲 (Rattan Armor) - open front vest
        const rattanMat = mat('#8B6530', 0.90);
        const bindMat = mat('#5a3a0a', 0.95);
        
        // Back and sides wrap (open front)
        const wrapGeo = new THREE.CylinderGeometry(0.44, 0.42, 0.85, 32, 1, false, Math.PI * 0.2, Math.PI * 1.6);
        const wrap = add(wrapGeo, rattanMat);
        wrap.position.set(0, 1.175, 0);
        wrap.scale.set(1.0, 1.0, 0.6); // elliptical

        // Horizontal thick bands
        for (let i=0; i<8; i++) {
            const band = add(new THREE.TorusGeometry(0.435, 0.018, 8, 32, Math.PI * 1.6), mat('#6B4A1A', 0.95));
            band.position.set(0, 0.78 + i*0.11, 0);
            band.rotation.x = Math.PI/2;
            band.rotation.z = Math.PI * 0.7; // Align gap with front
            band.scale.set(1.0, 1.0, 0.6);
        }

        // Vertical edges at the opening
        [-0.22, 0.22].forEach(x => {
            const edge = add(new THREE.CylinderGeometry(0.02, 0.02, 0.85, 8), bindMat);
            edge.position.set(x, 1.175, 0.25);
            edge.rotation.z = x > 0 ? -0.05 : 0.05; // slight angle
        });

        // Vertical support bindings (back)
        [-0.2, 0, 0.2].forEach(x => {
            const backBind = add(new THREE.CylinderGeometry(0.015, 0.015, 0.85, 8), bindMat);
            backBind.position.set(x, 1.175, -0.25);
        });

        // Shoulder guards (angled outward)
        [-1,1].forEach(s => {
            const sg = add(new THREE.CylinderGeometry(0.14, 0.16, 0.22, 16), rattanMat);
            sg.position.set(s*0.46, 1.58, 0);
            sg.rotation.z = s * 0.3; // Angle outward
            // Bands
            for (let i=0; i<3; i++) {
                const rl = add(new THREE.TorusGeometry(0.15, 0.014, 8, 16), mat('#6B4A1A',0.95));
                rl.position.set(s*0.46, 1.49 + i*0.09, 0);
                rl.rotation.x = Math.PI/2;
                rl.rotation.y = s * -0.3;
            }
        });
    }

    if (acc==='silver_helmet') {
        currentGroup = headGroup; // Attach helmet to the scaled head group
        // 博物館級精緻達悟族銀盔 (Premium museum-grade Tao Silver Helmet)
        // Consists of consecutive solid, thick overlapping rings forged together to completely cover the head
        const silverMat = mat('#888890', 0.50, 0.40); // Bright traditional polished silver
        
        // Custom curved radius profile corresponding exactly to the bulge of the human head
        // Guarantees the helmet shell is strictly wider than the head/ears at every single vertical coordinate
        const radii = [
            0.04, 0.12, 0.24, 0.38, 0.50, 0.59, 
            0.64, 0.66, 0.67, 0.68, 0.69, 0.71, 0.73
        ];

        // Continuously stack 12 overlapping conical plate bands from crown down to collarbones
        for (let i = 0; i < 12; i++) {
            const rTop = radii[i];
            const rBot = radii[i+1] + 0.015; // Beautiful traditional lower rim flare overlap
            const yCenter = 2.9 - i * 0.12 - 0.06;
            const ring = add(new THREE.CylinderGeometry(rTop, rBot, 0.13, 40), silverMat);
            ring.position.set(0, yCenter, 0);
        }

        // Traditional horizontal viewing eye-slit embedded cleanly into the front plate at eye level (y=2.06)
        const eyeSlit = add(new THREE.BoxGeometry(0.32, 0.055, 0.08), mat('#050508', 1.0));
        eyeSlit.position.set(0, 2.06, 0.64);
        
        currentGroup = null; // Switch back to body
    }

    if (acc==='chest_ornament') {
        // 半月形胸飾 + 公豬獠牙 + 貝珠項鏈
        const woodMat  = mat('#5C2E0A', 0.88);
        const boneMat  = mat('#ece8d0', 0.65);
        const ropeMat  = mat('#7a5520', 0.92);
        const shellMat = mat('#d4c8a0', 0.60, 0.05);
        const beadRed  = mat('#8B2020', 0.70); // dark red/maroon beads

        // Neck rope
        const cord = add(new THREE.TorusGeometry(0.20, 0.013, 8, 32), ropeMat);
        cord.position.set(0, 1.72, 0); cord.rotation.x = Math.PI/2;

        // Main semi-moon wooden arc
        const arcGeo = new THREE.TorusGeometry(0.25, 0.044, 12, 36, Math.PI);
        const arc = add(arcGeo, woodMat);
        arc.position.set(0, 1.50, 0.22); arc.rotation.z = Math.PI;

        // 5 hanging pendants
        for (let i=0; i<5; i++) {
            const t = i/4;
            const angle = Math.PI*0.08 + t*Math.PI*0.84;
            const ax = -Math.cos(angle)*0.25, ay = 1.50 - Math.sin(angle)*0.25;
            const strand = add(new THREE.CylinderGeometry(0.005,0.005,0.10,4), ropeMat);
            strand.position.set(ax, ay-0.06, 0.22);
            if (i===2) {
                // Boar tusk (centre, curved)
                const tusk = add(new THREE.CylinderGeometry(0.018,0.006,0.18,8), boneMat);
                tusk.position.set(ax, ay-0.20, 0.22); tusk.rotation.z = 0.22;
                const tc = add(new THREE.SphereGeometry(0.017,8,6), boneMat);
                tc.position.set(ax+0.04, ay-0.30, 0.22);
            } else {
                const shell = add(new THREE.SphereGeometry(0.030, 10, 8), shellMat);
                shell.position.set(ax, ay-0.17, 0.22); shell.scale.set(1,1.35,0.65);
            }
        }
        // Bead strand rows
        for (let row=0; row<3; row++) {
            const bm = row===0 ? beadRed : (row===1 ? shellMat : beadRed);
            for (let i=-4; i<=4; i++) {
                const bead = add(new THREE.SphereGeometry(0.014, 7, 5), bm);
                bead.position.set(i*0.045, 1.66-row*0.06, 0.21);
            }
        }
    }
}

function animate() {
    avatarAnimId = requestAnimationFrame(animate);
    if (!isDragging) rotY += 0.004;
    avatarGroup.rotation.y = rotY;
    avatarGroup.rotation.x = rotX;

    const t = Date.now() * 0.001;

    // Layer 1: Full-body breathing float (~0.5Hz natural rate)
    const breathBase = Math.sin(t * 0.5 * Math.PI) * 0.025;
    avatarGroup.position.y = breathBase - 1.15;

    // Layer 2: Chest expansion + pec/ab muscle swell
    const chestSwell = Math.sin(t * 0.5 * Math.PI) * 0.012;
    if (idleRig.torso) {
        idleRig.torso.scale.set(1.0 + chestSwell * 0.3, 1.0, 0.55 + chestSwell * 0.6);
    }
    idleRig.pecs.forEach(pec => {
        pec.scale.set(1.1 + chestSwell * 4, 0.7 + chestSwell * 2, 0.025 + chestSwell * 0.5);
    });
    idleRig.abs.forEach((ab, i) => {
        const phase = Math.sin(t * 0.5 * Math.PI - i * 0.15) * 0.006;
        ab.scale.set(1.3 + phase * 3, 0.88 + phase * 1.5, 0.025 + phase * 0.3);
    });

    // Layer 3: Bilateral pendulum arm swing via Group hierarchy
    // Only the shoulder-root group rotates; elbow/forearm/hand follow for free (no gaps!)
    const swingL = Math.sin(t * 0.65) * 0.055;
    const swingR = Math.sin(t * 0.65 + Math.PI) * 0.055;
    currentBodySwing = swingL - swingR; // net lateral sway signal for head coupling

    idleRig.armGroups.forEach(({ group, side }) => {
        const swing = side < 0 ? swingL : swingR;
        // Rotate whole arm group at shoulder pivot -- all children cascade automatically
        group.rotation.z = side * 0.11 + swing * 0.85;
        // Shoulder height follows swing slightly
        group.position.y = 1.55 + swing * 0.025;
    });

    // Layer 4: Head mouse look-at + body-coupled sway (Head-Body Coupling)
    // Head tracks cursor AND leans slightly in the direction the body sways
    if (headGroup) {
        headGroup.rotation.y += (targetHeadRotY - headGroup.rotation.y) * 0.08;
        headGroup.rotation.x += (targetHeadRotX - headGroup.rotation.x) * 0.08;
        // Body coupling: head tilts ~15% of body swing with gentle lag (0.04 lerp)
        headGroup.rotation.z += (currentBodySwing * 0.15 - headGroup.rotation.z) * 0.04;
    }

    // Layer 5: Epic Ocean Particle Aura - per-particle spiral rise + fade
    if (avatarParticles) {
        const { meta, positions, geo } = avatarParticles;
        for (let i = 0; i < meta.length; i++) {
            const p = meta[i];

            // Spiral upward
            p.y += p.speed;
            p.angle += p.drift;

            // Recycle when it floats too high
            if (p.y > 2.4) {
                p.y = -2.0 + Math.random() * 0.5;
                p.angle = Math.random() * Math.PI * 2;
                p.radius = 0.45 + Math.random() * 0.80;
            }

            // Gentle in-out shimmer via lifespan cycling
            p.lifespan += 0.008 * p.fadeDir;
            if (p.lifespan >= 1.0) { p.lifespan = 1.0; p.fadeDir = -1; }
            if (p.lifespan <= 0.0) { p.lifespan = 0.0; p.fadeDir =  1; }

            // Write back position
            positions[i*3+0] = Math.cos(p.angle) * p.radius;
            positions[i*3+1] = p.y;
            positions[i*3+2] = Math.sin(p.angle) * p.radius;
        }
        geo.attributes.position.needsUpdate = true;
        // Pulse overall opacity between 0.4 and 0.85 for dreamy shimmer
        avatarParticles.points.material.opacity = 0.4 + Math.sin(t * 1.2) * 0.22 + 0.22;
    }

    if (avatarComposer) {
        avatarComposer.render();
    } else {
        avatarRenderer.render(avatarScene, avatarCamera);
    }
}

function setupControls(canvas) {
    canvas.addEventListener('mousedown', e=>{isDragging=true; prevMouse={x:e.clientX,y:e.clientY}; canvas.style.cursor='grabbing';});
    window.addEventListener('mouseup', ()=>{isDragging=false; canvas.style.cursor='grab';});
    window.addEventListener('mousemove', e=>{
        // 即時計算滑鼠游標相對於整個瀏覽器視窗中心的標準化坐標 (-1 ~ 1)
        const normX = (e.clientX / window.innerWidth) * 2 - 1;
        const normY = (e.clientY / window.innerHeight) * 2 - 1;
        // 映射至符合人體工學的頭部自然轉動極限角度
        targetHeadRotY = normX * 0.65;
        targetHeadRotX = normY * 0.35;

        if(!isDragging) return;
        rotY+=(e.clientX-prevMouse.x)*0.012; rotX+=(e.clientY-prevMouse.y)*0.008;
        rotX=Math.max(-0.6,Math.min(0.5,rotX)); prevMouse={x:e.clientX,y:e.clientY};
    });
    let lt=null;
    canvas.addEventListener('touchstart', e=>{isDragging=true; lt=e.touches[0];});
    canvas.addEventListener('touchend', ()=>{isDragging=false; lt=null;});
    canvas.addEventListener('touchmove', e=>{
        if(!lt) return;
        const t=e.touches[0];
        const normX = (t.clientX / window.innerWidth) * 2 - 1;
        const normY = (t.clientY / window.innerHeight) * 2 - 1;
        targetHeadRotY = normX * 0.65;
        targetHeadRotX = normY * 0.35;

        rotY+=(t.clientX-lt.clientX)*0.015; rotX+=(t.clientY-lt.clientY)*0.01;
        rotX=Math.max(-0.6,Math.min(0.5,rotX)); lt=t;
    });
    canvas.addEventListener('wheel', e=>{
        avatarCamera.position.z=Math.max(3,Math.min(8,avatarCamera.position.z+e.deltaY*0.01));
    });
}

function destroyAvatar3D() {
    if(avatarAnimId) cancelAnimationFrame(avatarAnimId);
    if(avatarRenderer) avatarRenderer.dispose();
    if(avatarParticles) { avatarParticles.geo.dispose(); avatarParticles.points.material.dispose(); }
    avatarScene=null; avatarCamera=null; avatarRenderer=null; avatarComposer=null; avatarParticles=null;
}

function updateAvatarPart(ctrl, val) {
    avatarState[ctrl]=val; buildCharacter();
}

function captureAvatarSnapshot() {
    if(!avatarRenderer) return null;
    if(avatarComposer) avatarComposer.render();
    else avatarRenderer.render(avatarScene, avatarCamera);
    return avatarRenderer.domElement.toDataURL('image/png');
}
