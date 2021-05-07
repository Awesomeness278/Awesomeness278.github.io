/*
p5.multiplayer - HOST

This 'host' sketch is intended to be run in desktop browsers. 
It connects to a node server via socket.io, from which it receives
rerouted input data from all connected 'clients'.

Navigate to the project's 'public' directory.
Run http-server -c-1 to start server. This will default to port 8080.
Run http-server -c-1 -p80 to start server on open port 80.

*/

////////////
// Network Settings
// const serverIp      = 'https://yourservername.herokuapp.com';
// const serverIp      = 'https://yourprojectname.glitch.me';

var firebaseConfig = {
  apiKey: "AIzaSyAETaz7NpNCP8F72O1OtuSZP1Id700bIFw",
  authDomain: "procedural-platformer.firebaseapp.com",
  databaseURL: "https://procedural-platformer.firebaseio.com",
  projectId: "procedural-platformer",
  storageBucket: "procedural-platformer.appspot.com",
  messagingSenderId: "821012624219",
  appId: "1:821012624219:web:72e8a4acb9d2bead11e07e",
  measurementId: "G-32YV6L2GS3"
};
// Initialize Firebase
firebase.initializeApp(firebaseConfig);
firebase.analytics();
let database = firebase.database();
let ref = database.ref("stats");
ref.on("value",updateStats);

let numPlayers = 0;
let numRooms = 0;
let highscore = 0;
let enemySpeed = 1;
let numDeaths = 0;
let enemySpeedMultiplier = 1.05;

function updateStats(data){
  if(data){
    if(data.val){
      var items = data.val();
      if(items){
        numPlayers = 0;
        numRooms = 0;
        let keys = Object.keys(items);
        for(key of keys){
          numPlayers+=items[key].numPlayers;
          numRooms+=1;
          highscore = max(highscore,items[key].highscore);
          numDeaths = items[key].numDeaths;
        }
      }
    }
  }
}

function sendStats(){
  let data = {
    highscore:highscore,
    numDeaths:numDeaths+game.numDeaths
  }
  game.numDeaths = 0;
  let r = database.ref("stats/gameStats");
  r.set(data);
}

const serverIp = 'https://gameserver3.tylerbalota.repl.co';
const serverPort = '3000';
const local = false;   // true if running locally, false
// if running on remote server

// Global variables here. ---->

const velScale = 10;
const debug = true;
let scale = 1 / 4;
let game;

// <----

function preload() {
  setupHost();
}

function setup() {
  createCanvas(windowWidth, windowHeight - 5);

  // Host/Game setup here. ---->

  game = new Game(width, height);

  // <----
  k = roomId;
}

function draw() {
  if(frameCount%3===0){
    let p = {};
    let e = [];
    for(let k of Object.keys(game.players)){
      p[k] = {x:game.players[k].position.x,y:game.players[k].position.y,name:game.players[k].name,dead:game.dead.indexOf(k)!==-1,money:game.players[k].money}
    }
    for(let en = 0; en < game.enemies.length; en++){
      e.push({x:game.enemies[en].position.x,y:game.enemies[en].position.y});
    }
    sendData('gameState',{players:p,enemies:e,width:game.w,height:game.h});
  }
  highscore = max(highscore,game.round);
  if(frameCount%120===0){
    sendStats();
  }
  background(15);

  if (isHostConnected(display = true)) {
    // Host/Game draw here. --->

    // Update and draw game objects
    game.draw();

    // Display player IDs in top left corner
    game.printPlayerIds(5, 20);

    // <----

    // Display server address
    displayAddress();
  }
}

function onClientConnect(data) {
  // Client connect logic here. --->

  if (!game.checkId(data.id)) {
    game.add(data.id,
      random(0.25 * width, 0.75 * width),
      random(0.25 * height, 0.75 * height),
      60 * scale, 60 * scale
    );
  }

  // <----
}

function onClientDisconnect(data) {
  // Client disconnect logic here. --->

  if (game.checkId(data.id)) {
    game.remove(data.id);
  }

  // <----
}

function onReceiveData(data) {
  // Input data processing here. --->
  if(game.players[data.id]){
    if (data.type === 'joystick') {
      processJoystick(data);
    }
    else if (data.type === 'button') {
      processButton(data);
    }
    else if (data.type === 'playerColor') {
      game.setColor(data.id, data.r, data.g, data.b);
    } else if (data.type === 'key') {
      processKey(data);
    } else if (data.type === 'name') {
      game.setName(data.id, data.name);
    } else if (data.type === 'shoot') {
      //hello
      game.addBullet(data);
    } else if (data.type === "ping"){
      game.players[data.id].ping = (Date.now() - data.timestamp);
    }
  }
  // <----

  /* Example:
     if (data.type === 'myDataType') {
       processMyData(data);
     }

     Use `data.type` to get the message type sent by client.
  */
}

// This is included for testing purposes to demonstrate that
// messages can be sent from a host back to all connected clients
function mousePressed() {
  sendData('timestamp', { timestamp: millis() });
}

////////////
// Input processing
function processJoystick(data) {

  game.setVelocity(data.id, data.joystickX * velScale, -data.joystickY * velScale);
}

function processButton(data) {
  game.players[data.id].val = data.button;

}

function processKey(data) {
  game.setVelocity(data.id, data.x * velScale / 2, data.y * velScale / 2);
}

////////////
// Game
// This simple placeholder game makes use of p5.play
class Game {
  constructor(w, h) {
    this.w = w;
    this.h = h;
    this.players = {};
    this.numPlayers = 0;
    this.maxBullets = 50;
    this.numDeaths = 0;
    this.round = 0;
    this.id = 0;
    this.colliders = new Group();
    this.ripples = new Ripples();
    this.walls = new Group();
    this.enemies = new Group();
    this.bullets = new Group();
    this.assets = [];
    this.going = false;
    this.dead = [];
    this.enemyAmount = 10;
    this.enemySize = 80 * scale;
    //Put all setup stuff here//
    this.walls.add(createSprite(-5, height / 2 + 10, 10, height + 20));
    this.walls.add(createSprite(width / 2 + 10, -5, width + 20, 10));
    this.walls.add(createSprite(width + 5, height / 2 + 10, 10, height + 20));
    this.walls.add(createSprite(width / 2 + 10, height + 5, width + 20, 10));
  }
  addBullet(data) {
    let id = data.id;
    if (this.dead.indexOf(id) === -1) {
      let x = data.aimX + this.players[id].position.x;
      let y = data.aimY + this.players[id].position.y;
      let a = atan2(-data.aimY, data.aimX);
      let bullet = createSprite(x, y, 8, 8);
      bullet.shapeColor = color(0,0,0);
      bullet.velocity.x = 5 * cos(a);
      bullet.velocity.y = 5 * sin(a);
      bullet.owner = id;
      this.bullets.add(bullet);
      if(this.bullets.length > this.maxBullets){
        this.bullets.remove(this.bullets[0]);
      }
    }
  }
  add(id, x, y, w, h) {
    this.players[id] = createSprite(x, y, w, h);
    this.players[id].id = "p" + this.id;
    this.players[id].setCollider("rectangle", 0, 0, w, h);
    this.players[id].color = color(255, 255, 255);
    this.players[id].shapeColor = color(255, 255, 255);
    this.players[id].scale = 1;
    this.players[id].mass = 1;
    this.players[id].name = "";
    this.players[id].money = 0;
    this.players[id].ready = false;
    this.players[id].draw = function() {
      fill(this.shapeColor);
      ellipseMode(CENTER);
      ellipse(0, 0, this.width, this.height);
      fill(0);
      textSize(20);
      textAlign(CENTER,BOTTOM)
      text(this.name,0,-this.height/2);
    }
    if(this.going){
      this.dead.push(id);
    }
    this.players[id].ping = 0;
    this.colliders.add(this.players[id]);
    this.id++;
    this.numPlayers++;
  }

  draw() {
    if(this.dead.length === this.numPlayers && this.numPlayers!==0){
      this.round = -1;
      enemySpeed = 1/enemySpeedMultiplier;
      this.enemies.removeSprites();
    }
    if(this.enemies.size()===0){
      this.dead = [];
      this.going = false;
    }
    background('green');
    fill(150, 100, 50);
    rectMode(CENTER);
    rect(width / 2, height / 2, width * 0.93, height * 0.9);
    rectMode(CORNER);
    fill(255);
    textSize(30);
    textAlign(CENTER,CENTER);
    text("Round: "+this.round+", Enemies Left: "+this.enemies.size(),width/2,height-20);
    textAlign(RIGHT,TOP);
    textSize(10);
    text("Current Global Highscore: "+highscore+"\nCurrent Global Death Count: "+numDeaths,width,0)
    textAlign(LEFT,TOP);
    let keys = Object.keys(this.players);
    for (let i = 0; i < keys.length; i++) {
      if(this.dead.indexOf(keys[i])===-1){
        if (this.players[keys[i]].collide(this.enemies)&&this.dead.indexOf(keys[i])===-1) {
          this.dead.push(keys[i]);
          this.players[this.dead[this.dead.length-1]].reviveTimer = 3;
          this.numDeaths++;
        }
      }
      this.players[keys[i]].collide(this.walls);
    }

    for(let d = 0; d < this.dead.length; d++){
      for(let p of Object.keys(this.players)){
        if(p!==this.dead[d]){
          if(this.players[p].overlap(this.players[this.dead[d]])){
            this.players[this.dead[d]].reviveTimer -= deltaTime/1000;
            if(this.players[this.dead[d]].reviveTimer <= 0){
              this.dead.splice(d,1);
              if(this.players[this.dead[d]]){
                this.players[this.dead[d]].reviveTimer = undefined;
              }
              break;
            }
          }
        }
      }
    }

    for (let e = 0; e < this.enemies.length; e++) {
      let minDist = Infinity;
      let targetX = this.enemies[e].position.x;
      let targetY = this.enemies[e].position.y;
      for (let p of Object.keys(this.players)) {
        if (dist(this.enemies[e].position.x, this.enemies[e].position.y, this.players[p].position.x, this.players[p].position.y) < minDist && this.dead.indexOf(p)===-1) {
          minDist = dist(this.enemies[e].position.x, this.enemies[e].position.y, this.players[p].position.x, this.players[p].position.y);
          targetX = this.players[p].position.x;
          targetY = this.players[p].position.y;
        }
      }
      targetX -= this.enemies[e].position.x;
      targetY -= this.enemies[e].position.y;
      let mult = 1 / sqrt(targetX * targetX + targetY * targetY);
      targetX *= mult * enemySpeed;
      targetY *= mult * enemySpeed;
      if (isNaN(targetX)) {
        targetX = 0;
      }
      if (isNaN(targetY)) {
        targetY = 0;
      }
      this.enemies[e].velocity.x = targetX;
      this.enemies[e].velocity.y = targetY;
    }
    for(let i = 0; i < this.enemies.length; i++){
      for(let b = 0; b < this.bullets.length; b++){
        if(this.enemies[i]){
          if(this.enemies[i].collide){
            this.enemies[i].collide(this.bullets[b],this.hitEnemy);
          }
        }
      }
    }
    this.walls.overlap(this.bullets, this.hitWall);
    this.enemies.displace(this.enemies);
    this.enemies.collide(this.walls);
    this.checkBounds();
    if(!this.going){
      noStroke();
      fill(0,255,0);
      rect(width/2-40,height/2-40,80,80);
      fill(0);
      textSize(25);
      textAlign(CENTER,CENTER);
      text("Ready",width/2,height/2);
      let start = true;
      for(let k of Object.keys(this.players)){
        let x = this.players[k].position.x;
        let y = this.players[k].position.y;
        if(x>width/2-40&&x<width/2+40&&y>height/2-40&&y<height/2+40){
          this.players[k].ready = true;
        }else{
          this.players[k].ready = false;
        }
        if(!this.players[k].ready){
          start = false;
        }
      }
      if(start && Object.keys(this.players).length>0){
        this.going = true;
        this.round++;
        enemySpeed*=enemySpeedMultiplier;
        this.enemyAmount = 10+this.round*2;
        for (let i = 0; i < this.enemyAmount; i++) {
          let n = random(width*2+height*2);
          let enemy;
          if(n<height){
            enemy = createSprite(0,Math.random() * height, this.enemySize,this.enemySize);
          }else if(n<height+width){
            enemy = createSprite(Math.random() * width,0, this.enemySize,this.enemySize);
          }else if(n<2*height+width){
            enemy = createSprite(width,Math.random() * height, this.enemySize,this.enemySize);
          }else if(n<2*height+2*width){
            enemy = createSprite(Math.random()*width,height, this.enemySize,this.enemySize);
          }
          enemy.shapeColor = color(255, 255, 100);
          this.enemies.add(enemy);
        }
      }
    }
    this.bullets.draw();
    this.ripples.draw();
    this.enemies.draw();
    drawSprites();
  }

  hitEnemy(enemy, bullet) {
    enemy.remove();
    game.players[bullet.owner].money+=Math.round(Math.sqrt(game.round)*100)+100;
    bullet.remove();
  }

  hitWall(wall, bullet) {
    bullet.remove();
  }

  setName(id, name) {
    this.players[id].name = name;
  }

  createRipple(id, r, duration) {
    this.ripples.add(
      this.players[id].position.x,
      this.players[id].position.y,
      r,
      duration,
      this.players[id].color);
  }

  setColor(id, r, g, b) {
    this.players[id].color = color(r, g, b);
    this.players[id].shapeColor = color(r, g, b);

    print(this.players[id].name + " color added.");
  }

  remove(id) {
    this.colliders.remove(this.players[id]);
    this.players[id].remove();
    if(this.dead.indexOf(id)!==-1){
      this.dead.splice(this.dead.indexOf(id),1);
    }
    delete this.players[id];
    this.numPlayers--;
  }

  checkId(id) {
    if (id in this.players) { return true; }
    else { return false; }
  }

  printPlayerIds(x, y) {
    push();
    noStroke();
    fill(255);
    textSize(16);
    text("# players: " + this.numPlayers, x, y);

    y = y + 16;
    fill(200);
    for (let id in this.players) {
      text(this.players[id].name, x, y);
      y += 16;
    }

    pop();
  }

  setVelocity(id, velx, vely) {
    if (this.dead.indexOf(id) !== -1) {
      this.players[id].velocity.x = 0;
      this.players[id].velocity.y = 0;
    } else {
      this.players[id].velocity.x = velx * scale;
      this.players[id].velocity.y = vely * scale;
    }
  }

  checkBounds() {
    for (let id in this.players) {

      if (this.players[id].position.x < 0) {
        this.players[id].position.x = this.w - 1;
      }

      if (this.players[id].position.x > this.w) {
        this.players[id].position.x = 1;
      }

      if (this.players[id].position.y < 0) {
        this.players[id].position.y = this.h - 1;
      }

      if (this.players[id].position.y > this.h) {
        this.players[id].position.y = 1;
      }
    }
    for (let e = 0; e < this.enemies.length; e++) {
      if (this.enemies[e].position.x < 0) {
        this.enemies[e].position.x = this.w - 1;
      }

      if (this.enemies[e].position.x > this.w) {
        this.enemies[e].position.x = 1;
      }

      if (this.enemies[e].position.y < 0) {
        this.enemies[e].position.y = this.h - 1;
      }

      if (this.enemies[e].position.y > this.h) {
        this.enemies[e].position.y = 1;
      }
    }
  }
}

// A simple pair of classes for generating ripples
class Ripples {
  constructor() {
    this.ripples = [];
  }

  add(x, y, r, duration, rcolor) {
    this.ripples.push(new Ripple(x, y, r, duration, rcolor));
  }

  draw() {
    for (let i = 0; i < this.ripples.length; i++) {
      // Draw each ripple in the array
      if (this.ripples[i].draw()) {
        // If the ripple is finished (returns true), remove it
        this.ripples.splice(i, 1);
      }
    }
  }
}

class Ripple {
  constructor(x, y, r, duration, rcolor) {
    this.x = x;
    this.y = y;
    this.r = r;

    // If rcolor is not defined, default to white
    if (rcolor == null) {
      rcolor = color(255);
    }

    this.stroke = rcolor;
    this.strokeWeight = 3;

    this.duration = duration;   // in milliseconds
    this.startTime = millis();
    this.endTime = this.startTime + this.duration;
  }

  draw() {
    let progress = (this.endTime - millis()) / this.duration;
    let r = this.r * (1 - progress);

    push();
    stroke(red(this.stroke),
      green(this.stroke),
      blue(this.stroke),
      255 * progress);
    strokeWeight(this.strokeWeight);
    fill(0, 0);
    ellipse(this.x, this.y, r * scale);
    pop();

    if (millis() > this.endTime) {
      return true;
    }

    return false;
  }
}