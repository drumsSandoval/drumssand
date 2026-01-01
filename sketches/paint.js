
let brushes = [];
let paperGrain;
function setup() {
    createCanvas(windowWidth, windowHeight);
    background(245, 240, 235); 
    
    paperGrain = createGraphics(width, height);
    paperGrain.noStroke();
    for(let i=0; i<60000; i++) {
        paperGrain.fill(0, random(5, 12)); 
        paperGrain.rect(random(width), random(height), 1, 1);
    }
    image(paperGrain, 0, 0);
    for (let i = 0; i < 30; i++) {
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
    for(let i=0; i<5; i++) {
        brushes.push(new HybridBrush(mouseX, mouseY));
    }
}

function keyPressed() {
    if (key === ' ') {
        background(245, 240, 235);
        image(paperGrain, 0, 0);
        brushes = [];
        for (let i = 0; i < 30; i++) {
            brushes.push(new HybridBrush());
        }
    }
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
    background(245, 240, 235);
    image(paperGrain, 0, 0);
}

class HybridBrush {
    constructor(x, y) {
        this.pos = createVector(x || random(width), y || random(height));
        this.prevPos = this.pos.copy();
        this.vel = p5.Vector.random2D().mult(5);
        this.life = random(100, 400);
        this.maxLife = this.life;
        this.baseWidth = random(20, 70);
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
        let numBristles = int(this.baseWidth); 
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
        for (let a = 0; a < TWO_PI; a += 0.5) {
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