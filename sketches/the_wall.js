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
let tripDepth = 1; // descent layer: each hit while tripping goes deeper
const MAX_DEPTH = 4;
let tripTimer = 0;
const TRIP_DURATION = 600; // ~10s at 60fps

// --- reform ---
let reformTimer = 0;
const REFORM_DURATION = 120; // ~2s

// --- heartbeat (pain world + wall overlay) ---
let hbPhase = 0;
const HB_BPM = 55;

// --- smoke blobs (trip occlusion) ---
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

    // Graffiti layer — painted before the speckle pass so dust weathers it
    paintGraffiti();

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
// GRAFFITI — spray tag + marker scribbles, muted streetwear palette

const GRAFFITI_PALETTE = [
    [228, 222, 210],  // bone white
    [196, 110, 100],  // dusty coral
    [96, 138, 128],   // faded teal
    [186, 148, 82],   // worn ochre
];

function paintGraffiti() {
    // --- Main tag: the handle, spray-painted with an italic shear ---
    let tagCol = GRAFFITI_PALETTE[0];
    let tSize = min(width, height) * (isMobile ? 0.13 : 0.12);
    // Keep the whole tag on the wall (estimate width, clamp right edge)
    let tagW = tSize * 5.4;
    let tx = constrain(width * (isMobile ? 0.18 : 0.45), 16, max(16, width - tagW - 24));
    let ty = height * random(0.2, 0.38);

    wallBuf.push();
    wallBuf.translate(tx, ty);
    wallBuf.rotate(random(-0.06, -0.02));
    wallBuf.drawingContext.transform(1, 0, -0.28, 1, 0, 0); // italic lean
    wallBuf.textSize(tSize);
    wallBuf.textStyle(BOLD);
    wallBuf.textAlign(LEFT, BASELINE);
    wallBuf.noStroke();
    // Spray halo: jittered low-alpha passes around the letters
    for (let i = 0; i < 8; i++) {
        wallBuf.fill(tagCol[0], tagCol[1], tagCol[2], 13);
        wallBuf.text('drumssand', random(-4, 4), random(-4, 4));
    }
    // Drop shadow gives it piece depth
    wallBuf.fill(18, 14, 12, 140);
    wallBuf.text('drumssand', 4, 5);
    // Main coat, slightly translucent so the wall grime shows through
    wallBuf.fill(tagCol[0], tagCol[1], tagCol[2], 170);
    wallBuf.text('drumssand', 0, 0);
    wallBuf.pop();

    // Paint drips running from the tag's baseline
    let dripN = isMobile ? 3 : 5;
    for (let i = 0; i < dripN; i++) {
        let dx = tx + random(0, tagW * 0.8);
        let dy = ty + random(-tSize * 0.3, 6);
        let dlen = random(20, 70);
        for (let seg = 0; seg < dlen; seg += 3) {
            let a = map(seg, 0, dlen, 120, 10);
            wallBuf.stroke(tagCol[0], tagCol[1], tagCol[2], a);
            wallBuf.strokeWeight(random(1, 2.2));
            wallBuf.line(dx, dy + seg, dx + random(-0.6, 0.6), dy + seg + 3);
        }
    }

    // --- Marker scribbles: quick gestural throw-ups around the wall ---
    let scribbleN = isMobile ? 3 : 5;
    for (let s = 0; s < scribbleN; s++) {
        let col = GRAFFITI_PALETTE[1 + (s % (GRAFFITI_PALETTE.length - 1))];
        let sx = random(width * 0.05, width * 0.85);
        let sy = random(height * 0.1, height * 0.9);
        let span = random(50, 140);
        let seed = random(1000);
        wallBuf.noFill();
        // Double stroke = chisel marker
        for (let pass = 0; pass < 2; pass++) {
            wallBuf.stroke(col[0], col[1], col[2], pass === 0 ? 110 : 60);
            wallBuf.strokeWeight(pass === 0 ? 3.5 : 2);
            wallBuf.beginShape();
            for (let i = 0; i <= 14; i++) {
                let px = sx + (i / 14) * span + pass * 2;
                let py = sy + (noise(seed + i * 0.35) - 0.5) * span * 0.7 + pass * 2;
                wallBuf.curveVertex(px, py);
            }
            wallBuf.endShape();
        }
    }

    // --- Faint spray clouds: buffed-out old pieces ---
    let cloudN = isMobile ? 2 : 4;
    for (let c = 0; c < cloudN; c++) {
        let col = GRAFFITI_PALETTE[floor(random(GRAFFITI_PALETTE.length))];
        let cx2 = random(width);
        let cy2 = random(height);
        let spread = random(20, 55);
        wallBuf.noStroke();
        let dots = isMobile ? 80 : 160;
        for (let i = 0; i < dots; i++) {
            wallBuf.fill(col[0], col[1], col[2], random(4, 18));
            wallBuf.ellipse(cx2 + randomGaussian(0, spread), cy2 + randomGaussian(0, spread * 0.6), random(1, 3));
        }
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

// One reality, four layers deep. Every hit tears further down into the SAME
// place: layer 1 is a violet dream, layer 4 is the bottom. Aggression scales.
function drawTripWorld() {
    let agg = (tripDepth - 1) / (MAX_DEPTH - 1); // 0..1

    // Trail accumulation: deeper = longer, dirtier trails
    noStroke();
    colorMode(RGB);
    fill(0, 0, 0, 16 - agg * 9);
    rect(-20, -20, width + 40, height + 40);

    // Palette descent: violet dream -> neon -> blood
    let baseHue = lerp(265, 360, agg) % 360;

    // Heartbeat accelerates as you sink
    let bpmPhase = hbPhase * (1 + agg * 1.7);
    let beat = pow(max(0, sin(bpmPhase)), 6) + 0.55 * pow(max(0, sin(bpmPhase - 0.7)), 6);
    if (agg > 0.2 && beat > 0.8 && shakeFrames < 3) {
        shakeFrames = floor(4 + agg * 7);
        shakeDecay = 2 + agg * 7;
    }

    let cx = width / 2;
    let cy = height / 2;

    push();
    translate(cx, cy);
    scale(1 + beat * (0.015 + agg * 0.06));
    translate(-cx, -cy);

    colorMode(HSB, 360, 100, 100, 100);

    // 1) The tunnel — spine of this reality, present at every depth.
    //    Rings expand toward the viewer: you are falling in.
    let rings = isMobile ? 7 : 11;
    let fall = (t * (0.5 + agg * 2.0)) % 1;
    noFill();
    for (let i = 0; i < rings; i++) {
        let prog = ((i / rings) + fall) % 1;
        let r = pow(prog, 1.7) * max(width, height) * 0.75;
        if (r < 4) continue;
        // Analogous hues only — tonal, hazy, restrained
        let ringHue = (baseHue + i * 2.5 + t * 8 * agg) % 360;
        let alpha = map(prog, 0, 1, 6, 55);
        stroke(ringHue, 28 + agg * 22, map(prog, 0, 1, 30, 88), alpha);
        strokeWeight(map(prog, 0, 1, 0.6, 2.5 + agg * 2));
        beginShape();
        let steps = 50;
        let deform = 0.06 + agg * 0.24;
        for (let j = 0; j <= steps; j++) {
            let ang = (j / steps) * TWO_PI;
            let nVal = noise(cos(ang) * 0.8 + 2 + i * 1.3, sin(ang) * 0.8 + 2 + i * 1.3, t * (0.4 + agg * 0.6));
            let nr = r * (1 + map(nVal, 0, 1, -deform, deform));
            vertex(cx + cos(ang) * nr, cy + sin(ang) * nr);
        }
        endShape(CLOSE);
    }

    // 2) Kaleidoscope arms join from layer 2
    if (tripDepth >= 2) {
        let segments = 3 + tripDepth;
        let spin = t * (0.3 + agg * 0.6);
        for (let seg = 0; seg < segments; seg++) {
            let baseAngle = (seg / segments) * TWO_PI + spin;
            // Analogous cluster around the base hue; one arm carries the
            // single complementary accent — restraint over rainbow
            let isAccent = seg === 0;
            let armHue = isAccent
                ? (baseHue + 160) % 360
                : (baseHue + 15 + seg * 9) % 360;
            for (let pass = 0; pass < 2; pass++) {
                stroke(armHue, isAccent ? 60 : 38 + agg * 18, 92, pass === 0 ? 12 : 42 + agg * 18);
                strokeWeight(pass === 0 ? 4 + agg * 3 : 1.5);
                beginShape();
                let steps = 35;
                for (let i = 0; i < steps; i++) {
                    let r = map(i, 0, steps, 10, min(width, height) * 0.48);
                    let nAngle = baseAngle + (noise(i * 0.1, seg * 1.3, t * (0.5 + agg * 0.5)) - 0.5) * (1.0 + agg * 0.8);
                    vertex(cx + cos(nAngle) * r, cy + sin(nAngle) * r);
                }
                endShape();
            }
        }
    }

    // 3) Veins crack through from layer 3
    if (tripDepth >= 3) {
        let veinCount = isMobile ? 6 : 10;
        for (let v = 0; v < veinCount; v++) {
            let ang0 = (v / veinCount) * TWO_PI + noise(v * 7.3, t * 0.2) * 0.8;
            let flicker = noise(v * 3.1, t * 1.8);
            if (flicker < 0.4) continue;
            stroke((baseHue + 10) % 360, 62, 70 + beat * 25, 30 + flicker * 60);
            strokeWeight(0.8 + flicker * 1.6);
            beginShape();
            let segs = 16;
            for (let s2 = 0; s2 <= segs; s2++) {
                let rr = map(s2, 0, segs, 10, max(width, height) * 0.6);
                let wob = (noise(v * 11.7, s2 * 0.35, t * 0.7) - 0.5) * rr * 0.4;
                let ang = ang0 + wob / rr;
                vertex(cx + cos(ang) * rr, cy + sin(ang) * rr);
            }
            endShape();
        }
    }

    // Smoke occlusion — the reality has body
    noStroke();
    colorMode(RGB);
    for (let b of smokeBlobs) {
        b.x += b.vx + (noise(b.seed, t * 0.3) - 0.5) * 0.8;
        b.y += b.vy * (1 + agg);
        if (b.y < -b.size) b.y = height + b.size;
        if (b.x < -b.size) b.x = width + b.size;
        if (b.x > width + b.size) b.x = -b.size;
        fill(0, 0, 0, 50 + agg * 30);
        ellipse(b.x, b.y, b.size, b.size * 0.7);
    }

    pop();

    // 4) Glitch slices tear the image from layer 3
    if (tripDepth >= 3 && random(1) < 0.15 + agg * 0.35) {
        let sliceCount = floor(random(1, 3 + agg * 3));
        for (let i = 0; i < sliceCount; i++) {
            let sy = random(height);
            let sh = random(3, 18);
            let off = random(-30, 30) * (0.5 + agg);
            copy(0, floor(sy), width, floor(sh), floor(off), floor(sy), width, floor(sh));
        }
    }

    // 5) The bottom: inverted flashes and grain storms
    if (tripDepth >= MAX_DEPTH) {
        if (random(1) < 0.035) {
            blendMode(DIFFERENCE);
            noStroke();
            fill(255);
            rect(0, 0, width, height);
            blendMode(BLEND);
        }
        let grain = isMobile ? 200 : 550;
        strokeWeight(1.4);
        for (let i = 0; i < grain; i++) {
            let gb = random(100, 220);
            stroke(gb, gb * 0.35, gb * 0.35, random(20, 60));
            point(random(width), random(height));
        }
    }

    // Pulsing vignette, bleeding more color the deeper you are
    noStroke();
    let vg = drawingContext.createRadialGradient(
        cx, cy, min(width, height) * 0.25,
        cx, cy, max(width, height) * 0.72
    );
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, `rgba(${floor(40 + agg * 140 + beat * 60)},0,${floor(30 - agg * 25)},${0.35 + agg * 0.25})`);
    drawingContext.fillStyle = vg;
    drawingContext.fillRect(0, 0, width, height);

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
        tripDepth = 1; // however deep you went, you always come back
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
        tripDepth = 1; // every fall starts at the surface of the other side
    } else if (state === 'trip' || state === 'shatter') {
        // Hit while falling: tear one layer deeper into the same reality
        if (tripDepth < MAX_DEPTH) tripDepth++;
        tripTimer = 0;
        flashFrames = 4;
        shakeFrames = 20 + tripDepth * 6;
        shakeDecay = 5 + tripDepth * 2;
    }
}
