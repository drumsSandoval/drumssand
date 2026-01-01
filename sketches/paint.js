let brushes = [];
let paperGrain;
let isMobile = false;

function setup() {
    createCanvas(windowWidth, windowHeight);
    
    pixelDensity(1);

    if (min(width, height) < 600) {
        isMobile = true;
    }

    background(245, 240, 235); 
    
    paperGrain = createGraphics(width, height);
    paperGrain.noStroke();
    
    let grainCount = isMobile ? 25000 : 60000;
    
    for(let i=0; i<grainCount; i++) {
        paperGrain.fill(0, random(5, 12)); 
        paperGrain.rect(random(width), random(height), 1, 1);
    }
    image(paperGrain, 0, 0);

    let initBrushes = isMobile ? 15 : 30;
    
    for (let i = 0; i < initBrushes; i++) {
        brushes.push(new HybridBrush());
    }
}

function draw() {
    for (let i = brushes.length - 1; i >= 0; i--) {
        brushes[i].update();
        brushes[i].show();
        
        if (brushes[i].isDead()) {
            brushes.splice(i, 1);
            brushes.push(new HybridBrush()); 
        }
    }
}

function mousePressed() {
    let count = isMobile ? 2 : 5;
    for(let i=0; i<count; i++) {
        brushes.push(new HybridBrush(mouseX, mouseY));
    }
}

function touchMoved() {
    return false;
}

function keyPressed() {
    if (key === ' ') {
        resetCanvas();
    }
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
    isMobile = min(width, height) < 600;
    resetCanvas();
}

function resetCanvas() {
    background(245, 240, 235);
    if (paperGrain.width !== width || paperGrain.height !== height) {
        paperGrain = createGraphics(width, height);
        paperGrain.noStroke();
        let grainCount = isMobile ? 25000 : 60000;
        for(let i=0; i<grainCount; i++) {
            paperGrain.fill(0, random(5, 12)); 
            paperGrain.rect(random(width), random(height), 1, 1);
        }
    }
    image(paperGrain, 0, 0);
    brushes = [];
    let initBrushes = isMobile ? 15 : 30;
    for (let i = 0; i < initBrushes; i++) {
        brushes.push(new HybridBrush());
    }
}

class HybridBrush {
    constructor(x, y) {
        this.pos = createVector(x || random(width), y || random(height));
        this.prevPos = this.pos.copy();
        
        this.vel = p5.Vector.random2D().mult(5);
        this.life = random(100, 400);
        this.maxLife = this.life;
        
        let wMin = isMobile ? 15 : 20;
        let wMax = isMobile ? 50 : 70;
        this.baseWidth = random(wMin, wMax);
        
        let colors = [
            color(180, 40, 40),   
            color(20, 60, 140),   
            color(200, 160, 20),  
            color(40, 100, 40),   
            color(80, 30, 100),   
            color(30, 30, 35)     
        ];
        this.mainColor = random(colors);
        this.bristles = [];
        
        let density = isMobile ? 0.6 : 1.0;
        let numBristles = int(this.baseWidth * density); 
        
        for(let i=0; i<numBristles; i++) {
            this.bristles.push({
                offset: random(-this.baseWidth/2, this.baseWidth/2),
                noiseSeed: random(1000)
            });
        }
        this.blobOffset = random(1000);
    }
    
    update() {
        this.prevPos = this.pos.copy();
        let n = noise(this.pos.x * 0.002, this.pos.y * 0.002, frameCount * 0.002);
        let angle = map(n, 0, 1, 0, TWO_PI * 4);
        
        if(dist(mouseX, mouseY, this.pos.x, this.pos.y) < 200) {
            angle = lerp(angle, atan2(mouseY-this.pos.y, mouseX-this.pos.x), 0.1);
        }
        this.vel = p5.Vector.fromAngle(angle).mult(7);
        this.pos.add(this.vel);
        this.life -= 1;
        this.currentWidth = this.baseWidth * (0.5 + 0.5 * sin(frameCount * 0.1));
    }
    
    show() {
        let perp = p5.Vector.fromAngle(this.vel.heading() + HALF_PI);
        let r = red(this.mainColor);
        let g = green(this.mainColor);
        let b = blue(this.mainColor);
        
        noStroke();
        fill(r, g, b, 8); 
        push();
        translate(this.pos.x, this.pos.y);
        beginShape();
        
        let step = isMobile ? 1.0 : 0.5;
        
        for (let a = 0; a < TWO_PI; a += step) {
            let waterRadius = (this.currentWidth * 1.5) + map(noise(cos(a), sin(a), this.blobOffset), 0, 1, -20, 20);
            vertex(waterRadius * cos(a), waterRadius * sin(a));
        }
        endShape(CLOSE);
        pop();
        this.blobOffset += 0.1;
        noFill();
        stroke(r, g, b, 50); 
    
        strokeWeight(1);
        
        for (let br of this.bristles) {
            let scale = this.currentWidth / this.baseWidth;
            let currentOffset = br.offset * scale;
            let wiggle = noise(br.noiseSeed + frameCount * 0.2) * 3;
            currentOffset += wiggle;

            let p1 = p5.Vector.add(this.prevPos, p5.Vector.mult(perp, currentOffset));
            let p2 = p5.Vector.add(this.pos, p5.Vector.mult(perp, currentOffset));
            
            line(p1.x, p1.y, p2.x, p2.y);
        }
    }   
    isDead() {
        if (this.pos.x < -50 || this.pos.x > width+50 || this.pos.y < -50 || this.pos.y > height+50) return true;
        return this.life < 0;
    }
}