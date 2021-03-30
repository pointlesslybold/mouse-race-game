//main canvas and its context
var mainCanvas, ctx;

//mechanics data
var totalLoad = 0, smashArray = [];

//stores randomly picked images and image sequences, such as character sprites, clouds, etc.
var graphicsPools = {};

//functional images
var graphics = {};

//coordinates and sizes
var sizes = {}, coors = {};

//gameplay data
var game = {}, regions = {}, storage = {}, musicList = {};
var speedUnit, spriteChangingTimer, itemIndex, tickTimer, currentPowerup, scoreTable = [];

//object coordinates storage
var flagCoordinates = [], cloudCoordinates = [], laneCoords = [];
var status = "Paused";

//player controls
var playerHasControl = false, collision = false, bonusTrigger = false;
var itemActive = false, currentItem = -1, waveModifier, waveVector = 3, displayMenu = true;

//gameplay entities
var flags, clouds, laneObstacles = [];
var powerups = {}, powerupTimers = {};
var itemKinds = ["invincible", "halfSpeed", "onlyOneObstacle"];

//speeds of background elements
var scrollSpeed = {
  border: 1,
  flags: 0.75,
  clouds: 0.5
};

var defaultScrollSpeed = {
  border: 4,
  flags: 2,
  clouds: 1
};

//strings
var howToPlayDesktop = "Use arrows (Up and Down) to shift your character from one lane to another!";
var howToPlayMobile = "Swipe up and down to shift your character from one lane to another!"

//game logic
var lives, score, gameSpeed, lanes, itemsRarity;

//graphic options
var skyColorMain = "#0F4FFF";
var laneColor = "#FFFFFF";
var menuColor = "#6444D4";

var landColors = [];
landColors[0] = "#FF6A21";
landColors[1] = "#FF8E3D";

var muteColor = "#240464";
var textColor = "#FFF2F1";

var myFont = "sans-serif";
var fontFamily = "https://fonts.googleapis.com/css?family=Lilita+One";

function prepareGame(){
  //game settings for control
  setDimensions();
  
  //setting game defaults
  lanes = 3;
  gameSpeed = 1;
  game.isOver = true;
  game.currentScreen = "title";
  game.settings = {};
  game.settings.volume = 1;

  //creating canvas
  mainCanvas = document.createElement("CANVAS");
  mainCanvas.width = sizes.fullWidth;
  mainCanvas.height = sizes.fullHeight;
  document.body.appendChild(mainCanvas);

  //initializing canvas
  if (mainCanvas.getContext){
    ctx = mainCanvas.getContext("2d");
    initializeCanvas();
    draw();
  }

  window.addEventListener("resize", function(){
    initializeCanvas();
  });
  
  mainCanvas.addEventListener('click', function(evt) {
    var mousePos = getMousePos(mainCanvas, evt);

    //check if clicked in pause rectangle
    if(isInside(mousePos, regions.pause)) {
      if(game.isOver == false){
        musicList.pause.pause();
        musicList.pause.currentTime = 0;
        musicList.pause.play();
        game.isPaused = !game.isPaused;
        if(game.isPaused){
          playerHasControl = false;
          storage.gameSpeed = gameSpeed;
          gameSpeed = 0;
          musicList.background.pause();
        }
        else{
          playerHasControl = true;
          gameSpeed = storage.gameSpeed; 
          musicList.background.play();
        }
        for(var music of Object.values(musicList)){
          music.volume = game.settings.volume;
        }
        setspeedUnit();
      }
    }
    else if(isInside(mousePos, regions.titleStart)){
      if(game.currentScreen == "title"){
        for(var music of Object.values(musicList)){
          music.play();
          music.pause();
          music.currentTime = 0;
          game.currentScreen = "info";
          showScreen("info");
        }
      }
    }
    else if(isInside(mousePos, regions.mute)){
      if((game.currentScreen == "title")||(game.isPaused)||(game.isOver)){
        if(game.settings.volume == 0){
          game.settings.volume = 1;
          musicList.background.volume = 0.5;
        }
        else{
          game.settings.volume = 0;
        }
      }
    }
  }, false);
}

//main drawing loop
function draw(){
  if(waveModifier == null){
    waveModifier = 5; 
  }
  if((waveModifier > 100)||(waveModifier < 0)){
    waveVector = -1 * waveVector;
  }
  if(gameSpeed > 0){
    waveModifier += waveVector;
  }
  
  ctx.clearRect(0,0, mainCanvas.width, mainCanvas.height);
  drawBg();
  drawParallax();
  drawGr();
  drawLanes();
  if(game.currentScreen == "game"){
    //gameplay drawing process
    drawObstacles();
    drawPlayer();
    drawLives();
    drawScore();
    //smashing animations
    if(smashArray.length>0){
      drawSmashingAnimation();
    }
    //chains
    if((game.chainSprIndex>-1)&&(bonusTrigger)){
      drawBonus();
    }
    //powerups
    if(Object.values(powerups).indexOf(true)>-1){
      drawPowerUps();
    }
    drawPauseVeil();
    drawMenu();
  }
  else if(game.currentScreen == "title"){
    drawTitle();
  }
  if((game.currentScreen == "title")||(game.isPaused)){
    if(game.settings.volume == 0){
      drawImageButton(regions.mute, graphics.muted);
    }
    else{
      drawImageButton(regions.mute, graphics.unmuted);
    }
  }
  window.requestAnimationFrame(draw);
}

//titleScreen
function drawTitle(){
  ctx.save();
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = muteColor;
  ctx.fillRect(0, 0, mainCanvas.width, mainCanvas.height); 
  ctx.restore();
  var titleHeight = sizes.heightUnit * 3;
  var titleWidth = titleHeight * graphics.logo.width/graphics.logo.height;
  ctx.drawImage(
    graphics.logo,
    mainCanvas.width/2 - titleWidth/2,
    mainCanvas.height/4 - titleHeight/2,
    titleWidth,
    titleHeight
  );
  
  ctx.fillStyle = menuColor; 
  ctx.beginPath();
  ctx.roundedRectangle(
    regions.titleStart.x,
    regions.titleStart.y,
    regions.titleStart.width,
    regions.titleStart.height,
    Math.floor(sizes.heightUnit/6)
  );
  ctx.fill();
  
  ctx.fillStyle = textColor;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = Math.floor(sizes.heightUnit/2) + "px " + myFont; 
  ctx.fillText(
    "START",
    Math.floor(regions.titleStart.x + regions.titleStart.width/2),
    Math.floor(regions.titleStart.y + regions.titleStart.height/2)
  );
}

//drawing score
function drawScore(){
  ctx.fillStyle = menuColor; 
  ctx.beginPath();
  ctx.roundedRectangle(
    20,
    40 + sizes.heightUnit,
    sizes.heightUnit * 3,
    sizes.heightUnit,
    Math.floor(sizes.heightUnit/6)
  );
  ctx.fill();
  
  ctx.fillStyle = textColor;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.font = Math.floor(sizes.heightUnit * 2/3) + "px " + myFont; 
  if(score){
    ctx.fillText(score,
      Math.round(20 + sizes.heightUnit/3), 40 + Math.floor(sizes.heightUnit*3/2)
    );
  }
}

//drawing powerups
function drawPowerUps(){
  for(var i=0; i<3; i++){
    if(powerups[itemKinds[i]]){
      if(powerupTimers[itemKinds[i]]<3){
        ctx.save();
        ctx.globalAlpha = Math.min(Math.max(roundTwo(waveModifier/100), 0), 1);
      }
      ctx.drawImage(
        graphicsPools.items[i], coors.gameAreaWidth - ((20 + sizes.heightUnit) * (i+1)), sizes.heightUnit + 40, sizes.heightUnit, sizes.heightUnit
      )
      if(powerupTimers[itemKinds[i]]<3){
        ctx.restore();
      }
    }
  }
}

//drawing congratulations
function drawBonus(){
  coors.congrats = Math.round(coors.congrats - sizes.congratsH/8);
  if(coors.congrats < coors.congratsMax){
    bonusTrigger = false;
  }
  ctx.drawImage(
    graphicsPools.congrats[game.chainSprIndex],
    coors.charX + (sizes.charW - sizes.congratsW)/2,
    coors.congrats,
    sizes.congratsW,
    sizes.congratsH
  );
}

//drawing smashing animations
function drawSmashingAnimation(){
  for(var i=0; i<smashArray.length; i++){
    if(smashArray[i]["y"]>mainCanvas.height){
      smashArray.splice(i, 1);
    }
    else{
      if(smashArray[i]["rt"] == null){
        smashArray[i]["rt"] = 0;
      }
      else if(smashArray[i]["rt"] >= 359){
        smashArray[i]["rt"] = 0;
      }
      else{
        smashArray[i]["rt"] += 20;
      }
      ctx.save();
      ctx.translate(
        smashArray[i]["x"] + sizes.obsW/2,
        smashArray[i]["y"]
      );
      ctx.rotate(smashArray[i]["rt"]*Math.PI/180);
      ctx.drawImage(
        graphics.barrier,
        -1 * Math.floor(sizes.obsW/2),
        -1 * Math.floor(sizes.obsH/2),
        sizes.obsW,
        sizes.obsH
      );
      smashArray[i]["x"] = Math.floor(smashArray[i]["x"] + sizes.obsH/8);
      if(smashArray[i]["x"] < coors.gameAreaWidth/2){
        smashArray[i]["y"] = Math.floor(smashArray[i]["y"] - sizes.obsH/8);
      }
      else{
        smashArray[i]["y"] = Math.floor(smashArray[i]["y"] + sizes.obsH/8);
      }
      ctx.restore();
    }
  }
}

//drawing the cute mouse
function drawPlayer(){
  if(coors.charX < sizes.obsW){
    coors.charX += speedUnit;
  }
  else if(coors.charX > sizes.obsW){
    coors.charX = sizes.obsW;
  }
  coors.charY = laneCoords[game.lane] - sizes.charH - sizes.lane/2;
  
  ctx.fillStyle = "rgba(0, 0, 0, 0.25)";
  ctx.roundedRectangle(
    coors.charX,
    coors.charY + sizes.charH - 4,
    sizes.charW,
    8,
    4
  );
  ctx.fill();
  
  ctx.drawImage(
    game.sprite,
    Math.floor(coors.charX),
    Math.floor(coors.charY - (waveModifier/10)),
    sizes.charW,
    sizes.charH
  );

  if(powerups.invincible == true){
    var shieldX = Math.floor(coors.charX + (sizes.charW - sizes.shield)/2);
    var shieldY = Math.floor(coors.charY + (sizes.charH - sizes.shield)/2);
    ctx.drawImage(
      graphics.powerup_shield,
      shieldX,
      shieldY,
      sizes.shield,
      sizes.shield
    );
  }
}

//drawing parallax background decorations
function drawParallax(){
  drawClouds();
  drawFlags();
  drawBorder();
}

//drawing pause muteness
function drawPauseVeil(){
  if(game.isPaused){
    ctx.save();
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = muteColor;
    ctx.fillRect(0, 0, mainCanvas.width, mainCanvas.height); 
    ctx.restore();
    
    ctx.fillStyle = textColor;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = Math.floor(sizes.heightUnit/2) + myFont; 
    ctx.fillText(status, mainCanvas.width / 2, mainCanvas.height / 2);
    if(game.isOver){
      ctx.font = Math.floor(sizes.heightUnit/3) + myFont; 
      ctx.fillText("You scored: " + score, mainCanvas.width / 2, (mainCanvas.height / 2) + 72);
    }
  }
}

//drawing mouse icons
function drawLives(){
  ctx.fillStyle = menuColor; 
  ctx.beginPath();
  ctx.roundedRectangle(
    20,
    20,
    sizes.heightUnit * 3,
    sizes.heightUnit,
    Math.floor(sizes.heightUnit/6)
  );
  ctx.fill();
  
  ctx.drawImage(
    graphics.life, 20, 20, sizes.heightUnit, sizes.heightUnit
  )
  
  ctx.fillStyle = textColor;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.font = "bold " + Math.floor(sizes.heightUnit * 2/3) + "px " + myFont; 
  if(lives != undefined){
    ctx.fillText("x" + lives,
    Math.floor(sizes.heightUnit * 1.75), 20 + Math.floor(sizes.heightUnit/2)
    );
  }
}

//drawing menu
function drawMenu(){
  if(displayMenu == true){
    //draw pause button
    ctx.fillStyle = menuColor; 
    ctx.beginPath();
    ctx.lineWidth = 4;
    if(!game.isOver){
      if(game.isPaused){
        drawImageButton(regions.pause, graphics.menu_play);
      }
      else{
        drawImageButton(regions.pause, graphics.menu_pause);
      }
    }
  }
}

//drawing buttons
function drawImageButton(region, buttonImg){
  ctx.fillStyle = menuColor; 
  ctx.beginPath();
  ctx.lineWidth = 4;
  ctx.roundedRectangle(
    region.x,
    region.y,
    region.width,
    region.height,
    Math.floor(sizes.heightUnit/6)
  );
  ctx.fill();
  ctx.stroke();
  ctx.drawImage(
    buttonImg,
    region.x + 10,
    region.y + 10,
    region.width - 20,
    region.height -20
  );
}

//drawing obstacles
function drawObstacles(){
  if(!coors.obsX){
    seedObstacles();
    coors.obsX = coors.gameAreaWidth;
  }
  for(var i=0; i<lanes; i++){
    if(laneObstacles[i]){
      ctx.drawImage(
        graphics.barrier, coors.obsX, laneCoords[i] - sizes.obsH, sizes.obsW, sizes.obsH
      );
    }
    else if(i == itemIndex){
      //only show items when they're not picked up
      if(itemActive == false){
        if(currentItem >= 0){
          var itemImage;
          if(currentItem < 3){
            itemImage = graphicsPools.items[currentItem];
          }
          else{
            itemImage = graphics.life
          }
          ctx.drawImage(
            itemImage,
            coors.obsX + (sizes.obsW - sizes.item)/2,
            laneCoords[i] - sizes.obsH + (waveModifier/100 * sizes.item * 0.25),
            sizes.item,
            sizes.item
          )
        }
      }
    }
  }
  if(coors.obsX < (-1)*sizes.obsW){
    seedObstacles();
    coors.obsX = coors.gameAreaWidth;
    //allowing items to be shown again
    itemActive = false;
  }
  else{
    coors.obsX -= speedUnit;
  }
  coors.obsX = Math.floor(coors.obsX);
  
  checkCollision();
}

//drawing obstacle hitboxes
function drawObstacleHitboxes(){
  ctx.fillStyle = "rgba(0, 0, 0, 0.25)";
  ctx.fillRect(coors.obsX, coors.groundBasis, sizes.obsW, coors.gameAreaHeight);
}

//seeding obstacles
function seedObstacles(){
  game.chainPossible = true;
  game.obstacleCount++;
  if(game.obstacleCount % game.obstacleEach == 0){
    gameSpeed++;
    setspeedUnit();
  }
  var freePass = randomNumber(0, lanes - 1);
  var obstacleIndex = randomNumber(0, lanes - 1);
  var rollItems = randomNumber(0, 99);
  if(powerups.onlyOneObstacle){
    while(obstacleIndex == freePass){
      obstacleIndex = randomNumber(0, lanes - 1);
    }
  }
  itemIndex = freePass;
  
  for(var i=0; i<lanes; i++){
    if(i == freePass){
      laneObstacles[i] = false;
      if(rollItems < itemsRarity){
        currentItem = randomNumber(0, 3);
      }
      else{
        currentItem = -1;
      }
    }
    else if(powerups.onlyOneObstacle && (i == obstacleIndex)){
      laneObstacles[i] = true;
    }
    else{
      if(powerups.onlyOneObstacle && (i != obstacleIndex)){
        laneObstacles[i] = false;
      }
      else{
        laneObstacles[i] = true;
      }
    }
  }
}

//drawing lanes
function drawLanes(){
  //drawing them
  var Ycoord;
  for(var i = 1; i < lanes; i++){
    ctx.fillStyle = laneColor;
    Ycoord = coors.groundBasis + (sizes.lane * i) + ((i-1)*(sizes.separator));
    ctx.fillRect(0, Ycoord, mainCanvas.width, sizes.separator);
  }
}

//drawing clouds
function drawClouds(){
  for (var i = 0; i < 6; i++){
    ctx.drawImage(
      clouds[i],
      cloudCoordinates[i].x,
      coors.gameAreaBasis + cloudCoordinates[i].y,
      sizes.cloudW,
      sizes.cloudH
    );
    cloudCoordinates[i].x -= speedUnit * scrollSpeed["clouds"];

    if (cloudCoordinates[i].x <= -1 * sizes.cloudW){
      clouds[i] = graphicsPools.clouds.pick();
      cloudCoordinates[i] = {
        x: Math.floor((mainCanvas.width * 6) / 5) - sizes.cloudW,
        y: randomNumber(0, Math.floor((coors.groundBasis - coors.gameAreaBasis) / 3))
      };
    }
  }
}

//drawing flags
function drawFlags(){
  for (var i = 0; i < 5; i++){
    ctx.drawImage(
      flags[i],
      flagCoordinates[i].x,
      coors.groundBasis - sizes.flagH + flagCoordinates[i].y,
      sizes.flagW,
      sizes.flagH
    );
    flagCoordinates[i].x -= speedUnit * scrollSpeed["flags"];
    if (flagCoordinates[i].x <= -1 * sizes.flagW){
      flags[i] = graphicsPools.flags.pick();
      flagCoordinates[i] = {
        x: Math.floor((mainCanvas.width * 5) / 4) - sizes.flagW,
        y: randomNumber(0, Math.floor((coors.groundBasis - coors.gameAreaBasis) / 6))
      };
    }
  }
}

//drawing border
function drawBorder(){
  if(coors.borderX <= -1 * sizes.borderW){
    coors.borderX += sizes.borderW;
  }
  coors.borderX -= speedUnit * scrollSpeed["border"];
  for (var i = 0; i <= Math.ceil(mainCanvas.width / sizes.borderW)*2; i++){
    ctx.drawImage(
      graphics.border,
      Math.ceil(i * sizes.borderW + coors.borderX),
      coors.groundBasis - sizes.borderH,
      sizes.borderW,
      sizes.borderH
    );
  }
}

//setting groundline - function
function setGroundLine(){
  coors.groundBasis = Math.floor(coors.gameAreaBasis + sizes.widthUnit);
  drawGr();
}

//drawing ground
function drawGr(){
  var gradient = ctx.createLinearGradient(
    0,
    coors.groundBasis,
    0,
    mainCanvas.height
  );

  gradient.addColorStop(0, landColors[0]);
  gradient.addColorStop(1, landColors[1]);

  ctx.fillStyle = gradient;
  ctx.fillRect(0, coors.groundBasis, mainCanvas.width, mainCanvas.height);
}

//drawing background
function drawBg(){
  ctx.fillStyle = skyColorMain;
  ctx.fillRect(0, 0, mainCanvas.width, mainCanvas.height);
  if(graphics.background){
    //if canvas is horiontal
    if(mainCanvas.width > mainCanvas.height){
      var bgWidth = mainCanvas.width;
      var bgHeight = mainCanvas.width * graphics.background.height/graphics.background.width;
      ctx.drawImage(
        graphics.background,
        0,
        (coors.groundBasis - bgHeight),
        bgWidth,
        bgHeight
      );
    }
    //if canvas is vertical
    else{
      var bgHeight = coors.groundBasis;
      var bgWidth = bgHeight * graphics.background.width/graphics.background.height;
      ctx.drawImage(
        graphics.background,
        (mainCanvas.width - bgWidth)/2,
        0,
        bgWidth,
        bgHeight
      );
    }
  }
}

function checkCollision(){
  //checking for obstacleLine and mouse cross-over
  var lineX0 = coors.obsX;
  var lineX1 = coors.obsX + sizes.obsW;
  var charX0 = coors.charX;
  var charX1 = coors.charX + sizes.charW;
  if(
    ((lineX0<charX1)&&(lineX0>charX0))
    ||
    ((lineX1<charX1)&&(lineX1>charX0))
  ){

    //checking collision with obstacles
    if(laneObstacles[game.lane]){
      collision = true; 
    }
    else{
      collision = false;
      if((game.lane == itemIndex)&&(currentItem>-1)){
        startPowerUpTimer();
      }
    }
  
    if(collision){
      game.chainPossible = false;
      if(lives > 0){
        smashArray.push(
          {
            "x": coors.obsX,
            "y": laneCoords[game.lane] - sizes.obsH
          }
        );
        laneObstacles[game.lane] = false;
        if(powerups.invincible){
          addChain();
          musicList.shield.pause();
          musicList.shield.currentTime = 0;
          musicList.shield.play();
        }
        else{
          game.chain = 0;
          modifyLives(-1);
          musicList.crash.pause();
          musicList.crash.currentTime = 0;
          musicList.crash.play();
        }
      }
      else{
        if(powerups.invincible){
          smashArray.push(
            {
              "x": coors.obsX,
              "y": laneCoords[game.lane] - sizes.obsH
            }
          );
          addChain();
          musicList.shield.pause();
          musicList.shield.currentTime = 0;
          musicList.shield.play();
        }
        else{
          stopGame();
        }
      }
    }
    else{
      addChain();
    }
  }
}

function modifyLives(value){
  lives = Math.min(Math.max(lives + value, 0), 10);
}

function addChain(){
  if(game.chainPossible == true){
    game.chain += 1;
    game.chainPossible = false;
    
    musicList.pass.pause();
    musicList.pass.currentTime = 0;
    musicList.pass.play();

    if(game.chain>5){
      coors.congrats = coors.charY - sizes.congratsH;
      coors.congratsMax = coors.congrats - sizes.congratsH*2;
      bonusTrigger = true;
      if(game.chain<11){
        game.chainSprIndex = 0;
      }
      else if(game.chain<16){
        game.chainSprIndex = 1;
      }
      else if(game.chain<21){
        game.chainSprIndex = 2;
      }
      else if(game.chain<26){
        game.chainSprIndex = 3;
      }
      else if(game.chain<31){
        game.chainSprIndex = 4;
      }
    }
    else{
      game.chainSprIndex = -1;
    }
  }
}

function startPowerUpTimer(){
  if(itemActive == false){
    
    musicList.pickup.pause();
    musicList.pickup.currentTime = 0;
    musicList.pickup.play();

    if(currentItem == 3){
      modifyLives(1);
    }
    else{
      //activating powerups
      powerups[itemKinds[currentItem]] = true;
      //halving speed
      if(powerups.halfSpeed){
        setspeedUnit();
      }
      //setting up timers
      if(powerupTimers[[itemKinds[currentItem]]] < 0){
        powerupTimers[[itemKinds[currentItem]]] = 15;
      }
    }
    itemActive = true;
  }
}

function setDimensions(){
  sizes.fullWidth = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
  sizes.fullHeight = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
}

//calculating speedUnit
function setspeedUnit(){
  if(gameSpeed > 0){
    storage.speedUnit = mainCanvas.width * (10 + Math.min(gameSpeed, 15)) / 1000;
  }
  else{
    storage.speedUnit = gameSpeed;
  }
  if(powerups.halfSpeed){
    speedUnit = storage.speedUnit/2;
  }
  else{
    speedUnit = storage.speedUnit;
  }
}

//initializing canvas
function initializeCanvas(){
  setDimensions();
  game.sprite = graphicsPools.sprites[0];

  document.querySelector("canvas").width = sizes.fullWidth;
  document.querySelector("canvas").height = sizes.fullHeight;
  sizes.drawUnit = Math.floor(mainCanvas.width / 12);
  sizes.heightUnit = Math.min(
    Math.floor(mainCanvas.width / 10),
    Math.floor(mainCanvas.height / 10)
  );

  if (mainCanvas.height >= (mainCanvas.width * 2) / 3){
    sizes.widthUnit = Math.floor(mainCanvas.width / 3);
    coors.gameAreaBasis = mainCanvas.height - sizes.widthUnit * 2;
  } else if ((mainCanvas.height <= mainCanvas.width / 2)&&(mainCanvas.height > mainCanvas.width / 3)){
    sizes.widthUnit = Math.floor(mainCanvas.width / 4);
    sizes.drawUnit = Math.floor(mainCanvas.width / 16);
    coors.gameAreaBasis = 0;
  }
  else if (mainCanvas.height <= mainCanvas.width / 3){
    sizes.widthUnit = Math.floor(mainCanvas.width / 6);
    sizes.drawUnit = Math.floor(mainCanvas.width / 16);
    coors.gameAreaBasis = 0;
  } 
  else {
    sizes.widthUnit = Math.floor(mainCanvas.width / 3);
    coors.gameAreaBasis = 0;
  }

  drawBg();
  setGroundLine();

  if(coors.obsX){
    coors.obsX = Math.ceil(coors.obsX*mainCanvas.width/coors.gameAreaWidth);
  }
  
  coors.gameAreaHeight = mainCanvas.height - coors.groundBasis;
  coors.gameAreaWidth = mainCanvas.width;
  
  //width of lanes and separators
  sizes.separator = Math.floor(coors.gameAreaHeight * 5/100);
  sizes.lane = Math.floor(coors.gameAreaHeight * 30/100);
  for(var i=0; i<lanes; i++){
    laneCoords[lanes - i - 1] = coors.groundBasis + coors.gameAreaHeight - (i * (sizes.lane + sizes.separator));
  }
  
  setspeedUnit();

  sizes.obsW = Math.round(coors.gameAreaWidth * 5 / 100);
  sizes.obsH = Math.round((sizes.obsW * graphics.barrier.height) / graphics.barrier.width);
  sizes.item = Math.round(sizes.obsW * 12/10);
  
  sizes.charW = Math.round(coors.gameAreaWidth * 20 / 100);
  sizes.charH = Math.round((sizes.charW * graphicsPools.sprites[0].height) / graphicsPools.sprites[0].width);

  sizes.shield = Math.round(sizes.charW * 1.33);

  sizes.congratsW = Math.round(coors.gameAreaWidth * 20 / 100);
  sizes.congratsH =  Math.round((sizes.congratsW * graphicsPools.congrats[0].height)/graphicsPools.congrats[0].width);
  
  sizes.borderW = Math.round(sizes.drawUnit);
  sizes.borderH = Math.floor(
    (sizes.borderW * graphics.border.height) / graphics.border.width
  );

  sizes.flagW = Math.round(sizes.drawUnit);
  sizes.flagH = Math.floor(
    (sizes.flagW * graphicsPools.flags[0].height) / graphicsPools.flags[0].width
  );

  sizes.cloudW = Math.round(sizes.drawUnit * 2);
  sizes.cloudH = Math.floor(
    (sizes.cloudW * graphicsPools.clouds[0].height) / graphicsPools.clouds[0].width
  );

  coors.borderX = 0;

  if (!Array.isArray(clouds)){
    clouds = [];
  }
  if (!Array.isArray(flags)){
    flags = [];
  }
  for (var i = 0; i < 7; i++){
    if (!cloudCoordinates[i]){
      clouds.push(graphicsPools.clouds.pick());
      cloudCoordinates[i] = {};
      cloudCoordinates[i].y = randomNumber(
        0,
        Math.floor((coors.groundBasis - coors.gameAreaBasis) / 3)
      );
    }
    cloudCoordinates[i].x = Math.floor((i * mainCanvas.width) / 5);
  }

  for (var i = 0; i < 6; i++){
    if (!flagCoordinates[i]){
      flags.push(graphicsPools.flags.pick());
      (flagCoordinates[i] = {}),
        (flagCoordinates[i].y = randomNumber(
          0,
          Math.floor((coors.groundBasis - coors.gameAreaBasis) / 6)
        ));
    }
    flagCoordinates[i].x = Math.floor((i * mainCanvas.width) / 4);
  }
  
  regions.pause = {
    "x": mainCanvas.width - sizes.heightUnit - 20,
    "y": 20,
    "width": sizes.heightUnit,
    "height": sizes.heightUnit
  }

  regions.titleStart = {
    "x": Math.floor(mainCanvas.width/2 - sizes.heightUnit*3/2),
    "y": Math.floor(mainCanvas.height*3/4 - sizes.heightUnit*3/2),
    "width": sizes.heightUnit*3,
    "height": sizes.heightUnit
  }

  regions.titleLeaderBoard = {
    "x": Math.floor(mainCanvas.width/2 - sizes.heightUnit*3/2),
    "y": Math.floor(mainCanvas.height*3/4 + sizes.heightUnit/2),
    "width": sizes.heightUnit*3,
    "height": sizes.heightUnit
  }

  regions.mute = {
    "x": mainCanvas.width - sizes.heightUnit - 20,
    "y": mainCanvas.height - sizes.heightUnit - 20,
    "width": sizes.heightUnit,
    "height": sizes.heightUnit
  }
}

//showing info, submit and leaderboard screens
function showScreen(screen){
  Array.from(document.querySelectorAll(".fullscreen")).forEach(function(fullscreen){
    fullscreen.className = "fullscreen";
    if(fullscreen.style.backgroundColor != muteColor + "CF"){
      fullscreen.style.backgroundColor = muteColor + "CF";
      fullscreen.style.color = textColor;
    }
  });
  if(screen!="hide"){
    document.getElementById(screen).classList.add("visible");
  }
}

function tick(){
  if((game.isPaused == false)&&(game.isOver == false)){
    //score counting
    var baseValue = 100;
    if(laneObstacles[game.lane]){
      baseValue += 50;
    }
    score += baseValue + 10 * (gameSpeed * Math.max(game.chain, 0));

    //powerup timers
    for(var i=0; i<3; i++){
      if(powerupTimers[[itemKinds[i]]]>=0){
        powerupTimers[[itemKinds[i]]] -= 1;
      }
      else{
        setspeedUnit();
        powerups[[itemKinds[i]]] = false;
      }
    }
  }
}

//spawning player character
function spawnPlayer(){
  playerHasControl = true;
  coors.charX = -1 * sizes.charW;
  game.lane = randomNumber(0, lanes-1);
}

//stopping game
function stopGame(){
  if(game.isOver == false){
    game.isOver = true;
    game.isPaused = true;
    playerHasControl = false;
    musicList.background.pause();
    gameSpeed = 0;
    status = "Game Over";
    setspeedUnit();
    showScreen("click-catcher");
  }
}

//starting game
function startGame(){
  showScreen("hide");
  game.isOver = false;
  game.isPaused = false;
  game.currentScreen = "game";
  game.obstacleCount = 0;
  game.obstacleEach = 10;
  musicList.background.pause();
  musicList.background.volume = game.settings.volume * 0.5;
  musicList.background.currentTime = 0;
  musicList.background.play();
  game.chainPossible = true;
  game.chainSprIndex = -1;
  game.chain = 0; //resetting player success chain
  gameSpeed = 1; //on a scale from 1 to 5, will probably increase in the future
  lives = 3; //tries before player dies
  score = 0; //increment with time passing
  itemsRarity = 5; //5
  status = "Paused";
  coors.obsX = coors.gameAreaWidth * 2;
  for(var i=0; i<3; i++){
    //nullifying all powerups
    powerups[itemKinds[i]] = false;
    powerupTimers[itemKinds[i]] = -1;
  }
  setspeedUnit();
  
  if(spriteChangingTimer){
    clearInterval(spriteChangingTimer);
  }

  if(tickTimer){
    clearInterval(tickTimer);
  }
  
  spriteChangingTimer = setInterval(function(){
    if(game.sprite == null){
      game.sprite = graphicsPools.sprites[0];
    }
    else{
      if(gameSpeed > 0){
        if(graphicsPools.sprites[graphicsPools.sprites.indexOf(game.sprite)+1]){
          game.sprite = graphicsPools.sprites[graphicsPools.sprites.indexOf(game.sprite)+1];
        }
        else{
          game.sprite = graphicsPools.sprites[0];
        }
      }
    }
  }, 1000 / (2 * gameSpeed));

  tickTimer = setInterval(function(){
    tick();
  }, 1000);
  
  spawnPlayer();
  seedObstacles();
}

window.onload = function(){
  //loading assets - music
  var musicKeys = [ "background", "crash", "shield", "pickup", "pause", "generic", "pass" ];

  for(var key of musicKeys){
    musicList[key] = document.createElement("audio");
    musicList[key].src = "./web_game/audio/" + key + ".mp3";
  }
  
  musicList.background.loop = true;

  //loading assets - graphics
  var graphicsKeys = [ "logo", "unmuted", "muted", "border", "barrier", "menu_pause", "menu_play", "life", "background", "powerup_shield" ];

  for(var key of graphicsKeys){
    graphics[key] = new Image();
    graphics[key].onload = function(){ totalLoad += 1; };
    graphics[key].src = "./web_game/" + key + ".png";
  }

  //populating graphics pools
  var pools = {
    "sprites": 2,
    "flags": 3,
    "items": 3,
    "clouds": 3,
    "congrats": 5,
  }

  for(var poolKey in pools){
    graphicsPools[poolKey] = [];
    for(var i=0; i<pools[poolKey]; i++){
      graphicsPools[poolKey][i] = new Image();
      graphicsPools[poolKey][i].onload = function(){ totalLoad += 1};
      graphicsPools[poolKey][i].src = "./web_game/" + poolKey + i + ".png";
    }
  }

  var everythingLoaded = setInterval(function() {
  if (totalLoad == 26) {
      clearInterval(everythingLoaded);
      prepareGame();
    }
  }, 50);

  document.getElementById("info").addEventListener("click", function(){
    startGame();
  });

  document.getElementById("click-catcher").addEventListener("click", function(){
    document.getElementById("leaderboard-form").className = "";
    while(document.getElementById("leaderboard-form-table").firstChild){
      document.getElementById("leaderboard-form-table").removeChild(
        document.getElementById("leaderboard-form-table").firstChild
      )
    }
    showScreen("leaderboard-entry");
  });

  Array.from(document.querySelectorAll("button")).forEach(function(btn){
    btn.style.backgroundColor = textColor;
    btn.style.color = muteColor;
  });

  Array.from(document.querySelectorAll("input[type='text']")).forEach(function(inp){
    inp.style.borderColor = textColor;
    inp.style.color = textColor;
    inp.style.backgroundColor = muteColor;
  });

  scoreTable = [
    {
      "name": "Toby",
      "score": "390750"
    },
    {
      "name": "Alex",
      "score": "300000"
    },
    {
      "name": "Morris",
      "score": "250000"
    },
    {
      "name": "Ivo",
      "score": "200000"
    },
    {
      "name": "Luigi",
      "score": "150000"
    }
  ]

  document.getElementById("high-score").onsubmit = function(e){
    e.preventDefault();
    document.getElementById("leaderboard-form").className = "display-none";

    var newScore = {};
    newScore.name = document.getElementById("submit-name").value;
    newScore.score = score;

    scoreTable.push(newScore);
    scoreTable.sort(function(a, b){
      return b.score - a.score;
    });

    scoreTable.length = Math.min(scoreTable.length, 10);

    for(var record of scoreTable){
      var leaderboardPosition = document.createElement("DIV");
      leaderboardPosition.className = "record-block";

      var leaderboardName = document.createElement("DIV");
      leaderboardName.className = "record-name";
      leaderboardName.textContent = record.name;

      var leaderboardScore = document.createElement("DIV");
      leaderboardScore.className = "record-score";
      leaderboardScore.textContent = record.score;
      leaderboardPosition.appendChild(leaderboardName);
      leaderboardPosition.appendChild(leaderboardScore);

      document.getElementById("leaderboard-form-table").appendChild(leaderboardPosition);
    }
  }

  document.getElementById("try-again").addEventListener("click", function(){
    stopGame();
    startGame();
  });

  if(checkMobile()){
    document.getElementById("info-controls").innerHTML = howToPlayMobile;
  }
  else{
    document.getElementById("info-controls").innerHTML = howToPlayDesktop;
  }

  var link = document.createElement('link');
  link.href = fontFamily;
  link.rel = 'stylesheet';
  document.head.appendChild(link);
  myFont = getFontFamily(fontFamily);
  let newStr = myFont.replace("+", " ");
  myFont = newStr;
  document.body.style.fontFamily = myFont;
}

function randomNumber(min, max){
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

Array.prototype.pick = function(){
  return this[Math.floor(Math.random() * this.length)];
};

function roundTwo(num){
  if(isNaN(Math.round( num * 100 + Number.EPSILON ) / 100)){
    return parseFloat(num).toFixed(2);
  }
  return Math.round( num * 100 + Number.EPSILON ) / 100;
}

//rounded rectangles
CanvasRenderingContext2D.prototype.roundedRectangle = function(x, y, width, height, rounded) {
  var halfRadians = (2 * Math.PI)/2
  var quarterRadians = (2 * Math.PI)/4  
  
  this.arc(rounded + x, rounded + y, rounded, -quarterRadians, halfRadians, true)
  this.lineTo(x, y + height - rounded)
  this.arc(rounded + x, height - rounded + y, rounded, halfRadians, quarterRadians, true)  
  this.lineTo(x + width - rounded, y + height)
  this.arc(x + width - rounded, y + height - rounded, rounded, quarterRadians, 0, true) 
  this.lineTo(x + width, y + rounded)  
  this.arc(x + width - rounded, y + rounded, rounded, 0, -quarterRadians, true)  
  this.lineTo(x + rounded, y)  
}

//get mouse coords
function getMousePos(canvas, event) {
    var rect = canvas.getBoundingClientRect();
    return {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
    };
}

//check if cursor is inside rectangle
function isInside(pos, rect){
    return pos.x > rect.x && pos.x < rect.x+rect.width && pos.y < rect.y+rect.height && pos.y > rect.y
}

//moving player up and down
function movePlayer(direction){
  if(playerHasControl){
    if(direction == "up"){
      game.lane = Math.max(game.lane - 1, 0);
    }
    else if(direction == "down"){
      game.lane = Math.min(game.lane + 1, lanes-1);
    }
  }
}

//handling keypress
document.onkeydown = checkKey;

function checkKey(e) {
  e = e || window.event;
  if (e.keyCode == '38') {
    e.preventDefault();
    movePlayer("up");
  }
  else if (e.keyCode == '40') {
    e.preventDefault();
    movePlayer("down");
  }
}

//handling swipe
document.addEventListener('touchstart', handleTouchStart, false);        
document.addEventListener('touchmove', handleTouchMove, false);

var xDown = null;                                                        
var yDown = null;

function getTouches(evt) {
  return evt.touches;
}                                                     

function handleTouchStart(evt) {
    var firstTouch = getTouches(evt)[0];                                      
    xDown = firstTouch.clientX;                                      
    yDown = firstTouch.clientY;                                      
};                                                

function handleTouchMove(evt) {
    if ( ! xDown || ! yDown ) {
        return;
    }
    evt.preventDefault();

    var xUp = evt.touches[0].clientX;                                    
    var yUp = evt.touches[0].clientY;

    var xDiff = xDown - xUp;
    var yDiff = yDown - yUp;

    if ( Math.abs( xDiff ) > Math.abs( yDiff ) ) {/*most significant*/
        if ( xDiff > 0 ) {
            /* left swipe */ 
        } else {
            /* right swipe */
        }                       
    } else {
        if ( yDiff > 0 ) {
            movePlayer("up");
        } else { 
            movePlayer("down");
        }                                                                 
    }
    /* reset values */
    xDown = null;
    yDown = null;                                             
};

(function() {
    var lastTime = 0;
    var vendors = ['ms', 'moz', 'webkit', 'o'];
    for(var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
        window.requestAnimationFrame = window[vendors[x]+'RequestAnimationFrame'];
        window.cancelAnimationFrame = window[vendors[x]+'CancelAnimationFrame'] 
                                   || window[vendors[x]+'CancelRequestAnimationFrame'];
    }
 
    if (!window.requestAnimationFrame)
        window.requestAnimationFrame = function(callback, element) {
            var currTime = new Date().getTime();
            var timeToCall = Math.max(0, 16 - (currTime - lastTime));
            var id = window.setTimeout(function() { callback(currTime + timeToCall); }, 
              timeToCall);
            lastTime = currTime + timeToCall;
            return id;
        };
 
    if (!window.cancelAnimationFrame)
        window.cancelAnimationFrame = function(id) {
            clearTimeout(id);
        };
}());

function checkMobile(){
  var check = false;
  (function(a){if(/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino|android|ipad|playbook|silk/i.test(a)||/1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0,4))) check = true;})(navigator.userAgent||navigator.vendor||window.opera);
  return check;
};

function getFontFamily(ff) {
  const start = ff.indexOf('family=');
  if (start === -1) return 'sans-serif';
  let end = ff.indexOf('&', start);
  if (end === -1) end = undefined;
  return ff.slice(start + 7, end);
}