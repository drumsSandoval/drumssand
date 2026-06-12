// garden.js — "the paradise you never leave"
// Hallucinatory generative garden: melt feedback, living blooms, floating spores.

let garden; // offscreen buffer — growth accumulates here
let plants = [];
let bloomedFlowers = []; // live flowers rendered on main canvas each frame
let spores = [];
let shockwaves = []; // expanding rings from click/tap
let petalFall = []; // dead petals falling (naturaleza muerta)
let t = 0;
let isMobile = false;

// Life/death cycle: the paradise blooms, withers to bone, and is reborn
const LIFE_CYCLE = 1500; // frames per full cycle
let cycleFrame = 0;
let prevCyclePos = 0;
let gardenDying = false;
let deathT = 0; // 0..1 progress through the dying phase
let rebirthFlash = 0;

const MAX_PLANTS_DESKTOP = 14;
const MAX_PLANTS_MOBILE  = 7;
const MAX_STEMS_DESKTOP  = 70;
const MAX_STEMS_MOBILE   = 30;
const MAX_BLOOMS_DESKTOP = 40;
const MAX_BLOOMS_MOBILE  = 18;
const SPORE_COUNT_DESKTOP = 30;
const SPORE_COUNT_MOBILE  = 14;

let maxPlants, maxStems, maxBlooms;

function setup() {
    createCanvas(windowWidth, windowHeight);
    pixelDensity(1);
    isMobile = min(width, height) < 600;
    maxPlants = isMobile ? MAX_PLANTS_MOBILE  : MAX_PLANTS_DESKTOP;
    maxStems  = isMobile ? MAX_STEMS_MOBILE   : MAX_STEMS_DESKTOP;
    maxBlooms = isMobile ? MAX_BLOOMS_MOBILE  : MAX_BLOOMS_DESKTOP;
    colorMode(HSB, 360, 100, 100, 100);
    initBuffer();
    initSpores();
    seedInitialPlants(isMobile ? 4 : 8);
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
    isMobile = min(width, height) < 600;
    maxPlants = isMobile ? MAX_PLANTS_MOBILE  : MAX_PLANTS_DESKTOP;
    maxStems  = isMobile ? MAX_STEMS_MOBILE   : MAX_STEMS_DESKTOP;
    maxBlooms = isMobile ? MAX_BLOOMS_MOBILE  : MAX_BLOOMS_DESKTOP;
    initBuffer();
    initSpores();
    plants = [];
    bloomedFlowers = [];
    shockwaves = [];
    seedInitialPlants(isMobile ? 3 : 5);
}

function initBuffer() {
    garden = createGraphics(width, height);
    garden.pixelDensity(1);
    garden.colorMode(HSB, 360, 100, 100, 100);
    garden.background(0, 0, 2);
}

function seedInitialPlants(count) {
    for (let i = 0; i < count; i++) {
        let sx = random(width * 0.05, width * 0.95);
        let sy = random(height * 0.45, height * 0.95);
        plants.push(new Plant(sx, sy));
    }
}

function initSpores() {
    spores = [];
    let count = isMobile ? SPORE_COUNT_MOBILE : SPORE_COUNT_DESKTOP;
    for (let i = 0; i < count; i++) {
        spores.push(makeSpore(random(width), random(height)));
    }
}

function makeSpore(x, y) {
    return {
        x, y,
        vx: random(-0.5, 0.5),
        vy: random(-1.2, -0.3),
        hue: random(360),
        alpha: random(40, 90),
        size: random(2, 5),
        seed: random(1000)
    };
}

// ---------------------------------------------------------------------------
// DRAW

function draw() {
    // --- LIFE/DEATH CYCLE ---
    cycleFrame++;
    let cyclePos = (cycleFrame % LIFE_CYCLE) / LIFE_CYCLE;
    gardenDying = cyclePos > 0.76;
    deathT = gardenDying ? (cyclePos - 0.76) / 0.24 : 0;

    // Rebirth: the moment the cycle wraps, life floods back
    if (cyclePos < prevCyclePos) {
        rebirthFlash = 25;
        let reborn = isMobile ? 2 : 3;
        for (let i = 0; i < reborn; i++) {
            plants.push(new Plant(random(width * 0.1, width * 0.9), random(height * 0.4, height * 0.95)));
        }
        for (let i = 0; i < 2 && bloomedFlowers.length > 0; i++) {
            let fl = random(bloomedFlowers);
            shockwaves.push({ x: fl.x, y: fl.y, r: 4, life: 30, maxLife: 30, hue: random(360) });
        }
    }
    prevCyclePos = cyclePos;

    // --- MELT FEEDBACK on the offscreen buffer ---
    // Self-zoom: draws itself slightly expanded (old growth drifts outward)
    garden.image(garden, -width * 0.0007, -height * 0.0007, width * 1.0014, height * 1.0014);
    garden.noStroke();
    if (gardenDying) {
        // Death drains the buffer toward bone and dust, faster than life fades
        garden.fill(36, 18, 9, 2.2 + deathT * 1.5);
    } else {
        // Background hue cycles: very dark, slow dissolve
        let bgHue = (t * 4) % 360;
        garden.fill(bgHue, 60, 6, 1.0);
    }
    garden.rect(0, 0, width, height);

    // --- PLANT GROWTH into buffer ---
    // Auto-seed faster than original
    if (!gardenDying && frameCount % 40 === 0 && plants.length < maxPlants) {
        let sx = random(width * 0.05, width * 0.95);
        let sy = random(height * 0.35, height * 0.98);
        plants.push(new Plant(sx, sy));
    }

    let activeStemCount = 0;
    for (let p of plants) activeStemCount += p.activeStems();

    for (let i = plants.length - 1; i >= 0; i--) {
        let p = plants[i];
        p.update(garden, activeStemCount < maxStems);
        if (p.dead) plants.splice(i, 1);
    }

    // Over budget: let melt handle clearing — no forced death, just stop seeding
    // (removed fade-ellipse mechanism as instructed)

    // --- MAIN CANVAS: draw the buffer ---
    image(garden, 0, 0);

    // --- LIVING BLOOMS on main canvas ---
    blendMode(ADD);
    noStroke();
    colorMode(HSB, 360, 100, 100, 100);
    for (let fl of bloomedFlowers) {
        if (gardenDying) {
            // Withering: erratic flicker, drained color, drooping petals
            fl.shimmerAngle += 0.004;
            let spasm = noise(fl.seed, t * 9);
            let haloSize = (10 + 20 * (0.5 + 0.5 * sin(fl.phase))) * (1 - deathT * 0.45) * (0.7 + spasm * 0.6);
            let boneSat = 80 * (1 - deathT * 0.85);
            let boneBri = 100 - deathT * 50;
            let flickerA = (0.3 + spasm * 0.7);

            fill(fl.hue, boneSat, boneBri, 10 * flickerA);
            ellipse(fl.x, fl.y, haloSize * 2.2, haloSize * 2.2);

            let droop = deathT * haloSize * 0.8;
            for (let i = 0; i < fl.petalCount; i++) {
                let ang = fl.shimmerAngle + (i / fl.petalCount) * TWO_PI;
                let pr = haloSize * 0.7;
                fill((fl.hue + i * 8) % 360, boneSat, boneBri, 16 * flickerA);
                push();
                translate(fl.x + cos(ang) * pr, fl.y + sin(ang) * pr + droop);
                rotate(ang * (1 - deathT * 0.7) + HALF_PI);
                ellipse(0, 0, haloSize * 0.3, haloSize * (0.9 - deathT * 0.4));
                pop();
            }

            // Petals detach and fall
            if (random(1) < 0.04 * deathT && petalFall.length < 120) {
                petalFall.push({
                    x: fl.x + random(-8, 8), y: fl.y,
                    vx: random(-0.4, 0.4), vy: random(0.4, 1.2),
                    hue: fl.hue, life: 100, maxLife: 100,
                    seed: random(1000)
                });
            }
        } else {
            fl.phase += 0.04 + fl.phaseSpeed;
            fl.hue = (fl.hue + 0.3) % 360;
            fl.shimmerAngle += 0.025;

            // Occasional spasm — alive does not mean calm
            let spasm = noise(fl.seed, t * 2) > 0.78;
            let jx = spasm ? random(-3, 3) : 0;
            let jy = spasm ? random(-3, 3) : 0;

            // Pulsing halo: size oscillates 10..30
            let haloSize = (10 + 20 * (0.5 + 0.5 * sin(fl.phase))) * (spasm ? 1.3 : 1);
            fill(fl.hue, 80, 100, spasm ? 20 : 12);
            ellipse(fl.x + jx, fl.y + jy, haloSize * 2.2, haloSize * 2.2);
            fill(fl.hue, 60, 100, 6);
            ellipse(fl.x + jx, fl.y + jy, haloSize * 3.2, haloSize * 3.2);

            // Rotating shimmer petals
            for (let i = 0; i < fl.petalCount; i++) {
                let ang = fl.shimmerAngle + (i / fl.petalCount) * TWO_PI;
                let pr = haloSize * 0.7;
                let ph = (fl.hue + i * (360 / fl.petalCount)) % 360;
                fill(ph, 90, 100, 25);
                push();
                translate(fl.x + jx + cos(ang) * pr, fl.y + jy + sin(ang) * pr);
                rotate(ang + HALF_PI);
                ellipse(0, 0, haloSize * 0.35, haloSize * 0.9);
                pop();
            }
        }
    }
    blendMode(BLEND);

    // --- FALLING DEAD PETALS ---
    noStroke();
    for (let i = petalFall.length - 1; i >= 0; i--) {
        let p = petalFall[i];
        p.x += p.vx + (noise(p.seed, t * 2) - 0.5) * 1.2;
        p.y += p.vy;
        p.vy += 0.02;
        p.life--;
        let fade = p.life / p.maxLife;
        fill(p.hue, 25 * fade, 60, 50 * fade);
        push();
        translate(p.x, p.y);
        rotate(noise(p.seed, t * 3) * TWO_PI);
        ellipse(0, 0, 6 * fade + 2, 3 * fade + 1);
        pop();
        if (p.life <= 0 || p.y > height + 10) petalFall.splice(i, 1);
    }

    // --- FLOATING SPORES ---
    blendMode(ADD);
    colorMode(HSB, 360, 100, 100, 100);
    noStroke();
    for (let i = spores.length - 1; i >= 0; i--) {
        let s = spores[i];
        s.x += s.vx + (noise(s.seed, t * 0.4) - 0.5) * 0.6;
        // While the garden dies, spores stop floating and sink like ash
        s.y += gardenDying ? abs(s.vy) * (0.5 + deathT) : s.vy;
        // Wrap at edges
        if (s.y < -10) { spores[i] = makeSpore(random(width), height + 5); continue; }
        if (s.y > height + 10) { spores[i] = makeSpore(random(width), -5); continue; }
        if (s.x < -10) s.x = width + 5;
        if (s.x > width + 10) s.x = -5;
        let dim = gardenDying ? (1 - deathT * 0.6) : 1;
        fill(s.hue, gardenDying ? 20 : 80, 100, s.alpha * 0.8 * dim);
        ellipse(s.x, s.y, s.size, s.size);
        // Soft glow
        fill(s.hue, gardenDying ? 15 : 60, 100, s.alpha * 0.3 * dim);
        ellipse(s.x, s.y, s.size * 2.5, s.size * 2.5);
    }
    blendMode(BLEND);

    // --- SHOCKWAVE RINGS ---
    colorMode(HSB, 360, 100, 100, 100);
    noFill();
    for (let i = shockwaves.length - 1; i >= 0; i--) {
        let sw = shockwaves[i];
        sw.r += 5;
        sw.life--;
        let alpha = map(sw.life, 0, sw.maxLife, 0, 60);
        stroke((sw.hue + sw.life * 2) % 360, 80, 100, alpha);
        strokeWeight(map(sw.life, 0, sw.maxLife, 0.5, 2.5));
        ellipse(sw.x, sw.y, sw.r * 2, sw.r * 2);
        if (sw.life <= 0) shockwaves.splice(i, 1);
    }
    noStroke();

    // --- REBIRTH FLASH: color floods back into the world ---
    if (rebirthFlash > 0) {
        blendMode(ADD);
        noStroke();
        fill((t * 60) % 360, 80, 60, rebirthFlash * 0.5);
        rect(0, 0, width, height);
        blendMode(BLEND);
        rebirthFlash--;
    }

    colorMode(HSB, 360, 100, 100, 100);
    t += 0.005;
}

// ---------------------------------------------------------------------------
// BLOOM BURST on click/tap

function handleClick(cx, cy) {
    // 8-12 short burst stems radially
    let burstCount = floor(random(8, 13));
    for (let i = 0; i < burstCount; i++) {
        let ang = (i / burstCount) * TWO_PI + random(-0.3, 0.3);
        let s = new Stem(cx, cy, ang, 0, random(360));
        s.maxLength = random(20, 60); // short burst
        s.isBurst = true;
        // Add a temporary plant wrapper just for this burst stem
        let bp = new Plant(cx, cy);
        bp.stems = [s];
        bp.hueSeed = s.hueSeed;
        plants.push(bp);
    }

    // 2-3 shockwave rings
    let ringCount = floor(random(2, 4));
    for (let i = 0; i < ringCount; i++) {
        let maxLife = floor(random(20, 35));
        shockwaves.push({
            x: cx, y: cy,
            r: i * 8,
            life: maxLife, maxLife,
            hue: random(360)
        });
    }
}

function mousePressed() {
    handleClick(mouseX, mouseY);
    return false;
}

function touchStarted() {
    if (touches.length > 0) {
        handleClick(touches[0].x, touches[0].y);
    }
    return false;
}

function touchMoved() {
    return false;
}

// ---------------------------------------------------------------------------
// PLANT

class Plant {
    constructor(x, y) {
        this.seedX = x;
        this.seedY = y;
        this.stems = [];
        this.dead = false;
        this.hueSeed = random(360); // full hue freedom

        this.stems.push(new Stem(x, y, -HALF_PI + random(-0.3, 0.3), 0, this.hueSeed));
    }

    activeStems() {
        let n = 0;
        for (let s of this.stems) if (s.alive) n++;
        return n;
    }

    update(g, canGrow) {
        let allDead = true;
        for (let i = this.stems.length - 1; i >= 0; i--) {
            let s = this.stems[i];
            s.grow(g, this.hueSeed);
            if (s.alive) allDead = false;

            if (s.alive && s.depth < 2 && canGrow && random(1) < 0.014 && s.length > 20) {
                let branchAngle = s.heading + random(-0.55, 0.55);
                let branch = new Stem(s.x, s.y, branchAngle, s.depth + 1, this.hueSeed);
                this.stems.push(branch);
            }
        }
        if (allDead) this.dead = true;
    }
}

// ---------------------------------------------------------------------------
// STEM

class Stem {
    constructor(x, y, heading, depth, hueSeed) {
        this.x = x;
        this.y = y;
        this.heading = heading;
        this.depth = depth;
        this.hueSeed = hueSeed;
        this.alive = true;
        this.length = 0;
        this.maxLength = random(100, 250) / (depth + 1);
        this.noiseSeed = random(1000);
        this.stepSize = random(1.5, 3.2);
        this.segCount = 0;
        this.isBurst = false;
    }

    grow(g, hueSeed) {
        if (!this.alive) return;

        // Dying gardens grow twisted
        let driftAmp = gardenDying ? 1.4 : 0.5;
        let drift = (noise(this.noiseSeed + t * 0.5 + this.segCount * 0.05) - 0.5) * driftAmp;
        this.heading += drift;

        // Burst stems go radially; normal stems go upward
        if (!this.isBurst) {
            this.heading = constrain(this.heading, -PI * 0.88, -PI * 0.12);
        }

        let nx = this.x + cos(this.heading) * this.stepSize;
        let ny = this.y + sin(this.heading) * this.stepSize;

        // Full hue freedom — electric magenta, cyan, acid green
        let stemH = (this.hueSeed + this.depth * 40 + this.length * 0.3) % 360;
        let stemS = map(this.depth, 0, 2, 85, 65);
        let stemB = map(this.length, 0, this.maxLength, 90, 55);
        if (gardenDying) {
            // Blackened bone growth
            stemH = 36;
            stemS = 14;
            stemB = 28 + noise(this.noiseSeed, t * 4) * 18;
        }

        // Wide glow stroke + thin bright core
        let glowW = map(this.depth, 0, 2, 4.0, 2.0);
        let coreW = map(this.depth, 0, 2, 1.6, 0.8);

        g.stroke(stemH, stemS, stemB, 38);
        g.strokeWeight(glowW * 2.5);
        g.line(this.x, this.y, nx, ny);

        g.stroke(stemH, stemS, 100, 95);
        g.strokeWeight(coreW * 1.3);
        g.line(this.x, this.y, nx, ny);

        if (this.segCount % 10 === 0 && this.depth < 2) {
            drawLeafHallucination(g, nx, ny, this.heading, this.hueSeed);
        }

        this.x = nx;
        this.y = ny;
        this.length += this.stepSize;
        this.segCount++;

        if (this.length >= this.maxLength) {
            this.alive = false;
            bloomFlower(g, this.x, this.y, this.hueSeed, this.depth);
            // Register living bloom for main canvas
            registerBloom(this.x, this.y, this.hueSeed);
        }
    }
}

// ---------------------------------------------------------------------------
// LEAF

function drawLeafHallucination(g, x, y, heading, hueSeed) {
    let leafH = (hueSeed + 120 + random(60)) % 360;
    g.push();
    g.translate(x, y);
    g.rotate(heading + HALF_PI * (random(1) > 0.5 ? 0.65 : -0.65));
    g.noStroke();
    g.fill(leafH, 75, 80, 60);
    g.ellipse(0, 0, random(5, 10), random(2.5, 5));
    g.pop();
}

// ---------------------------------------------------------------------------
// BLOOM — drawn into buffer once

function bloomFlower(g, x, y, hueSeed, depth) {
    let petalCount = floor(random(5, 9));
    let petalSize  = map(depth, 0, 2, random(12, 20), random(5, 10));
    g.push();
    g.translate(x, y);
    g.noStroke();
    for (let i = 0; i < petalCount; i++) {
        let ang = (TWO_PI / petalCount) * i;
        let pH  = (hueSeed + i * (360 / petalCount)) % 360;
        g.fill(pH, 85, 95, 85);
        g.push();
        g.rotate(ang);
        g.ellipse(petalSize * 0.6, 0, petalSize, petalSize * 0.5);
        g.pop();
    }
    g.fill((hueSeed + 180) % 360, 70, 100, 90);
    g.ellipse(0, 0, petalSize * 0.5, petalSize * 0.5);
    g.pop();
}

// ---------------------------------------------------------------------------
// REGISTER LIVING BLOOM for main-canvas animation

function registerBloom(x, y, hueSeed) {
    bloomedFlowers.push({
        x, y,
        hue: hueSeed,
        phase: random(TWO_PI),
        phaseSpeed: random(0.01, 0.035),
        shimmerAngle: random(TWO_PI),
        petalCount: floor(random(4, 7)),
        seed: random(1000)
    });
    // FIFO cap
    if (bloomedFlowers.length > maxBlooms) {
        bloomedFlowers.shift();
    }
}
