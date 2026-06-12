// cloth.js — "starman" (Bowie x spaceman)
// Verlet cloth in zero-g space; Bowie-themed patterns; parallax starfield + nebulae.

let points = [];
let constraints = [];
let isMobile = false;
let t = 0;

let COLS, ROWS;
let CLOTH_W, CLOTH_H;
let ORIGIN_X, ORIGIN_Y;
let SPACING_X, SPACING_Y;
const ITERATIONS = 3;
const GRAVITY = 0.09;
const DRAG_RADIUS = 40;

let dragPoint = null;
let patternIndex = 0;
const PATTERN_COUNT = 4;

// Starfield layers
let starsNear = [];
let starsFar = [];
let nebulae = [];
let shootingStars = [];
let shootingStarTimer = 0;

// Stardust from cloth edges
let dustParticles = [];

function setup() {
    createCanvas(windowWidth, windowHeight);
    pixelDensity(1);
    isMobile = min(width, height) < 600;
    colorMode(RGB);
    buildCloth();
    buildStarfield();
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
    isMobile = min(width, height) < 600;
    buildCloth();
    buildStarfield();
}

// ---------------------------------------------------------------------------
// CLOTH

function buildCloth() {
    points = [];
    constraints = [];
    dragPoint = null;

    COLS = isMobile ? 20 : 36;
    ROWS = isMobile ? 14 : 24;

    CLOTH_W = width  * 0.70;
    CLOTH_H = height * 0.72;
    ORIGIN_X = (width  - CLOTH_W) / 2;
    ORIGIN_Y = height  * 0.08;

    SPACING_X = CLOTH_W / (COLS - 1);
    SPACING_Y = CLOTH_H / (ROWS - 1);

    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            let px = ORIGIN_X + c * SPACING_X;
            let py = ORIGIN_Y + r * SPACING_Y;
            // Pin every 2nd point of the top row: holds shape, still billows
            let pinned = (r === 0) && (c % 2 === 0);
            points.push({ x: px, y: py, oldX: px, oldY: py, pinned });
        }
    }

    // Horizontal constraints
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS - 1; c++) {
            let a = r * COLS + c;
            let b = r * COLS + c + 1;
            constraints.push({ a, b, rest: SPACING_X });
        }
    }
    // Vertical constraints
    for (let r = 0; r < ROWS - 1; r++) {
        for (let c = 0; c < COLS; c++) {
            let a = r * COLS + c;
            let b = (r + 1) * COLS + c;
            constraints.push({ a, b, rest: SPACING_Y });
        }
    }
}

// ---------------------------------------------------------------------------
// STARFIELD

function buildStarfield() {
    starsNear = [];
    starsFar  = [];
    nebulae   = [];
    dustParticles = [];

    let nearCount = isMobile ? 30 : 80;
    let farCount  = isMobile ? 30 : 40;

    for (let i = 0; i < nearCount; i++) {
        starsNear.push({
            x: random(width), y: random(height),
            size: random(1.0, 2.5),
            seed: random(1000),
            twinkleSpeed: random(0.8, 2.5),
            drift: random(0.04, 0.12)
        });
    }
    for (let i = 0; i < farCount; i++) {
        starsFar.push({
            x: random(width), y: random(height),
            size: random(0.4, 1.2),
            seed: random(1000),
            twinkleSpeed: random(0.3, 1.0),
            drift: random(0.01, 0.04)
        });
    }

    // 2-3 nebulae
    let nebCount = isMobile ? 2 : 3;
    let nebulaColors = [
        [220, 40, 180],
        [40, 200, 220],
        [180, 60, 240]
    ];
    for (let i = 0; i < nebCount; i++) {
        nebulae.push({
            x: random(width * 0.1, width * 0.9),
            y: random(height * 0.1, height * 0.9),
            w: random(width * 0.35, width * 0.65),
            h: random(height * 0.25, height * 0.5),
            col: nebulaColors[i % nebulaColors.length],
            hueOffset: random(360),
            driftX: random(-0.1, 0.1),
            driftY: random(-0.06, 0.06)
        });
    }

    // Stardust particles
    let dustCount = isMobile ? 15 : 30;
    for (let i = 0; i < dustCount; i++) {
        dustParticles.push(makeDust(random(width), random(height)));
    }
}

function makeDust(x, y) {
    return {
        x, y,
        vx: random(-0.4, 0.4),
        vy: random(-0.8, -0.1),
        alpha: random(60, 160),
        size: random(1.5, 4),
        hue: random(180, 320),
        seed: random(1000)
    };
}

// ---------------------------------------------------------------------------
// DRAW

function draw() {
    drawBackground();

    // Wind: slower, more turbulent, per-point ripple
    let windX = (noise(t * 0.15) - 0.5) * 0.06;
    let windY = (noise(t * 0.12 + 50) - 0.5) * 0.02;
    let gust  = noise(t * 0.05 + 100) * 0.5;
    windX *= (1 + gust);

    // Verlet integration
    const damping = 0.985;
    for (let p of points) {
        if (p.pinned) continue;
        let vx = (p.x - p.oldX) * damping
                 + windX
                 + (noise(p.x * 0.003, p.y * 0.003, t * 0.15) - 0.5) * 0.05;
        let vy = (p.y - p.oldY) * damping
                 + GRAVITY
                 + windY
                 + (noise(p.x * 0.003 + 5, p.y * 0.003 + 5, t * 0.15) - 0.5) * 0.02;
        p.oldX = p.x;
        p.oldY = p.y;
        p.x += vx;
        p.y += vy;
    }

    // Constraint relaxation
    for (let iter = 0; iter < ITERATIONS; iter++) {
        for (let c of constraints) {
            let pa = points[c.a];
            let pb = points[c.b];
            let dx = pb.x - pa.x;
            let dy = pb.y - pa.y;
            let d = sqrt(dx * dx + dy * dy) || 0.001;
            let correction = (d - c.rest) / d * 0.5;
            let cx = dx * correction;
            let cy = dy * correction;
            if (!pa.pinned) { pa.x += cx; pa.y += cy; }
            if (!pb.pinned) { pb.x -= cx; pb.y -= cy; }
        }
    }

    // Move dragged point
    if (dragPoint !== null) {
        let p = points[dragPoint];
        if (!p.pinned) {
            p.x = mouseX; p.y = mouseY;
            p.oldX = mouseX; p.oldY = mouseY;
        }
    }

    // Render cloth quads with area-based fold shading
    noStroke();
    let restArea = SPACING_X * SPACING_Y;
    for (let r = 0; r < ROWS - 1; r++) {
        for (let c = 0; c < COLS - 1; c++) {
            let tl = points[r       * COLS + c    ];
            let tr = points[r       * COLS + c + 1];
            let bl = points[(r + 1) * COLS + c    ];
            let br = points[(r + 1) * COLS + c + 1];

            let d1x = br.x - tl.x, d1y = br.y - tl.y;
            let d2x = bl.x - tr.x, d2y = bl.y - tr.y;
            let area = abs(d1x * d2y - d1y * d2x) * 0.5;
            let shade = constrain(map(area / restArea, 0.55, 1.05, 0.55, 1.0), 0.45, 1.08);

            let col = patternColor(c, r, patternIndex);
            fill(red(col) * shade, green(col) * shade, blue(col) * shade);
            quad(tl.x, tl.y, tr.x, tr.y, br.x, br.y, bl.x, bl.y);
        }
    }

    // Stardust shed from cloth free edges (bottom row + unpin top gaps)
    if (frameCount % 4 === 0) {
        let bottomRow = ROWS - 1;
        for (let c = 0; c < COLS; c++) {
            if (random(1) < 0.06) {
                let p = points[bottomRow * COLS + c];
                dustParticles.push(makeDust(p.x, p.y));
            }
        }
    }
    // Cap dust
    let maxDust = isMobile ? 40 : 80;
    while (dustParticles.length > maxDust) dustParticles.shift();

    // Draw stardust (additive)
    blendMode(ADD);
    noStroke();
    for (let i = dustParticles.length - 1; i >= 0; i--) {
        let d = dustParticles[i];
        d.x += d.vx + (noise(d.seed, t * 0.3) - 0.5) * 0.5;
        d.y += d.vy;
        d.alpha -= 1.2;
        if (d.alpha <= 0 || d.y < -10) {
            dustParticles.splice(i, 1);
            continue;
        }
        let dh = (d.hue + t * 20) % 360;
        colorMode(HSB, 360, 100, 100, 255);
        fill(dh, 80, 100, d.alpha);
        ellipse(d.x, d.y, d.size, d.size);
    }
    blendMode(BLEND);
    colorMode(RGB);

    t += 0.012;
    shootingStarTimer++;
}

// ---------------------------------------------------------------------------
// BACKGROUND: near-black blue/purple space

function drawBackground() {
    background(4, 3, 14);

    // Nebulae (additive)
    blendMode(ADD);
    noStroke();
    for (let n of nebulae) {
        n.x += n.driftX;
        n.y += n.driftY;
        if (n.x < -n.w) n.x = width + n.w;
        if (n.x > width + n.w) n.x = -n.w;
        if (n.y < -n.h) n.y = height + n.h;
        if (n.y > height + n.h) n.y = -n.h;

        let hShift = (n.hueOffset + t * 4) % 360;
        colorMode(HSB, 360, 100, 100, 255);
        let [r2, g2, b2] = n.col;
        colorMode(RGB);
        // Two overlapping blobs per nebula for volume
        fill(r2, g2, b2, 8);
        ellipse(n.x, n.y, n.w, n.h);
        fill(r2 * 0.7, g2 * 0.7, b2 * 0.7, 5);
        ellipse(n.x + n.w * 0.1, n.y - n.h * 0.1, n.w * 0.7, n.h * 0.65);
    }
    blendMode(BLEND);

    // Far stars (slower drift)
    noStroke();
    for (let s of starsFar) {
        s.x -= s.drift;
        if (s.x < 0) s.x = width;
        let twinkle = 0.5 + 0.5 * noise(s.seed, t * s.twinkleSpeed);
        let a = floor(twinkle * 130 + 30);
        fill(200, 210, 230, a);
        ellipse(s.x, s.y, s.size, s.size);
    }

    // Near stars (faster drift, brighter)
    for (let s of starsNear) {
        s.x -= s.drift;
        if (s.x < 0) s.x = width;
        let twinkle = 0.5 + 0.5 * noise(s.seed, t * s.twinkleSpeed);
        let a = floor(twinkle * 200 + 55);
        fill(220, 225, 255, a);
        ellipse(s.x, s.y, s.size, s.size);
    }

    // Shooting star (~1 every 8s = ~480 frames)
    if (shootingStarTimer > 480 + random(-60, 60)) {
        shootingStarTimer = 0;
        shootingStars.push({
            x: random(width * 0.1, width * 0.9),
            y: random(height * 0.05, height * 0.3),
            vx: random(4, 8),
            vy: random(2, 5),
            life: 0,
            maxLife: floor(random(20, 35))
        });
    }

    blendMode(ADD);
    for (let i = shootingStars.length - 1; i >= 0; i--) {
        let ss = shootingStars[i];
        let alpha = map(ss.life, 0, ss.maxLife, 220, 0);
        stroke(240, 240, 255, alpha);
        strokeWeight(1.5);
        line(ss.x, ss.y, ss.x - ss.vx * 6, ss.y - ss.vy * 6);
        ss.x += ss.vx;
        ss.y += ss.vy;
        ss.life++;
        if (ss.life >= ss.maxLife) shootingStars.splice(i, 1);
    }
    blendMode(BLEND);
    noStroke();
}

// ---------------------------------------------------------------------------
// PATTERN COLORS — Bowie references

function patternColor(col, row, pat) {
    let u = col / (COLS - 2);
    let v = row / (ROWS - 2);

    if (pat === 0) {
        // "aladdin" — Aladdin Sane lightning bolt
        // Steep diagonal slash from upper-right to lower-left with a sharp knee
        // Full-width diagonal slash so it reads on narrow cloth too
        let centerU;
        if (v < 0.48) {
            centerU = 0.92 - 0.95 * v;
        } else {
            // Knee: jump back right, then slash down-left again
            centerU = 0.92 - 0.95 * 0.48 + 0.16 - 0.95 * (v - 0.48);
        }
        let distU = abs(u - centerU);
        if (distU < 0.085) {
            return color(222, 32, 38); // bolt red
        } else if (distU < 0.14) {
            return color(40, 70, 190); // cobalt blue edge
        } else {
            // Base with faint pink blush noise
            let n = noise(col * 0.4, row * 0.4, t * 0.01);
            let blush = floor(n * 18);
            return color(240 + blush, 228, 214 - blush);
        }
    }

    if (pat === 1) {
        // "ziggy" — glam fire, vertical hue bands with noise shimmer and sequins
        // Vertical hue 0..45 (red/orange/gold) with per-cell noise
        let bandHue = u * 45 + noise(col * 0.5, row * 0.5, t * 0.3) * 15;
        // Convert HSB-ish to RGB manually (simple mapping for reds/oranges)
        let r2, g2, b2;
        if (bandHue < 15) {
            // Deep red to red
            r2 = 200 + bandHue * 3;
            g2 = bandHue * 4;
            b2 = 10;
        } else if (bandHue < 30) {
            // Red to orange
            r2 = 245;
            g2 = (bandHue - 15) * 10;
            b2 = 8;
        } else {
            // Orange to gold
            r2 = 245;
            g2 = 150 + (bandHue - 30) * 5;
            b2 = 15;
        }
        // ~2% sequin flash
        let seqN = noise(col * 1.7, row * 1.7, t * 3.0);
        if (seqN > 0.98) {
            return color(255, 255, 240);
        }
        return color(r2, g2, b2);
    }

    if (pat === 2) {
        // "majortom" — deep navy, sparse star cells, drifting silver transmission band
        let base2 = color(8, 12, 40);
        // Deterministic cell hash → star
        let hash = (col * 2654435761 + row * 1234567891) % 100;
        if (hash > 93) {
            // Silver/white star cell
            let bri = 180 + (hash % 75);
            return color(bri, bri, bri + 15);
        }
        // Slow drifting horizontal silver band: (v + t*0.02) % 1
        let bandV = ((v + t * 0.02) % 1 + 1) % 1;
        if (abs(bandV - 0.5) < 0.04) {
            let silverFade = map(abs(bandV - 0.5), 0, 0.04, 180, 0);
            return color(silverFade, silverFade, silverFade + 20);
        }
        return base2;
    }

    // pat === 3: "marslife" — pastel gradient pink top to ice blue bottom with cloud noise
    let topR = 235, topG = 140, topB = 180;
    let botR = 120, botG = 170, botB = 230;
    let r3 = floor(lerp(topR, botR, v));
    let g3 = floor(lerp(topG, botG, v));
    let b3 = floor(lerp(topB, botB, v));
    // Soft white cloud noise patches
    let cloudN = noise(col * 0.18, row * 0.18, t * 0.008);
    if (cloudN > 0.65) {
        let cloudAmt = map(cloudN, 0.65, 1.0, 0, 60);
        r3 = min(255, r3 + cloudAmt);
        g3 = min(255, g3 + cloudAmt);
        b3 = min(255, b3 + cloudAmt);
    }
    return color(r3, g3, b3);
}

// ---------------------------------------------------------------------------
// INTERACTION

function mousePressed() {
    let nearest = findNearestPoint(mouseX, mouseY);
    if (nearest !== null) {
        dragPoint = nearest;
    } else {
        patternIndex = (patternIndex + 1) % PATTERN_COUNT;
    }
    return false;
}

function mouseDragged() {
    return false;
}

function mouseReleased() {
    dragPoint = null;
    return false;
}

function touchStarted() {
    if (touches.length > 0) {
        let tx = touches[0].x, ty = touches[0].y;
        let nearest = findNearestPoint(tx, ty);
        if (nearest !== null) {
            dragPoint = nearest;
        } else {
            patternIndex = (patternIndex + 1) % PATTERN_COUNT;
        }
    }
    return false;
}

function touchMoved() {
    if (dragPoint !== null && touches.length > 0) {
        let p = points[dragPoint];
        p.x = touches[0].x; p.y = touches[0].y;
        p.oldX = touches[0].x; p.oldY = touches[0].y;
    }
    return false;
}

function touchEnded() {
    dragPoint = null;
    return false;
}

function findNearestPoint(tx, ty) {
    let nearest = null;
    let nearestDist = DRAG_RADIUS;
    for (let i = 0; i < points.length; i++) {
        let p = points[i];
        if (p.pinned) continue;
        let d = dist(tx, ty, p.x, p.y);
        if (d < nearestDist) {
            nearestDist = d;
            nearest = i;
        }
    }
    return nearest;
}
