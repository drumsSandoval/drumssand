let t = 0;
let mode = 0;
let isMobile = false;

function setup() {
    createCanvas(windowWidth, windowHeight);
    pixelDensity(1); 
    if (min(width, height) < 600) {
        isMobile = true;
    }
    background(0);
    frameRate(60);
    cursor(CROSS);
    textSize(14);
}

function draw() {
    let shakeIntensity = (mode === 3) ? 5 : 2;
    let shakeX = random(-shakeIntensity, shakeIntensity);
    let shakeY = random(-shakeIntensity, shakeIntensity);
    push();
    translate(shakeX, shakeY);
    let bg, c1, c2, cMain, uiColor, statusText;
    if (mode === 0) { 
        bg = color(10, 10, 15, 50); 
        c1 = color(255, 0, 50, 180); 
        c2 = color(0, 255, 200, 180); 
        cMain = color(255, 200);
        uiColor = color(255);
        statusText = "REC ● [ FOCUS_LOST ]";
    } else if (mode === 1) { 
        bg = color(240, 240, 245, 50); 
        c1 = color(0, 255, 255, 150); 
        c2 = color(255, 0, 255, 150); 
        cMain = color(20, 200);
        uiColor = color(0);
        statusText = "SYSTEM // ANXIETY";
    } else if (mode === 2) { 
        bg = color(40, 5, 0, 50); 
        c1 = color(255, 0, 0, 180); 
        c2 = color(255, 200, 0, 180); 
        cMain = color(255, 100, 0, 200); 
        uiColor = color(255, 200, 0);
        statusText = "WARNING: OVERHEAT 🔥";
    } else { 
        bg = color(0, 0, 200, 50); 
        c1 = color(0, 255, 0, 200); 
        c2 = color(255, 0, 255, 200); 
        cMain = color(255);
        uiColor = color(255);
        statusText = "FATAL_ERROR ☠️ GPU";
        
        if (random(1) > 0.9) {
            fill(0);
            rect(0, random(height), width, random(10, 50));
        }
    }
    noStroke();
    fill(bg);
    rect(-10, -10, width + 20, height + 20);
    if (random(1) > 0.99) {
        fill(mode === 0 ? 30 : 255, 200);
        rect(-10, -10, width+20, height+20);
    }
    noFill();
    let mouse = createVector(mouseX, mouseY);
    let wScale = isMobile ? 1.5 : 1; 
    stroke(c1);
    strokeWeight(2 * wScale);
    drawNoisyLandscape(-6, mouse, t); 
    stroke(c2);
    strokeWeight(2 * wScale);
    drawNoisyLandscape(6, mouse, t);
    stroke(cMain);
    strokeWeight(1.5 * wScale);
    drawNoisyLandscape(0, mouse, t);
    pop();
    let baseNoise = (mode === 3) ? 2000 : 800;
    let noiseAmount = isMobile ? baseNoise / 2 : baseNoise;
    stroke(uiColor);
    strokeWeight(mode === 3 ? 2 : 1);
    for (let i = 0; i < noiseAmount; i++) {
        let x = random(width);
        let y = random(height);
        if (random(1) > 0.999) strokeWeight(4); else strokeWeight(1);
        point(x, y);
    }
    fill(uiColor);
    noStroke();
    text(statusText, 20, 30);
    
    if(frameCount % 10 === 0) {
        text("MEM: " + int(random(100, 999)) + "MB", 20, 50);
    } else {
         text("MEM: " + int(random(100, 999)) + "MB", 20, 50);
    }
    t += 0.08;
}

function mousePressed() {
    mode++;
    if (mode > 3) mode = 0;
}

function touchMoved() {
    return false;
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
    isMobile = (min(width, height) < 600);
}

function drawNoisyLandscape(xOffset, mouse, time) {
    let rows = isMobile ? 18 : 25; 
    let spacing = height / rows;
    for (let i = 0; i < rows; i++) {
        beginShape();
        let baseStep = (mode === 3) ? 20 : 12; 
        let step = isMobile ? baseStep * 1.5 : baseStep; 
        for (let x = 0; x <= width; x += step) {
            let yBase = i * spacing + (spacing * 1.5);
            let noiseVal = noise(x * 0.02, i * 0.5, time); 
            let elevation = map(noiseVal, 0, 1, -40, 40);
            let constantJitter = random(-3, 3); 
            let d = dist(x, yBase, mouse.x, mouse.y);
            let glitchFactor = 0;
            let horizontalGlitch = 0;
            
            if (d < 350) {
                let force = map(d, 0, 350, 1, 0);
                if (mode === 2) {
                     glitchFactor = sin(x * 0.1 + time * 10) * 50 * force;
                } else {
                     glitchFactor = random(-60, 60) * force;
                }   
                if (random(1) > 0.6) {
                    horizontalGlitch = random(-30, 30) * force;
                }
            }
            let finalY = yBase + elevation + constantJitter + glitchFactor;
            let finalX = x + xOffset + horizontalGlitch;
            if (random(1) > 0.999) finalX += random(-200, 200);
            vertex(finalX, finalY);
        }
        endShape();
    }
}