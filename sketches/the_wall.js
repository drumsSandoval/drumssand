// the_wall.js — "the wall is a state of mind"
// State machine: WALL -> SHATTER -> TRIP -> REFORM -> WALL

let isMobile = false;
let t = 0;

// --- offscreen wall buffer ---
let wallBuf;

// --- state machine ---
// states: 'wall', 'shatter', 'trip', 'reform'
let state = 'wall';

// --- shatter ---
let shards = [];
let shakeFrames = 0;
let shakeDecay = 0;
let flashFrames = 0;
let tripWorld = 0; // 0=pain, 1=timefall, 2=acid
let tripTimer = 0;
const TRIP_DURATION = 600; // ~10s at 60fps

// --- reform ---
let reformTimer = 0;
const REFORM_DURATION = 120; // ~2s

// --- heartbeat (pain world + wall overlay) ---
let hbPhase = 0;
const HB_BPM = 55;

// --- acid world feedback ---
let acidHue = 0;

// --- timefall ---
let filmScratch = [];

// --- pain smoke blobs ---
let smokeBlobs = [];

// ---
function setup() {
    createCanvas(windowWidth, windowHeight);
    pixelDensity(1);
    isMobile = min(width, height) < 600;
    colorMode(RGB);
    buildWallBuffer();
    initSmoke();
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
    isMobile = min(width, height) < 600;
    buildWallBuffer();
    if (state === 'wall') {
        shards = [];
    }
}

// ---------------------------------------------------------------------------
// WALL BUFFER — painted once, reused every frame

function buildWallBuffer() {
    wallBuf = createGraphics(width, height);
    wallBuf.pixelDensity(1);
    wallBuf.colorMode(RGB);
    paintWallTexture();
}

function paintWallTexture() {
    wallBuf.background(28, 24, 20);

    // Grimy horizontal smear stripes — bone / ash / dried-blood desaturated tones
    let stripeCount = isMobile ? 18 : 30;
    for (let i = 0; i < stripeCount; i++) {
        let y = random(height);
        let h = random(8, 40);
        let r = random(60, 130);
        let g2 = random(50, 110);
        let b2 = random(40, 90);
        wallBuf.noStroke();
        wallBuf.fill(r, g2, b2, random(30, 80));
        // Irregular smear: jitter edges
        for (let sx = 0; sx < width; sx += random(20, 60)) {
            let sw = random(30, 100);
            let jy = y + random(-6, 6);
            let jh = h + random(-4, 4);
            wallBuf.rect(sx, jy, sw, jh);
        }
    }

    // Tally scratch marks — clusters of 4 vertical + diagonal 5th
    let clusterCount = isMobile ? 20 : 50;
    for (let i = 0; i < clusterCount; i++) {
        let cx = random(width * 0.05, width * 0.95);
        let cy = random(height * 0.05, height * 0.95);
        let groups = floor(random(1, 5));
        for (let g3 = 0; g3 < groups; g3++) {
            let ox = cx + g3 * 18;
            // 4 verticals
            for (let k = 0; k < 4; k++) {
                let x1 = ox + k * 4 + random(-1, 1);
                let y1 = cy + random(-2, 2);
                let y2 = cy + random(12, 20);
                let alpha = random(60, 140);
                wallBuf.stroke(180, 170, 150, alpha);
                wallBuf.strokeWeight(random(0.5, 1.2));
                wallBuf.line(x1, y1, x1 + random(-1, 1), y2);
            }
            // diagonal 5th
            wallBuf.stroke(200, 185, 160, random(70, 130));
            wallBuf.strokeWeight(random(0.7, 1.4));
            wallBuf.line(ox - 2, cy + 14, ox + 18, cy + random(0, 6));
        }
    }

    // Paint drips — thin vertical lines that taper
    let dripCount = isMobile ? 8 : 20;
    for (let i = 0; i < dripCount; i++) {
        let dx = random(width);
        let dy = random(height * 0.0, height * 0.6);
        let dlen = random(20, 120);
        let r2 = random(60, 110);
        let g4 = random(40, 80);
        let b4 = random(35, 70);
        wallBuf.stroke(r2, g4, b4, random(50, 110));
        wallBuf.strokeWeight(random(0.8, 2.0));
        // taper: multiple short segments with decreasing alpha
        for (let seg = 0; seg < dlen; seg += 4) {
            let alpha2 = map(seg, 0, dlen, 100, 8);
            wallBuf.stroke(r2, g4, b4, alpha2);
            wallBuf.line(dx + random(-0.5, 0.5), dy + seg, dx + random(-0.5, 0.5), dy + seg + 4);
        }
    }

    // Speckle noise
    let speckleCount = isMobile ? 800 : 2500;
    wallBuf.strokeWeight(1);
    for (let i = 0; i < speckleCount; i++) {
        let sx = random(width);
        let sy = random(height);
        let bri = random(40, 180);
        let al = random(20, 90);
        wallBuf.stroke(bri * 0.9, bri * 0.85, bri * 0.75, al);
        wallBuf.point(sx, sy);
    }

    wallBuf.noStroke();
}

// ---------------------------------------------------------------------------
// SMOKE BLOBS (pain world)

function initSmoke() {
    smokeBlobs = [];
    let count = isMobile ? 4 : 8;
    for (let i = 0; i < count; i++) {
        smokeBlobs.push({
            x: random(width),
            y: random(height),
            vx: random(-0.4, 0.4),
            vy: random(-0.5, -0.1),
            size: random(80, 200),
            seed: random(1000)
        });
    }
}

// ---------------------------------------------------------------------------
// DRAW

function draw() {
    // Screen shake
    let shakeX = 0, shakeY = 0;
    if (shakeFrames > 0) {
        let intensity = shakeDecay * map(shakeFrames, 0, 40, 0, 1);
        shakeX = random(-intensity, intensity);
        shakeY = random(-intensity, intensity);
        shakeFrames--;
    }

    push();
    translate(shakeX, shakeY);

    if (state === 'wall') {
        drawWallState();
    } else if (state === 'shatter') {
        drawShatterState();
    } else if (state === 'trip') {
        drawTripState();
    } else if (state === 'reform') {
        drawReformState();
    }

    pop();

    // White flash overlay (outside shake so it covers full screen)
    if (flashFrames > 0) {
        let alpha = map(flashFrames, 0, 6, 0, 255);
        noStroke();
        fill(255, alpha);
        rect(0, 0, width, height);
        flashFrames--;
    }

    t += 0.008;
    hbPhase += (HB_BPM / 60) / frameRate() * TWO_PI;
    tripTimer++;
}

// ---------------------------------------------------------------------------
// WALL STATE

function drawWallState() {
    // Heartbeat pulse: scale around center
    let pulse = 1.0 + 0.004 * sin(hbPhase);
    push();
    translate(width / 2, height / 2);
    scale(pulse);
    translate(-width / 2, -height / 2);
    image(wallBuf, 0, 0);
    pop();

    // Random horizontal slice displacement (1-3 per frame, low probability)
    if (random(1) < 0.35) {
        let sliceCount = floor(random(1, 4));
        for (let i = 0; i < sliceCount; i++) {
            let sy = random(height);
            let sh = random(2, 14);
            let offset = random(-10, 10);
            // Copy and paste a strip from wallBuf shifted
            copy(wallBuf, 0, sy, width, sh, offset, sy, width, sh);
        }
    }

    // Mouse-proximity glitch intensification
    let md = dist(mouseX, mouseY, width / 2, height / 2);
    let mouseInfluence = map(md, 0, max(width, height) * 0.5, 1.0, 0.0, true);
    if (mouseInfluence > 0.05 && random(1) < mouseInfluence * 0.4) {
        let sy = mouseY + random(-50, 50);
        let sh = random(2, 8);
        let offset2 = random(-10, 10) * mouseInfluence * 2;
        copy(wallBuf, 0, sy, width, sh, offset2, sy, width, sh);
    }

    // Chromatic ghost: redraw buffer twice with R/C tint, low alpha, occasional
    if (random(1) < 0.12) {
        tint(255, 80, 80, 18);
        image(wallBuf, 2, 0);
        tint(80, 220, 220, 18);
        image(wallBuf, -2, 0);
        noTint();
    }

    // Dark flickering vignette
    let vAlpha = random(60, 100);
    noStroke();
    drawVignette(vAlpha);
}

// ---------------------------------------------------------------------------
// SHATTER STATE

function drawShatterState() {
    // Render the trip world behind shards
    drawTripWorld();

    // Draw shards
    for (let s of shards) {
        s.update();
        s.draw();
    }

    // Check if all shards off-screen → transition to trip
    let anyVisible = false;
    for (let s of shards) {
        if (s.y < height + 200 && s.y > -200 && s.x > -200 && s.x < width + 200) {
            anyVisible = true;
            break;
        }
    }
    if (!anyVisible && shards.length > 0) {
        state = 'trip';
        tripTimer = 0;
    }
}

// ---------------------------------------------------------------------------
// TRIP STATE

function drawTripState() {
    drawTripWorld();

    // After ~10s jump to REFORM
    if (tripTimer > TRIP_DURATION) {
        state = 'reform';
        reformTimer = 0;
    }
}

function drawTripWorld() {
    if (tripWorld === 0) {
        drawTripPain();
    } else if (tripWorld === 1) {
        drawTripTimefall();
    } else {
        drawTripAcid();
    }
}

// --- World 0: pain ---
function drawTripPain() {
    // Lub-dub double pulse: sharp systole, softer diastole, then silence
    let beat = pow(max(0, sin(hbPhase)), 6) + 0.55 * pow(max(0, sin(hbPhase - 0.7)), 6);
    if (beat > 0.8 && shakeFrames < 3) {
        shakeFrames = 6;
        shakeDecay = 4;
    }

    // Background breathes red with the beat
    background(10 + beat * 28, 2, 4);

    // The whole world swells on each beat
    push();
    translate(width / 2, height / 2);
    scale(1 + beat * 0.05);
    translate(-width / 2, -height / 2);

    // Concentric flesh rings: translucent fill + glowing edge, heavy deformation
    let ringCount = isMobile ? 7 : 11;
    colorMode(RGB);
    for (let i = ringCount - 1; i >= 0; i--) {
        let baseR = map(i, 0, ringCount, 30, max(width, height) * 0.72);
        let r = baseR * (1 + beat * 0.06);
        let alpha = map(i, 0, ringCount, 220, 50);
        let redC = floor(map(i, 0, ringCount, 235, 70));
        fill(redC * 0.35, 4, 8, 26);
        stroke(redC, 14, 20, alpha);
        strokeWeight(map(i, 0, ringCount, 4, 1.2));
        beginShape();
        let steps = 60;
        for (let j = 0; j <= steps; j++) {
            let ang = (j / steps) * TWO_PI;
            let nVal = noise(cos(ang) * 0.9 + 2 + i * 1.7, sin(ang) * 0.9 + 2 + i * 1.7, t * 0.7);
            let nr = r + map(nVal, 0, 1, -r * 0.26, r * 0.26);
            vertex(width / 2 + cos(ang) * nr, height / 2 + sin(ang) * nr);
        }
        endShape(CLOSE);
    }

    // Radial veins: jagged flickering lines crawling outward
    let veinCount = isMobile ? 7 : 12;
    noFill();
    for (let v = 0; v < veinCount; v++) {
        let ang0 = (v / veinCount) * TWO_PI + noise(v * 7.3, t * 0.2) * 0.8;
        let flicker = noise(v * 3.1, t * 1.5);
        if (flicker < 0.35) continue;
        stroke(190 + beat * 60, 18, 22, 50 + flicker * 90);
        strokeWeight(0.8 + flicker * 1.4);
        beginShape();
        let segs = 18;
        for (let s2 = 0; s2 <= segs; s2++) {
            let rr = map(s2, 0, segs, 10, max(width, height) * 0.6);
            let wob = (noise(v * 11.7, s2 * 0.35, t * 0.6) - 0.5) * rr * 0.35;
            let ang = ang0 + wob / rr;
            vertex(width / 2 + cos(ang) * rr, height / 2 + sin(ang) * rr);
        }
        endShape();
    }

    // Drifting smoke blobs occluding parts
    noStroke();
    for (let b of smokeBlobs) {
        b.x += b.vx + (noise(b.seed, t * 0.3) - 0.5) * 0.8;
        b.y += b.vy;
        if (b.y < -b.size) b.y = height + b.size;
        if (b.x < -b.size) b.x = width + b.size;
        if (b.x > width + b.size) b.x = -b.size;
        fill(0, 0, 0, 70);
        ellipse(b.x, b.y, b.size, b.size * 0.7);
    }

    pop();

    // Pulsing blood vignette at the edges
    noStroke();
    let vg = drawingContext.createRadialGradient(
        width / 2, height / 2, min(width, height) * 0.25,
        width / 2, height / 2, max(width, height) * 0.72
    );
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, `rgba(${floor(70 + beat * 110)},0,8,0.5)`);
    drawingContext.fillStyle = vg;
    drawingContext.fillRect(0, 0, width, height);

    colorMode(RGB);
}

// --- World 1: timefall ---
function drawTripTimefall() {
    // Heavy film grain background
    let bri = random(8, 18);
    background(bri, bri * 0.95, bri * 0.85);

    // Brightness flicker
    if (random(1) < 0.06) {
        let fl = random(200, 255);
        background(fl, fl * 0.97, fl * 0.93);
    }

    // Occasional full invert frame
    if (random(1) < 0.004) {
        drawingContext.filter = 'invert(100%)';
    } else {
        drawingContext.filter = 'none';
    }

    // Hand-cranked projector wobble: the whole tunnel jitters frame to frame
    let crankX = random(-2.5, 2.5);
    let crankY = random(-2.5, 2.5);
    // Occasional frame jump (film slipping in the gate)
    if (random(1) < 0.02) crankY += random(-30, 30);

    // Receding concentric rectangles — sepia tunnel, falling inward
    let levels = isMobile ? 10 : 18;
    let fall = (t * 3) % 1; // continuous zoom: rings fall toward the viewer
    noFill();
    for (let i = levels; i >= 1; i--) {
        let prog = ((i + fall) / levels);
        if (prog > 1) continue;
        let rw = width * prog;
        let rh = height * prog;
        let rot = t * 0.03 * prog + sin(t * 0.5) * 0.02;
        let sepiaR = floor(map(prog, 0, 1, 235, 70));
        let sepiaG = floor(map(prog, 0, 1, 185, 48));
        let sepiaB = floor(map(prog, 0, 1, 115, 24));
        stroke(sepiaR, sepiaG, sepiaB, map(prog, 0, 1, 230, 50));
        strokeWeight(map(prog, 0, 1, 3.5, 0.6));
        push();
        translate(width / 2 + crankX, height / 2 + crankY);
        rotate(rot);
        rect(-rw / 2, -rh / 2, rw, rh);
        pop();
    }

    // Film grain — coarse and visible
    let grainCount = isMobile ? 500 : 1400;
    strokeWeight(1.6);
    for (let i = 0; i < grainCount; i++) {
        let gx = random(width);
        let gy = random(height);
        let gb = random(100, 235);
        stroke(gb, gb * 0.9, gb * 0.72, random(40, 110));
        point(gx, gy);
    }

    // Dark corner vignette (old lens)
    noStroke();
    let vg2 = drawingContext.createRadialGradient(
        width / 2, height / 2, min(width, height) * 0.3,
        width / 2, height / 2, max(width, height) * 0.7
    );
    vg2.addColorStop(0, 'rgba(0,0,0,0)');
    vg2.addColorStop(1, 'rgba(8,5,2,0.75)');
    drawingContext.fillStyle = vg2;
    drawingContext.fillRect(0, 0, width, height);

    // Film scratch lines that persist a few frames
    if (random(1) < 0.08) {
        filmScratch.push({
            x: random(width),
            alpha: random(100, 200),
            life: floor(random(3, 8))
        });
    }
    for (let i = filmScratch.length - 1; i >= 0; i--) {
        let fs = filmScratch[i];
        stroke(220, 210, 180, fs.alpha);
        strokeWeight(random(0.5, 1.5));
        line(fs.x, 0, fs.x + random(-3, 3), height);
        fs.life--;
        if (fs.life <= 0) filmScratch.splice(i, 1);
    }

    drawingContext.filter = 'none';
    colorMode(RGB);
}

// --- World 2: acid ---
function drawTripAcid() {
    // Melt feedback: don't clear, overlay translucent black
    noStroke();
    fill(0, 0, 0, 7);
    rect(0, 0, width, height);

    acidHue = (acidHue + 0.4) % 360;

    // 6-segment rotational symmetry of noise-driven trails
    let trails = isMobile ? 3 : 6;
    let segments = 6;
    let cx = width / 2;
    let cy = height / 2;
    noFill();
    colorMode(HSB, 360, 100, 100, 100);

    // Global slow rotation + radial breathing keep the kaleidoscope alive
    let spin = t * 0.45;
    let breathe = 1 + 0.18 * sin(t * 1.3);

    for (let seg = 0; seg < segments; seg++) {
        let baseAngle = (seg / segments) * TWO_PI + spin;
        let trailHue = (acidHue + seg * 60) % 360;
        // Two passes per arm: wide glow + bright core
        for (let pass = 0; pass < 2; pass++) {
            stroke(trailHue, 90, 95, pass === 0 ? 25 : 75);
            strokeWeight(pass === 0 ? 5 : 1.8);
            beginShape();
            let steps = 40;
            for (let i = 0; i < steps; i++) {
                let r = map(i, 0, steps, 10, min(width, height) * 0.48) * breathe;
                let nAngle = baseAngle + (noise(i * 0.1, seg * 1.3, t * 0.6) - 0.5) * 1.2;
                vertex(cx + cos(nAngle) * r, cy + sin(nAngle) * r);
            }
            endShape();
        }
        // Mirrored counter-rotating ghost arm (interference)
        let ghostHue = (trailHue + 180) % 360;
        stroke(ghostHue, 80, 90, 35);
        strokeWeight(1.2);
        beginShape();
        let steps2 = 30;
        for (let i = 0; i < steps2; i++) {
            let r = map(i, 0, steps2, 10, min(width, height) * 0.42) * (2 - breathe);
            let nAngle = -baseAngle - spin * 2 + (noise(i * 0.12, seg * 2.1 + 50, t * 0.5) - 0.5) * 1.4;
            vertex(cx + cos(nAngle) * r, cy + sin(nAngle) * r);
        }
        endShape();
    }

    colorMode(RGB);
}

// ---------------------------------------------------------------------------
// REFORM STATE

function drawReformState() {
    // Trip world fades behind
    push();
    let tripAlpha = map(reformTimer, 0, REFORM_DURATION, 255, 0);
    drawTripWorld();
    // Darken trip world as we reform
    noStroke();
    fill(0, 0, 0, map(reformTimer, 0, REFORM_DURATION, 0, 180));
    rect(0, 0, width, height);
    pop();

    // Vertical strips slamming in from top/bottom
    let stripCount = isMobile ? 20 : 40;
    let stripW = width / stripCount;
    for (let i = 0; i < stripCount; i++) {
        let prog = constrain(reformTimer / REFORM_DURATION, 0, 1);
        let eased = prog * prog * (3 - 2 * prog); // smoothstep
        // Alternate strips from top and bottom
        let fromTop = i % 2 === 0;
        let srcY = fromTop ? 0 : 0;
        let destY = fromTop
            ? lerp(-height, 0, eased)
            : lerp(height, 0, eased);

        // Draw strip from wall buffer
        if (wallBuf) {
            copy(wallBuf, floor(i * stripW), 0, ceil(stripW), height,
                floor(i * stripW), destY, ceil(stripW), height);
        }

        // Glitch: static noise on strip edges
        if (random(1) < 0.3) {
            let noiseCount = floor(random(5, 20));
            stroke(random(200, 255), random(0, 100));
            strokeWeight(1);
            for (let n = 0; n < noiseCount; n++) {
                let nx = i * stripW + random(stripW);
                let ny = destY + random(height);
                point(nx, ny);
            }
        }

        // Slice displacement glitch on the strip edge
        if (random(1) < 0.15) {
            let glitchY = destY + random(height);
            let glitchH = random(2, 8);
            let glitchOffset = random(-8, 8);
            copy(wallBuf, floor(i * stripW), glitchY - destY, ceil(stripW), glitchH,
                floor(i * stripW) + glitchOffset, glitchY, ceil(stripW), glitchH);
        }
    }

    reformTimer++;
    if (reformTimer >= REFORM_DURATION) {
        state = 'wall';
        tripTimer = 0;
    }
}

// ---------------------------------------------------------------------------
// VIGNETTE

function drawVignette(alpha) {
    noStroke();
    let vg = drawingContext.createRadialGradient(
        width / 2, height / 2, height * 0.2,
        width / 2, height / 2, max(width, height) * 0.75
    );
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, `rgba(0,0,0,${(alpha / 255).toFixed(2)})`);
    drawingContext.fillStyle = vg;
    drawingContext.fillRect(0, 0, width, height);
}

// ---------------------------------------------------------------------------
// SHARD CLASS

class Shard {
    constructor(pts, cx, cy) {
        // pts: array of {x,y} — triangle vertices
        this.pts = pts;
        // Center of shard
        let mx = (pts[0].x + pts[1].x + pts[2].x) / 3;
        let my = (pts[0].y + pts[1].y + pts[2].y) / 3;
        // Radial direction from impact
        let dx = mx - cx;
        let dy = my - cy;
        let d = sqrt(dx * dx + dy * dy) || 1;
        let impulse = map(d, 0, max(width, height) * 0.6, 18, 2);
        // Tangential swirl
        let tangle = atan2(dy, dx) + random(-0.5, 0.5) + HALF_PI * random([-1, 1])[0];
        this.vx = (dx / d) * impulse * random(0.7, 1.3) + cos(tangle) * random(1, 4);
        this.vy = (dy / d) * impulse * random(0.7, 1.3) + sin(tangle) * random(1, 4);
        this.angularVel = random(-0.08, 0.08);
        this.angle = 0;
        this.x = 0;
        this.y = 0;
        // Sample wall color from buffer center
        let wx = constrain(floor(mx), 0, width - 1);
        let wy = constrain(floor(my), 0, height - 1);
        let c = wallBuf ? wallBuf.get(wx, wy) : [80, 70, 60];
        this.col = c;
    }

    update() {
        this.vy += 0.3; // light gravity
        this.vx *= 0.995;
        this.x += this.vx;
        this.y += this.vy;
        this.angle += this.angularVel;
        this.angularVel *= 0.99;
    }

    draw() {
        let mx = (this.pts[0].x + this.pts[1].x + this.pts[2].x) / 3 + this.x;
        let my = (this.pts[0].y + this.pts[1].y + this.pts[2].y) / 3 + this.y;

        // Draw 3 ghost offsets: red, cyan, white (chromatic shatter)
        let offsets = [
            { dx: this.vx * 0.3, dy: 0,             r: 255, g: 50,  b: 50,  a: 60  },
            { dx: -this.vx * 0.3, dy: 0,            r: 50,  g: 220, b: 220, a: 60  },
            { dx: 0,              dy: this.vy * 0.2, r: 255, g: 255, b: 255, a: 40  },
        ];

        for (let off of offsets) {
            push();
            translate(mx + off.dx, my + off.dy);
            rotate(this.angle);
            noStroke();
            fill(off.r, off.g, off.b, off.a);
            beginShape();
            for (let pt of this.pts) {
                vertex(pt.x - mx + this.x, pt.y - my + this.y);
            }
            endShape(CLOSE);
            pop();
        }

        // Main shard
        push();
        translate(mx, my);
        rotate(this.angle);
        let cr = this.col[0] || 80;
        let cg = this.col[1] || 70;
        let cb = this.col[2] || 60;
        fill(cr, cg, cb, 220);
        stroke(cr + 30, cg + 25, cb + 20, 80);
        strokeWeight(0.8);
        beginShape();
        for (let pt of this.pts) {
            vertex(pt.x - mx + this.x, pt.y - my + this.y);
        }
        endShape(CLOSE);
        pop();
    }
}

// ---------------------------------------------------------------------------
// TESSELLATION — radial crack shards from impact point

function tessellate(cx, cy) {
    shards = [];
    let shardCount = isMobile ? 24 : 50;
    // Build jittered radial ring vertices + screen corners/edges
    let verts = [];

    // Screen corners
    verts.push({ x: 0, y: 0 });
    verts.push({ x: width, y: 0 });
    verts.push({ x: width, y: height });
    verts.push({ x: 0, y: height });

    // Screen edge midpoints
    verts.push({ x: width / 2, y: 0 });
    verts.push({ x: width, y: height / 2 });
    verts.push({ x: width / 2, y: height });
    verts.push({ x: 0, y: height / 2 });

    // Impact point
    verts.push({ x: cx, y: cy });

    // Radial rings of jittered vertices around impact
    let rings = isMobile ? 2 : 3;
    let ringDivisions = floor(shardCount / rings);
    for (let r = 0; r < rings; r++) {
        let radius = map(r, 0, rings, min(width, height) * 0.12, max(width, height) * 0.55);
        for (let j = 0; j < ringDivisions; j++) {
            let ang = (j / ringDivisions) * TWO_PI + random(-0.3, 0.3);
            let jitterR = radius * random(0.7, 1.3);
            let vx2 = constrain(cx + cos(ang) * jitterR, 0, width);
            let vy2 = constrain(cy + sin(ang) * jitterR, 0, height);
            verts.push({ x: vx2, y: vy2 });
        }
    }

    // Build triangles by picking nearest triples (approximate — fan from impact)
    // Simple approach: sort by angle from impact, fan triangulate
    let nonImpact = verts.filter(v => !(v.x === cx && v.y === cy));
    nonImpact.sort((a, b) => atan2(a.y - cy, a.x - cx) - atan2(b.y - cy, b.x - cx));

    for (let i = 0; i < nonImpact.length; i++) {
        let a = nonImpact[i];
        let b = nonImpact[(i + 1) % nonImpact.length];
        shards.push(new Shard([
            { x: cx, y: cy },
            { x: a.x, y: a.y },
            { x: b.x, y: b.y }
        ], cx, cy));
    }
}

// ---------------------------------------------------------------------------
// INTERACTION

function mousePressed() {
    handleHit(mouseX, mouseY);
    return false;
}

function touchStarted() {
    if (touches.length > 0) {
        handleHit(touches[0].x, touches[0].y);
    }
    return false;
}

function touchMoved() {
    return false;
}

function handleHit(cx, cy) {
    if (state === 'wall') {
        tessellate(cx, cy);
        state = 'shatter';
        flashFrames = 6;
        shakeFrames = 40;
        shakeDecay = 12;
        tripTimer = 0;
        // Trip world cycles on each new hit
        tripWorld = (tripWorld + 1) % 3;
    } else if (state === 'trip') {
        // Hit during TRIP: jump to next world, reset timer
        tripWorld = (tripWorld + 1) % 3;
        tripTimer = 0;
        acidHue = random(360);
    }
}
