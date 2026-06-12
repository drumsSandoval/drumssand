let t = 0;
let isMobile = false;

function setup() {
    createCanvas(windowWidth, windowHeight);
    
    pixelDensity(1);

    if (min(width, height) < 600) {
        isMobile = true;
    }

    background(0);
}

function draw() {
    let speed = dist(mouseX, mouseY, pmouseX, pmouseY);
    speed = constrain(speed, 0, 100);

    noStroke();
    let fadeAlpha = map(speed, 0, 100, 50, 5);
    fill(0, isMobile ? fadeAlpha + 10 : fadeAlpha); 
    rect(0, 0, width, height);
    
    let maxRects = isMobile ? 50 : 150;
    let intensity = map(mouseX, 0, width, 2, maxRects);
    
    let stretch = map(mouseY, 0, height, 2, 100);
    
    blendMode(ADD); 
    
    for(let i=0; i < intensity; i++) {
        let x = random(width);
        if (random(1) > 0.5) x = lerp(x, mouseX, 0.5);
        
        let y = random(height);
        let w = random(10, width/4);
        let h = random(1, stretch); 
        
        let r = random(1);
        if (speed > 30) {
            if(r < 0.5) fill(255, 50, 50, 200);
            else fill(255, 255, 255, 200);
        } else {
            if(r < 0.3) fill(0, 255, 255, 100);
            else if (r < 0.6) fill(255, 0, 255, 100);
            else fill(0, 0, 255, 100);
        }
        
        rect(x, y, w, h);
    }
    
    blendMode(BLEND);

    if (speed > 5 && frameCount % 4 === 0) {
        let sliceH = random(5, 50);
        let sliceY = random(height);
        let shift = random(-speed, speed) * 2;

        let img = get(0, sliceY, width, sliceH);
        image(img, shift, sliceY);
    }

    stroke(0, 255, 0, 50); 
    strokeWeight(1);
    
    let lineCount = isMobile ? 10 : 20;
    for(let i=0; i < lineCount; i++) {
        let y = random(height);
        let offset = mouseIsPressed ? random(-50, 50) : noise(t + y)*10;
        line(0, y + offset, width, y);
    }
    
    if (mouseIsPressed) {
        blendMode(DIFFERENCE);
        fill(255);
        noStroke();
        rect(0, 0, width, height);
        blendMode(BLEND); // Reset
    }

    t += 0.05;
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
    isMobile = min(width, height) < 600;
    background(0);
}

function touchMoved() {
    return false;
}