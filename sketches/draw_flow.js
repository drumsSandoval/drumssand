let rays = [];
let numRays = 70;
let t = 0;

function setup() {
    createCanvas(windowWidth, windowHeight, P2D);
    colorMode(HSB, 360, 100, 150, 100);
    background(0);
    for (let i = 0; i < numRays; i++) {
        rays.push(new Ray());
    }
}

function draw() {
    let mouseSpeed = dist(mouseX, mouseY, pmouseX, pmouseY);
    let fadeSpeed = map(mouseSpeed, 0, 50, 5, 20, true);
    background(0, 0, 0, fadeSpeed);
    blendMode(ADD);
    push();
    translate(width / 2, height / 2);
    rotate(t * 0.02);
    noFill();
    strokeWeight(1 + sin(t*2));
    stroke(255, 10 + sin(t*3)*5); 
    triangle(-120, 60, 120, 60, 0, -150);
    pop();
    let mouse = createVector(mouseX, mouseY);
    let chaosFactor = map(mouseSpeed, 0, 100, 0, 1, true);
    for (let ray of rays) {
        ray.update(mouse, t, chaosFactor);
        ray.display();
    }
    t += 0.005 + (chaosFactor * 0.03); 
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
    background(0);
}
class Ray {
    constructor() {
        this.reset();
        this.history = []; 
    }

    reset() {
        let speed = random(2, 4);
        if (random(1) > 0.5) {
             this.pos = createVector(random(width), -50);
             this.vel = createVector(random(-1, 1), speed);
        } else {
             this.pos = createVector(-50, random(height));
             this.vel = createVector(speed, random(-1, 1));
        }
        this.baseVel = this.vel.copy();
        this.hue = 0;
        this.sat = 0;
        this.brightness = 50;
        // Estelas más largas
        this.maxHistory = random(50, 80);
        this.thickness = random(1, 2.5);
        this.history = [];
    }

    update(mouseVec, time, chaos) {
        this.history.push(this.pos.copy());
        if (this.history.length > this.maxHistory) {
            this.history.shift();
        }
        let d = p5.Vector.dist(this.pos, mouseVec);
        let interactionZone = min(width, height) * 0.35; 
        if (d < interactionZone) {
            let angleToMouse = p5.Vector.sub(mouseVec, this.pos).heading();
            let dispersion = map(d, 0, interactionZone, 1, 0);
            let noiseScale = 0.01 + (chaos * 0.02);
            let noiseVal = noise(this.pos.x * noiseScale, this.pos.y * noiseScale, time);
            this.hue = map(angleToMouse + noiseVal * (1+chaos*2), -PI, PI, 0, 360);
            this.sat = 100; 
            this.brightness = map(d, 0, interactionZone, 150, 50) + (chaos * 100);
            let forceMultiplier = 3 + (chaos * 15);
            let bendAngle = angleToMouse + PI/2 * (noiseVal > 0.5 ? 1 : -1);
            if(chaos > 0.1) bendAngle += random(-chaos, chaos);
            let bendForce = p5.Vector.fromAngle(bendAngle);
            bendForce.setMag(dispersion * forceMultiplier);
            this.vel.add(bendForce);
            this.vel.limit(6 + chaos * 10); 
        } else {
            this.vel.lerp(this.baseVel, 0.02);
            this.sat = lerp(this.sat, 0, 0.05);
            this.brightness = lerp(this.brightness, 40, 0.05);
        }
        this.pos.add(this.vel);
        if (this.pos.x > width + 200 || this.pos.x < -200 || 
            this.pos.y > height + 200 || this.pos.y < -200) {
            this.reset();
        }
    }

    display() {
        noFill();
        strokeWeight(this.thickness * (1 + this.brightness/150));
        
        beginShape();
        for (let i = 0; i < this.history.length; i++) {
            let pos = this.history[i];
            let alpha = map(i, 0, this.history.length, 0, this.brightness);
            let hueShift = (this.hue + i*0.5) % 360;
            stroke(hueShift, this.sat, this.brightness, alpha);
            vertex(pos.x, pos.y);
        }
        endShape();
    }
}