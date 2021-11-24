/*
p5.multiplayer - HOST

This 'host' sketch is intended to be run in desktop browsers. 
It connects to a node server via socket.io, from which it receives
rerouted input data from all connected 'clients'.

Navigate to the project's 'public' directory.
Run http-server -c-1 to start server. This will default to port 8080.
Run http-server -c-1 -p80 to start server on open port 80.

*/

class upgrade{
  constructor(id,val,desc,cost,title,maxLevel){
    this.id = id;
    this.val = val;
    this.desc = desc;
    this.cost = cost;
    this.title = title;
    this.maxLevel = maxLevel;
  }
}

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
let upgrades = [
  new upgrade("speed",1.3,"Increases your speed by 30%",1000,"Extra\Speed",Infinity),
  new upgrade("shot",1,"Shoots an extra bullet forward","1000","Extra\nShot",Infinity),
  new upgrade("backwardsShot",1,"Shoots an extra bullet backwards","1000","Backwards\nShot",Infinity),
  new upgrade("angleShot","1","Shoots an extra bullet forward with an angle","1000","Angled\nShot"),
  new upgrade("leftShot","1","Shoots an extra bullet to the left of where you aim","1000","Left\nShot"),
  new upgrade("rightShot","1","Shoots an extra bullet to the right of where you aim","1000","Right\nShot"),
  new upgrade("extraLife","1","Adds an extra life","1000","Extra\nLife"),
  new upgrade("reviveTime","1.5","Increases the speed at which you revive friends by 50%","1000","Revive\nSpeed"),
  new upgrade("bulletSize","2","Increases the bullet size by 2px","1000","Bullet\nSize"),
  new upgrade("reloadSpeed","1.5","Increases your reload speed by 50%","1000","Reload\nSpeed"),
  new upgrade("ammoAmount","1.5","Increases the amount of ammo per reload by 50%","1000","Ammo\nAmount")
];

function updateStats(data){
  if(data){
    if(data.val){
      var items = data.val();
      if(items){
        numPlayers = 0;
        numRooms = 0;
        let keys = Object.keys(items);
        let key = "gameStats"
        numPlayers+=items[key].numPlayers;
        numRooms+=1;
        highscore = Math.max(highscore,items[key].highscore);
        numDeaths = items[key].numDeaths;
      }
    }
  }
}

function sendStats(){
  if(!isNaN(highscore)&&highscore!==undefined&&!isNaN(numDeaths+game.numDeaths)&&numDeaths+game.numDeaths!==undefined){
    let data = {
      highscore:highscore,
      numDeaths:numDeaths+game.numDeaths
    }
    game.numDeaths = 0;
    let r = database.ref("stats/gameStats");
    r.set(data);
  }
}

function sendTimestamp(key){
  let r = database.ref("stats/"+key);
  let data = {
    timestamp:Date.now(),
    private:private
  }
  r.set(data);
}

const serverIp = 'https://legend-painted-aspen.glitch.me';
const serverPort = '3000';
const local = false;   
// true if running locally, false
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

let w = 1366;
let h = w/16 * 9;
let mult = 1/h;

function setup() {
  if(windowWidth/16*9<windowHeight){
    createCanvas(windowWidth, windowWidth/16*9);
  }else{
    createCanvas(windowHeight/9*16,windowHeight);
  }
  mult*=height;

  // Host/Game setup here. ---->

  game = new Game(width, height);

  // <----
  k = roomId;
}

function draw() {
  if(isNaN(highscore)){
    noLoop();
  }
  if(frameCount%3===0){
    let p = {};
    let e = [];
    let b = [];
    for(let k of Object.keys(game.players)){
      p[k] = {x:game.players[k].position.x,y:game.players[k].position.y,name:game.players[k].name,dead:game.dead.indexOf(k)!==-1,money:game.players[k].money,upgradeAmounts:game.players[k].upgradeAmounts}
    }
    for(let en = 0; en < game.enemies.length; en++){
      e.push({x:game.enemies[en].position.x,y:game.enemies[en].position.y,color:game.enemies[en].shapeColor});
    }
    for(let bul = 0; bul < game.bullets.length; bul++){
      b.push({x:game.bullets[bul].position.x,y:game.bullets[bul].position.y,w:game.bullets[bul].width,h:game.bullets[bul].height});
    }
    sendData('gameState',{players:p,enemies:e,bullets:b,width:game.w,height:game.h,going:game.going,upgrades:game.upgrades,mult:mult,round:game.round,el:game.enemies.size()});
  }
  highscore = Math.max(highscore,game.round);
  if(frameCount%120===119){
    sendStats();
    sendTimestamp(k);
  }
  background(15);

  if (isHostConnected(display = true)) {
    // Host/Game draw here. --->

    // Update and draw game objects
    game.draw();

    textAlign(LEFT,TOP);
    // Display player IDs in top left corner
    game.printPlayerIds(5, 20);

    // <----

    // Display server address
    displayAddress(mult);
  }
}

function onClientConnect(data) {
  // Client connect logic here. --->

  if (!game.checkId(data.id)) {
    game.add(data.id,
      random(0.25 * width, 0.75 * width),
      random(0.25 * height, 0.75 * height),
      60 * scale * mult, 60 * scale * mult
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
    } else if (data.type === 'button') {
      processButton(data);
    } else if (data.type === 'playerColor') {
      game.setColor(data.id, data.r, data.g, data.b);
    } else if (data.type === 'key') {
      processKey(data);
    } else if (data.type === 'name') {
      game.setName(data.id, data.name);
    } else if (data.type === 'shoot') {
      let player = game.players[data.id];
      let id = data.id;
      player.bulletsLeft = [
        player.stats.bulletNumForward,
        player.stats.bulletNumBackward,
        player.stats.bulletNumLeft,
        player.stats.bulletNumRight,
        player.stats.angledBullets
      ]
      game.addBullet(data,"forward");
      game.addBullet(data,"backward");
      game.addBullet(data,"left");
      game.addBullet(data,"right");
      game.addBullet(data,"angled");
      if(game.dead.indexOf(id) === -1 && game.players[id].ammoAmount > 0 && game.players[id].reloadTimer <= 0){
        game.players[id].ammoAmount--;
      }
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

  game.setVelocity(data.id, data.joystickX * velScale * mult, -data.joystickY * velScale * mult);
}

function processButton(data) {
  game.players[data.id].val = data.button;

}

function processKey(data) {
  game.setVelocity(data.id, data.x * velScale / 2 * mult, data.y * velScale / 2 * mult);
}

////////////
// Game
// This simple placeholder game makes use of p5.play
class Game {
  constructor(w, h) {
    this.enemyTypes = [
      {hp:1,sp:1,round:0,color:color(0,255,0)},
      {hp:5,sp:1,round:5,color:color(0,255,255)},
      {hp:10,sp:1,round:10,color:color(255,255,0)},
      {hp:25,sp:1,round:25,color:color(255,100,0)},
      {hp:50,sp:1,round:50,color:color(255,0,0)}
    ];
    this.w = w;
    this.h = h;
    this.players = {};
    this.numPlayers = 0;
    this.maxBullets = 200;
    this.numDeaths = 0;
    this.round = -1;
    this.id = 0;
    this.ripples = new Ripples();
    this.walls = new Group();
    this.enemies = new Group();
    this.bullets = new Group();
    this.assets = [];
    this.going = false;
    this.dead = [];
    this.upgrades = [random(upgrades),random(upgrades),random(upgrades)];
    this.enemyAmount = 10;
    this.enemySize = 80 * scale;
    //Put all setup stuff here//
    this.walls.add(createSprite(-5, height / 2 + 10, 10, height + 20));
    this.walls.add(createSprite(width / 2 + 10, -5, width + 20, 10));
    this.walls.add(createSprite(width + 5, height / 2 + 10, 10, height + 20));
    this.walls.add(createSprite(width / 2 + 10, height + 5, width + 20, 10));
  }
  addBullet(data,type) {
    let id = data.id;
    let types = [
      "forward",
      "backward",
      "left",
      "right",
      "angled"
    ]
    if (this.dead.indexOf(id) === -1 && this.players[id].bulletsLeft[types.indexOf(type)]>0 && this.players[id].ammoAmount > 0 && this.players[id].reloadTimer <= 0) {
      let x = data.aimX;
      let y = data.aimY;
      if(type == "backward"){
        x*=-1;
        y*=-1;
      }
      if(type == "right"){
        let saved = y;
        y = -1*x;
        x = saved;
      }
      if(type == "left"){
        let saved = y;
        y = x;
        x = -1*saved;
      }
      let a = atan2(-y, x);
      if(type == "angled"){
        a += random(-PI/18,PI/18);
        let nx = x*cos(a) - y*sin(a);
        let ny = x*sin(a) + y*cos(a);
        x = nx;
        y = ny;
      }
      x*=mult;
      y*=mult;
      x+=this.players[id].position.x;
      y+=this.players[id].position.y;
      let bullet = createSprite(x, y, this.players[id].stats.bulletSize*mult, this.players[id].stats.bulletSize*mult);
      bullet.shapeColor = color(0,0,0);
      bullet.velocity.x = 5 * cos(a) * mult;
      bullet.velocity.y = 5 * sin(a) * mult;
      bullet.owner = id;
      this.bullets.add(bullet);
      if(this.bullets.length > this.maxBullets){
        this.bullets[0].remove();
      }
      this.players[id].bulletsLeft[types.indexOf(type)]--;
      if(this.players[id].bulletsLeft[types.indexOf(type)]>0){
        if(type==="angled"){
          game.addBullet(data,type)
        }else{
          setTimeout(()=>(game.addBullet(data,type)),100);
        }
      }
    }
  }
  add(id, x, y, w, h) {
    this.players[id] = createSprite(x*mult, y*mult, w*mult, h*mult);
    this.players[id].id = "p" + this.id;
    this.players[id].setCollider("rectangle", 0, 0, w*mult, h*mult);
    this.players[id].color = color(255, 255, 255);
    this.players[id].shapeColor = color(255, 255, 255);
    this.players[id].scale = 1;
    this.players[id].mass = 1;
    this.players[id].name = "";
    this.players[id].money = 0;
    this.players[id].ready = false;
    this.players[id].lives = 1;
    this.players[id].reloadTimer = 0;
    this.players[id].ammoAmount = 10;
    this.players[id].upgradeTimer = 3;
    this.players[id].bulletsLeft = [
      1,
      0,
      0,
      0,
      0
    ]
    this.players[id].stats = {
      speed:1,
      bulletNumForward:1,
      bulletNumBackward:0,
      bulletNumLeft:0,
      bulletNumRight:0,
      angledBullets:0,
      reviveTime:1,
      bulletSize:5,
      lives:1,
      reloadSpeed:1,
      ammoAmount:10
    };
    this.players[id].upgradeAmounts = Array.from({length:upgrades.length},()=>(0)).slice();
    this.players[id].draw = function() {
      fill(this.shapeColor);
      ellipseMode(CENTER);
      ellipse(0, 0, this.width, this.height);
      fill(0);
      textSize(20*mult);
      textAlign(CENTER,BOTTOM)
      text(this.name,0,-this.height/2);
    }
    if(this.going){
      this.dead.push(id);
      this.players[id].lives = 0;
    }
    this.players[id].ping = 0;
    this.id++;
    this.numPlayers++;
  }

  draw() {
    for(let id of Object.keys(this.players)){
      if(this.players[id].ammoAmount<=0&&this.players[id].reloadTimer <= 0){
        this.players[id].reloadTimer = 2;
      }else if(this.players[id].ammoAmount<=0){
        this.players[id].reloadTimer-=this.players[id].stats.reloadSpeed*deltaTime/1000;
        if(this.players[id].reloadTimer<=0){
          this.players[id].ammoAmount = this.players[id].stats.ammoAmount;
        }
      }
    }
    if(this.dead.length === this.numPlayers && this.numPlayers!==0){
      this.round = -1;
      enemySpeed = 1/enemySpeedMultiplier;
      this.enemies.removeSprites();
      for(let k of Object.keys(this.players)){
        this.players[k].money = 0;
        this.players[k].stats = {
          speed:1,
          bulletNumForward:1,
          bulletNumBackward:0,
          bulletNumLeft:0,
          bulletNumRight:0,
          angledBullets:0,
          reviveTime:1,
          bulletSize:5,
          lives:1,
          reloadSpeed:1,
          ammoAmount:10
        };
        this.players[k].upgradeAmounts = Array.from({length:upgrades.length},()=>(0)).slice();
      }
    }
    if(this.enemies.size()===0){
      this.dead = [];
      for(let k of Object.keys(this.players)){
        this.players[k].lives = this.players[k].stats.lives;
      }
      if(this.going){
        this.upgrades = [random(upgrades),random(upgrades),random(upgrades)];
      }
      this.going = false;
    }
    background('green');
    fill(150, 100, 50);
    rectMode(CENTER);
    rect(width / 2, height / 2, width * 0.93, height * 0.9);
    rectMode(CORNER);
    fill(255);
    textSize(30*mult);
    textAlign(CENTER,CENTER);
    text("Round: "+this.round+", Enemies Left: "+this.enemies.size(),width/2,height-20*mult);
    textAlign(RIGHT,TOP);
    textSize(10*mult);
    text("Current Global Highscore: "+highscore+"\nCurrent Global Death Count: "+numDeaths,width,0)
    textAlign(LEFT,TOP);
    let keys = Object.keys(this.players);
    for (let i = 0; i < keys.length; i++) {
      if(this.dead.indexOf(keys[i])===-1){
        if (this.players[keys[i]].overlap(this.enemies)&&this.dead.indexOf(keys[i])===-1) {
          if(! this.players[keys[i]].touchingEnemy){
            this.players[keys[i]].touchingEnemy = 2;
            this.players[keys[i]].lives--;
            if(this.players[keys[i]].lives<=0){
              this.dead.push(keys[i]);
              this.players[this.dead[this.dead.length-1]].reviveTimer = 3;
              this.numDeaths++;
            }
          }else{
            this.players[keys[i]].touchingEnemy -= deltaTime/1000;
            this.players[keys[i]].touchingEnemy = Math.max(0,this.players[keys[i]].touchingEnemy);
          }
        }else{
          this.players[keys[i]].touchingEnemy = undefined;
        }
      }
      this.players[keys[i]].collide(this.walls);
    }

    for(let d = 0; d < this.dead.length; d++){
      for(let p of Object.keys(this.players)){
        if(p!==this.dead[d]){
          if(this.players[p].overlap(this.players[this.dead[d]])){
            this.players[this.dead[d]].reviveTimer -= this.players[p].stats.reviveTime*deltaTime/1000;
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
      let spd = mult / sqrt(targetX * targetX + targetY * targetY);
      targetX *= spd * enemySpeed * this.enemies[e].sp;
      targetY *= spd * enemySpeed * this.enemies[e].sp;
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
    for(let w = 0; w < this.walls.length; w++){
      for(let b = 0; b < this.bullets.length; b++){
        this.walls[w].overlap(this.bullets[b],this.hitWall);
      }
    }
    //this.enemies.displace(this.enemies);
    this.enemies.collide(this.walls);
    this.checkBounds();
    if(!this.going){
      noStroke();
      fill(0,255,0);
      rect(width/2-40*mult,height/2-40*mult,80*mult,80*mult);
      fill(150,120,0);
      rect(width/2+50*mult,height/2+50*mult,80*mult,80*mult);
      rect(width/2-40*mult,height/2+50*mult,80*mult,80*mult);
      rect(width/2-130*mult,height/2+50*mult,80*mult,80*mult);
      fill(0);
      textSize(25*mult);
      textAlign(CENTER,CENTER);
      text("Ready",width/2,height/2);
      textSize(15*mult);
      text(this.upgrades[2].title,width/2-90*mult,height/2+90*mult);
      text(this.upgrades[1].title,width/2,height/2+90*mult);
      text(this.upgrades[0].title,width/2+90*mult,height/2+90*mult);
      let start = true;
      for(let k of Object.keys(this.players)){
        let x = this.players[k].position.x;
        let y = this.players[k].position.y;
        if(x>width/2-40*mult&&x<width/2+40*mult&&y>height/2-40*mult&&y<height/2+40*mult){
          this.players[k].ready = true;
        }else{
          this.players[k].ready = false;
        }
        if(y>height/2+50*mult&&y<height/2+130*mult){
          if(x>width/2+50*mult&&x<width/2+130*mult){
            this.players[k].upgradeTimer-=deltaTime/1000;
            if(this.players[k].upgradeTimer<=0){
              for(let k2 of Object.keys(this.players)){
                this.getUpgrade(k2,this.upgrades[0].id,this.upgrades[0].val,this.upgrades[0].cost,0,upgrades.indexOf(this.upgrades[0]));
              }
            }
          }else if(x>width/2-40*mult&&x<width/2+40*mult){
            this.players[k].upgradeTimer-=deltaTime/1000;
            if(this.players[k].upgradeTimer<=0){
              for(let k2 of Object.keys(this.players)){
                this.getUpgrade(k,this.upgrades[1].id,this.upgrades[1].val,this.upgrades[1].cost,1,upgrades.indexOf(this.upgrades[1]));
              }
            }
          }else if(x>width/2-130*mult&&x<width/2-50*mult){
            this.players[k].upgradeTimer-=deltaTime/1000;
            if(this.players[k].upgradeTimer<=0){
              for(let k2 of Object.keys(this.players)){
                this.getUpgrade(k,this.upgrades[2].id,this.upgrades[2].val,this.upgrades[2].cost,2,upgrades.indexOf(this.upgrades[2]));
              }
            }
          }else{
            this.players[k].upgradeTimer = 3;
          }
        }else{
          this.players[k].upgradeTimer = 3;
        }
        if(!this.players[k].ready){
          start = false;
        }
      }
      if(start && Object.keys(this.players).length>0){
        this.going = true;
        this.round++;
        enemySpeed = pow(enemySpeedMultiplier,this.round);
        this.enemyAmount = 10+this.round*2;
        for (let i = 0; i < this.enemyAmount; i++) {
          let n = random(width*2+height*2);
          let enemy;
          if(n<height){
            enemy = createSprite(20*mult,Math.random() * height, this.enemySize*mult,this.enemySize*mult);
          }else if(n<height+width){
            enemy = createSprite(Math.random() * width,20*mult, this.enemySize*mult,this.enemySize*mult);
          }else if(n<2*height+width){
            enemy = createSprite(width-20*mult,Math.random() * height, this.enemySize*mult,this.enemySize*mult);
          }else if(n<2*height+2*width){
            enemy = createSprite(Math.random()*width,height-20*mult, this.enemySize*mult,this.enemySize*mult);
          }
          enemy.bounty = 75;
          let possibleEnemies = [];
          for(let t = 0; t < this.enemyTypes.length; t++){
            if(this.enemyTypes[t].round<=this.round){
              possibleEnemies.push(this.enemyTypes[t]);
            }
          }
          let amnt = this.enemyAmount/possibleEnemies.length;
          let enemyI = floor(i/amnt);
          enemy.hp = possibleEnemies[enemyI].hp;
          enemy.sp = possibleEnemies[enemyI].sp;
          enemy.shapeColor = possibleEnemies[enemyI].color;
          this.enemies.add(enemy);
        }
      }
    }
    this.bullets.draw();
    this.ripples.draw();
    this.enemies.draw();
    drawSprites();
  }

  getUpgrade(playerID,upgradeID,upgradeValue,upgradeCost,upgradeIndex,upgradeListIndex){
    upgradeValue*=1;
    let player = this.players[playerID];
    if(player.money>=upgradeCost*pow(2,player.upgradeAmounts[upgradeListIndex])){
      player.money-=upgradeCost*pow(2,player.upgradeAmounts[upgradeListIndex]);
      player.upgradeAmounts[upgradeListIndex]++;
      if(upgradeID==undefined){
        return;
      }else if(upgradeID==="speed"){
        player.stats.speed*=upgradeValue;
      }else if(upgradeID==="extraLife"){
        player.stats.lives+=upgradeValue;
      }else if(upgradeID==="bulletSize"){
        player.stats.bulletSize+=upgradeValue;
      }else if(upgradeID==="backwardsShot"){
        player.stats.bulletNumBackward+=upgradeValue;
      }else if(upgradeID==="shot"){
        player.stats.bulletNumForward+=upgradeValue;
      }else if(upgradeID==="leftShot"){
        player.stats.bulletNumLeft+=upgradeValue;
      }else if(upgradeID==="rightShot"){
        player.stats.bulletNumRight+=upgradeValue;
      }else if(upgradeID==="angleShot"){
        player.stats.angledBullets+=upgradeValue;
      }else if(upgradeID==="reviveTime"){
        player.stats.reviveTime*=upgradeValue;
      }else if(upgradeID==="ammoAmount"){
        player.stats.ammoAmount*=upgradeValue;
      }else if(upgradeID==="reloadSpeed"){
        player.stats.reloadSpeed*=upgradeValue;
      }
      this.upgrades[upgradeIndex] = {title:"Empty",cost:0,id:undefined}
    }
  }

  hitEnemy(enemy, bullet) {
    enemy.hp--;
    if(enemy.hp<=0){
      game.players[bullet.owner].money+=enemy.bounty;
      enemy.remove();
    }
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
  }

  remove(id) {
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
    textSize(16*mult);
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
      this.players[id].velocity.x = velx * scale * this.players[id].stats.speed;
      this.players[id].velocity.y = vely * scale * this.players[id].stats.speed;
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
        this.enemies[e].position.x = this.w - 20;
      }

      if (this.enemies[e].position.x > this.w) {
        this.enemies[e].position.x = 20;
      }

      if (this.enemies[e].position.y < 0) {
        this.enemies[e].position.y = this.h - 20;
      }

      if (this.enemies[e].position.y > this.h) {
        this.enemies[e].position.y = 20;
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