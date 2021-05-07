/*
p5.multiplayer - CLIENT

This 'client' sketch is intended to be run in either mobile or 
desktop browsers. It sends a basic joystick and button input data 
to a node server via socket.io. This data is then rerouted to a 
'host' sketch, which displays all connected 'clients'.

Navigate to the project's 'public' directory.
Run http-server -c-1 to start server. This will default to port 8080.
Run http-server -c-1 -p80 to start server on open port 80.

*/ 

////////////
// Network Settings
// const serverIp      = 'https://yourservername.herokuapp.com';
// const serverIp      = 'https://yourprojectname.glitch.me';

function isMobileDevice() {
    var check = false;
    (function(a){if(/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(a)||/1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0,4))) check = true;})(navigator.userAgent||navigator.vendor||window.opera);
    return check;
};

const mobile = isMobileDevice();
const serverIp      = 'https://gameserver3.tylerbalota.repl.co/';
const serverPort    = '3000';
const local         = false;   // true if running locally, false
                              // if running on remote server

// Global variables here. ---->

// Initialize GUI related variables
let gui         = null;
let joystick    = null;
let joystickRes = 4;
let thisJ       = {x: 0, y: 0};
let prevJ       = {x: 0, y: 0};
let gamestate   = {};

// Initialize Game related variables
let playerColor;
let playerColorDim;

// <----

function preload() {
  setupClient();
}

function setup() {
  createCanvas(windowWidth, windowHeight);

  // Client setup here. ---->
  
  gui = createGui();

  setPlayerColors();
  setupUI();

  // <----

  // Send any initial setup data to your host here.
  /* 
    Example: 
    sendData('myDataType', { 
      val1: 0,
      val2: 128,
      val3: true
    });

     Use `type` to classify message types for host.
  */
  sendData('name',{name:playerName});
  sendData('playerColor', { 
    r:col[0],g:col[1],b:col[2]
  });
  console.log(col);
} 

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

let ePressed = false;
let money = 0;

function draw() {
  background(0);
  let tx = 0;
  let ty = 0;
  noStroke();
  push();
  translate(width-jX-jW/2,jY+jH/2);
  if(gamestate.players){
    for(let key of Object.keys(gamestate.players)){
      if(gamestate.players[key].name===playerName){
        tx = gamestate.players[key].x;
        ty = gamestate.players[key].y;
        money = gamestate.players[key].money;
      }
    }
  }
  if(!gamestate.going){
    fill(0,0,255);
    rect(gamestate.width/2-40-tx,gamestate.height/2-40-ty,80,80);
    fill(0);
    textSize(25);
    textAlign(CENTER,CENTER);
    text("Ready",gamestate.width/2-tx,gamestate.height/2-ty);
  }
  if(gamestate.players){
    for(let key of Object.keys(gamestate.players)){
      if(gamestate.players[key].dead){
        fill(255,0,0);
      }else{
        fill(0,255,0);
      }
      circle((gamestate.players[key].x-tx),(gamestate.players[key].y-ty),15);
    }
  }
  if(gamestate.enemies){
    fill(255,255,0);
    for(let key of Object.keys(gamestate.enemies)){
      circle((gamestate.enemies[key].x-tx),(gamestate.enemies[key].y-ty),20);
    }
  }
  stroke(255);
  line(-tx,-ty,-tx,gamestate.height-ty);
  line(-tx,-ty,gamestate.width-tx,-ty);
  line(gamestate.width-tx,-ty,gamestate.width-tx,gamestate.height-ty);
  line(-tx,gamestate.height-ty,gamestate.width-tx,gamestate.height-ty);
  pop();
  fill(0);
  noStroke();
  rect(0,0,width-jX-jW,height);
  rect(0,0,width,jY);
  rect(0,height-jY,width,jH);
  rect(width-jX,0,jX,height);
  if(isClientConnected(display=true)) {
    // Client draw here. ---->
    fill(255);
    textAlign(RIGHT,BOTTOM);
    text("Money: "+money,width,height);
    drawGui();

    // <---
  }
  
  let keyVel = {x:0,y:0}
  if(!jToggle){
    if(keyIsDown(68)||keyIsDown(39)){
      keyVel.x = 1;
    }
    if(keyIsDown(65)||keyIsDown(37)){
      keyVel.x = -1;
    }
    if(keyIsDown(87)||keyIsDown(38)){
      keyVel.y = -1;
    }
    if(keyIsDown(83)||keyIsDown(40)){
      keyVel.y = 1;
    }
    let multiplyer = 1/sqrt(keyVel.x*keyVel.x+keyVel.y*keyVel.y);
    if(multiplyer===Infinity){
      multiplyer = 1;
    }
    if(keyIsDown(16)){
      multiplyer*=2;
      if(keyVel.x!==0||keyVel.y!==0){
        sendData('button', {button:true});
      }
    }
    keyVel.x*=multiplyer;
    keyVel.y*=multiplyer;
    sendData("key",keyVel);
  }
  if(connected){
    let mx = mouseX;
    let my = mouseY;
    for(let t = 0; t < touches.length; t++){
      let tx = touches[t].x;
      let ty = touches[t].y;
      if(tx>width-jX-jW&&ty>jY&&tx<width-jX&&ty<jY+jH){
        mx = tx;
        my = ty;
        break;
      }
    }
    noFill();
    stroke(playerColor);
    strokeWeight(2);
    rect(width-jX-jW,jY,jW,jH,10);
    let rmx = mx-(width-jX-jW)-jW/2;
    let rmy = my-jY-jH/2;
    if(abs(rmx)<jW/2&&abs(rmy)<jH/2&&(mouseIsPressed||touches.length!==0)&&!mousePressed){
      fill(playerColorDim);
      circle(width-jX-jW+jW/2+rmx,jY+jH/2+rmy,20);
      if(mouseIsPressed&&!mousePressed){
        let mult = 1/sqrt(rmx*rmx+rmy*rmy)
        let data = {aimX:rmx*mult,aimY:-rmy*mult};
        sendData('shoot',data);
        mousePressed = true;
      }
      mousePressed = true;
    }else if(!(abs(rmx)<jW/2&&abs(rmy)<jH/2&&(mouseIsPressed||touches.length!==0))){
      mousePressed = false;
    }
  }
}

let mousePressed = false;

// Messages can be sent from a host to all connected clients
function onReceiveData (data) {
  // Input data processing here. --->

  if (data.type === 'timestamp') {
    print(data.timestamp);
  }else if(data.type === 'gameState'){
    gamestate = {players:data.players,enemies:data.enemies,width:data.width,height:data.height,going:data.going};
  }

  // <----

  /* Example:
     if (data.type === 'myDataType') {
       processMyData(data);
     }

     Use `data.type` to get the message type sent by host.
  */
}

let jToggle = mobile;

////////////
// GUI setup
function setPlayerColors() {
  let hue = random(0, 360);
  colorMode(HSB);
  playerColor = color(hue, 100, 100);
  playerColorDim = color(hue, 100, 75);
  colorMode(RGB);
  playerColorDim = color(col[0],col[1],col[2]);
  playerColor = color(col[0]/2,col[1]/2,col[2]/2);
}

let jX, jY, jW, jH, bX, bY, bW, bH;

function setupUI() {
  // Rudimentary calculation based on portrait or landscape 
  if (width < height) {
    jX = 0.05*width;
    jY = 0.05*height;
    jW = 0.9*width;
    jH = 0.9*width;
    
    bX = 0.05*windowWidth;
    bY = 0.75*windowHeight+windowHeight/2;
    bW = 0.9*windowWidth;
    bH = 0.2*windowHeight/2;
  }
  else {
    jX = 0.05*width;
    jY = 0.05*height;
    jW = 0.9*height;
    jH = 0.9*height;
    
    bX = 0.75*windowWidth;
    bY = 0.05*windowHeight+windowHeight/2;
    bW = 0.2*windowWidth;
    bH = 0.8*windowHeight/2;
  }
  
  // Create joystick and button, stylize with player colors
  if(mobile){
    joystick = createJoystick("Joystick", jX, jY, jW, jH);
    joystick.setStyle({
      handleRadius:     joystick.w*0.2, 
      fillBg:           color(0), 
      fillBgHover:      color(0), 
      fillBgActive:     color(0), 
      strokeBg:         playerColor, 
      strokeBgHover:    playerColor, 
      strokeBgActive:   playerColor, 
      fillHandle:       playerColorDim, 
      fillHandleHover:  playerColorDim, 
      fillHandleActive: playerColor,
      strokeHandleHover:  color(255),
      strokeHandleActive: color(255)
    });
    joystick.onChange = onJoystickChange;  
  }
}

////////////
// Input processing
function onJoystickChange() { 
  if(jToggle){ 
    thisJ.x = floor(joystick.val.x*joystickRes)/joystickRes;
    thisJ.y = floor(joystick.val.y*joystickRes)/joystickRes;
    
    if (thisJ.x != prevJ.x || thisJ.y != prevJ.y) {
      let data = {
        joystickX: thisJ.x,
        joystickY: thisJ.y
      }
      sendData('joystick', data);
    }
    
    prevJ.x = thisJ.x;
    prevJ.y = thisJ.y;
  }
}

function toggleJoystick(){
  jToggle = !jToggle;
  sendData('key',{x:0,y:0})
}

function onButtonPress() {
  let data = {
    button: button.val,
    aimX: aimStick.val.x,
    aimY: aimStick.val.y
  }
  
  sendData('shoot', data);
}

/// Add these lines below sketch to prevent scrolling on mobile
function touchMoved() {
  // do some stuff
  return false;
}