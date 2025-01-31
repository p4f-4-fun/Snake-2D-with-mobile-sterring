"use strict";

let actualScore = 0;

const $d = document;
const $ = (domElem) => $d.querySelector(domElem);
const $all = (domElems) => $d.querySelectorAll(domElems);
const canvas = $("#game-canvas");
const ctx = canvas.getContext("2d");

const appGlobalProperties = {
    colorWhite: "rgba(249,249,249, 1)",
    colorGreen: "rgba(62,249,124, 1)",
    colorBlue: "rgba(49,149,249, 1)",
    colorDark: "rgba(60,56,69, 1)",
    colorRed: "rgba(249,0,0, 1)",
};

const gameLevels = {
    // "level_name": divider
    // for frames per second and more fps = more difficult game actually is
    "EZ": 10,
    "Regular": 20,
    "Pro": 30,
    "Snakesss": 45,
};

let gamerLevel = localStorage.getItem("gamerLevel") || "EZ";

// rAF frame sterring
let reqFPS = (() => Object.values(gameLevels)[ Object.entries(gameLevels).findIndex(entry => entry[0] === gamerLevel) ])();
let computedDiffBetweenTimestamps = 0;
let lastTimestamp = 0;

const isPaused = {
    state: true,
    fontColor: appGlobalProperties.colorWhite,
    fontFamily: "Press Start 2P",
    fontSize: "14px", // px not rem, easy-fast (not good), but..:D workaround mediaqueries font size
    text: {
        content: "Press [Space] to play game",
        xPos: canvas.width / 6.5,
        yPos: canvas.height / 2,
    },
};

const snake = {
    color: appGlobalProperties.colorBlue,
    dimension: canvas.width / 20,
    direction: "right",
    tail: [],
    tailColor: appGlobalProperties.colorGreen,
    xPos: canvas.width / 2,
    yPos: canvas.height / 2,
};

const applesStack = [];
const appleObjectsTemplate = [
    ["dimension", snake.dimension],
    // apple icon .png, customized, but from @ icons8.com
    ["url", "./assets/apple-25.png"],
    ["xPos", 0],
    ["yPos", 0],
];
// Object Image OImage with x,y dimensions which is actually snake.dimension value
const OImage = new Image( appleObjectsTemplate[0][1], appleObjectsTemplate[0][1] );

const createGameLevelElement = () => {
    // Create as much div levels as Object gameLevels contains (scalable)
    Object.keys(gameLevels).forEach(key => {
        const divLevelElement = $d.createElement("div");
        
        divLevelElement.dataset.level = key;
        
        // flag level element active if
        (key === gamerLevel) 
            ? divLevelElement.classList.add("level", "active") 
            : divLevelElement.classList.add("level");

        $(".game-level").appendChild(divLevelElement);
    });
};

const gameLevelHandler = (EventTarget) => {
    $all(".level.active").forEach(element => element.classList.remove("active"));
    EventTarget.classList.add("active");

    gamerLevel = EventTarget.dataset.level;
    localStorage.setItem("gamerLevel", gamerLevel);

    reqFPS = Object.values(gameLevels)[ Object.entries(gameLevels).findIndex(entry => entry[0] === gamerLevel) ];
};

const cleanUpCanvas = () => ctx.clearRect(0, 0, canvas.width, canvas.height);

const drawPauseState = () => {
    ctx.font = `${isPaused.fontSize} "${isPaused.fontFamily}"`;
    ctx.fillStyle = `${isPaused.fontColor}`;
    ctx.fillText(`${isPaused.text.content}`, isPaused.text.xPos, isPaused.text.yPos);
};

const renderScore = () => $(".actual-score > span").textContent = actualScore;

const renderBestScore = () => {
    if (localStorage.getItem("bestScore"))
        $(".best-score > span").textContent = localStorage.getItem("bestScore");
};

const updateScore = () => {
    let bestScore = localStorage.getItem("bestScore");

    actualScore++;

    if (actualScore > bestScore)
        localStorage.setItem("bestScore", actualScore);

    renderScore();
    renderBestScore();
};

const gameOver = () => window.location.reload();

const mapSnakePositions = () => {
    if (actualScore !== 0) {
        // Remove elements from [actualScore + 1] position, + 1 means next afters, because of unshift now new element
        snake.tail.splice(actualScore + 1, 1);
        snake.tail.unshift({x: snake.xPos, y: snake.yPos});
        return;
    }

    // We need the only [0] element at start, before the first apple will be eaten [= actualScore > 0]
    // and if we have actualScore > 0, now upper if condition is in use.
    // This is only required to collisions detection, and without it we haven't reference positions XY of snake tail
    snake.tail = [];
    snake.tail.unshift({x: snake.xPos, y: snake.yPos});
};

const isSnakeInCollisionWithTail = () => {
    for (let i = 0; i < snake.tail.length; i++) 
        if (snake.tail[i].x === snake.xPos && snake.tail[i].y === snake.yPos)
            return true;
};

const keepMovingSnake = () => {
    mapSnakePositions();
    
    // Move by snake direction flag
    switch(snake.direction) {
        case "up":
            snake.yPos -= snake.dimension;
            break;
        case "down":
            snake.yPos += snake.dimension;
            break;
        case "left":
            snake.xPos -= snake.dimension;
            break;
        case "right":
            snake.xPos += snake.dimension;
            break;
    }
};

const drawSnake = () => {
    // HEAD
    ctx.fillStyle = snake.color;
    ctx.fillRect(snake.xPos, snake.yPos, snake.dimension, snake.dimension);

    // TAIL
    for (let i = 0; i < actualScore; i++) {
        ctx.fillStyle = snake.tailColor;
        ctx.fillRect(snake.tail[i].x, snake.tail[i].y, snake.dimension, snake.dimension);
    }

    // Keep moving only if the game is not paused
    (isPaused.state === false) && keepMovingSnake();
};

const createAppleObjects = () => {
    for (let i = 0; i < 3/* <- how many */; i++)
        applesStack[i] = Object.fromEntries(appleObjectsTemplate);
};

const getAppleRandomPosition = () => {
    let random = 0;

    do {
        // Random value from 50 to 450 (in 500px canvas size, in 400px will be proporionaly lower) 
        // so it gives 50-50 to 450-450 area where the apple can be respawn,
        // which is good because the gamer is always able to eat apple, no bugs likes 0-0/ 475-475 apple respawn,
        // what will be impossible to eat and safe the snake from the boundary
        random = Math.floor( Math.random() * ( canvas.width - (3 * applesStack[0].dimension) ) ) + (2 * applesStack[0].dimension);
    } while (random % (canvas.width / 20) !== 0);

    return random;
};

const isAppleInCollision = (appleFromStack) => {
    let collisionDetected = false;

    /**
     * Collisions:
     * 1. With snake - object snake.xPos, snake.yPos
     * 2. With snake's tail - array of objects snake.tail.x|*.y []
     * 3. Between each other (apples) - array of objects applesStack.xPos|*.yPos
     */
    // 1.
    if (appleFromStack.xPos === snake.xPos && appleFromStack.yPos === snake.yPos)
        collisionDetected = true;

    // 2.
    for (let i = 0; i < snake.tail.length; i++)
        if (
            appleFromStack.xPos === snake.tail[i].x - snake.dimension
            && appleFromStack.yPos === snake.tail[i].x
            && appleFromStack.yPos === snake.tail[i].x + snake.dimension
            && appleFromStack.yPos === snake.tail[i].y - snake.dimension
            && appleFromStack.yPos === snake.tail[i].y
            && appleFromStack.yPos === snake.tail[i].y + snake.dimension
        )
            collisionDetected = true;

    // 3.
    for (let i = 0; i < applesStack.length; i++)
        if (appleFromStack.xPos === applesStack[i].xPos && appleFromStack.yPos === applesStack[i].yPos)
            collisionDetected = true;

    // If collisions not detected
    return collisionDetected;
};

const randomizeAppleLocation = (apple) => {
    if (apple && apple !== "undefined") {
        do {
            apple.xPos = getAppleRandomPosition();
            apple.yPos = getAppleRandomPosition();
        } while (isAppleInCollision(apple) === false);

        return;
    }

    // This execution is only at init and when reload window (also init) and never more else
    for (let i = 0; i < applesStack.length; i++) {
        do {
            applesStack[i].xPos = getAppleRandomPosition();
            applesStack[i].yPos = getAppleRandomPosition();
        } while (isAppleInCollision(applesStack[i]) === false);
    }
};

const drawApple = () => {
    OImage.src = applesStack[0].url;

    for (let i = 0; i < applesStack.length; i++)
        ctx.drawImage(OImage, applesStack[i].xPos, applesStack[i].yPos);
};

const checkAppleEaten = () => {
    for (let i = 0; i < applesStack.length; i++) {
        if (snake.xPos === applesStack[i].xPos && snake.yPos === applesStack[i].yPos) {
            updateScore();

            randomizeAppleLocation(applesStack[i]);
        }
    }
};

const isBoundariesCollision = () => {
    return (
        snake.xPos < 0 
        || snake.xPos > (canvas.width - snake.dimension) 
        || snake.yPos < 0 
        || snake.yPos > (canvas.height - snake.dimension)
    ) ? true : false;
};

const bindEventsHandler = () => {
    // Game steering on mobile touch screen
    canvas.addEventListener("touchstart", (Event) => {
        isPaused.state = !isPaused.state;
    });

    $(".move-area").addEventListener("touchmove", (Event) => {
        Event.preventDefault();
        Event.stopImmediatePropagation();
        console.log(Event);
    });
    
    // Game steering on PC
    $d.addEventListener("keydown", (Event) => {
        if (Event.key === " ")
            isPaused.state = !isPaused.state;
    
        if(isPaused.state) return;
    
        if (Event.key === "ArrowUp" || Event.key.toLocaleLowerCase() === "w")
            if(snake.direction !== "up" && snake.direction !== "down")
                snake.direction = "up";
    
        if (Event.key === "ArrowDown" || Event.key.toLocaleLowerCase() === "s")
            if(snake.direction !== "down" && snake.direction !== "up")
                snake.direction = "down";
    
        if (Event.key === "ArrowLeft" || Event.key.toLocaleLowerCase() === "a")
            if(snake.direction !== "left" && snake.direction !== "right")
                snake.direction = "left";
    
        if (Event.key === "ArrowRight" || Event.key.toLocaleLowerCase() === "d")
            if(snake.direction !== "right" && snake.direction !== "left")
                snake.direction = "right";
    });
    
    // Event delegated to parent element .game-level
    $(".game-level").addEventListener("click", (Event) => Event.target.className.startsWith("level") && gameLevelHandler(Event.target));

    // Event resize
    window.addEventListener("resize", reactOnWindowSize);
};

const gameLoop = () => {
    cleanUpCanvas();
    
    isPaused.state && drawPauseState();

    if (isPaused.state === false) {
        drawSnake();
        
        drawApple();
        checkAppleEaten();
        
        // (short-if) If tail or boundaries collision detected = gameOver()
        isSnakeInCollisionWithTail() && gameOver();
        isBoundariesCollision() && gameOver();
    }
};

const getFrame = (innerTimestamp) => {
    // Math.round(1000 / reqFPS)) always give the same number depend on reqFPS
    // if we want 10fps it means the frames takes only 100ms from one second, last time should be skipped
    // so we and last and current timestamp to achieved number >= our 100ms, and having it we know elapsed
    // time is OK to run our gameLoop, and then is reset and everyhing once again.. easy and cool,
    // the SECOND is something CONSTANT in our world so this is the best solution to avoid situation
    // the our app will go faster or slower depend on user monitor refresh rate, 
    // but despite of we get rid of the setTimeout which is not cool for gaming, but rAF isn't also smooth,
    // because we just skipping time between our gameLoop callbacks so it looks not very good always,
    // but this is the only way to avoid setTimeout and have loop in game  
    if (computedDiffBetweenTimestamps >= Math.round(1000 / reqFPS)) {
        computedDiffBetweenTimestamps = 0;
        gameLoop();
    }

    // just add timestamps nothing else and ease if which checks if lastTimestamp exist just in case..
    computedDiffBetweenTimestamps += (lastTimestamp) && Math.round(performance.now() - lastTimestamp);
    
    //innerTimestamp is parameter from rAF which we can use as timestamp for our calculations
    lastTimestamp = innerTimestamp;
    requestAnimationFrame((innerTimestamp) => getFrame(innerTimestamp));
};

const reactOnWindowSize = () => {
    if(window.innerWidth <= 600) {
        // Just to always have .move-area best view for UX
        window.scrollTo(0, document.body.scrollHeight);

        canvas.width = canvas.height = 400;

        isPaused.fontSize = "10px";
        isPaused.text.content = "Tap [ here ] to play game";
        isPaused.text.xPos = canvas.width / 5;
        isPaused.text.yPos = canvas.height / 2;
    } else {
        window.scrollTo(0, -document.body.scrollHeight);

        canvas.width = canvas.height = 500;

        isPaused.fontSize = "14px";
        isPaused.text.content = "Press [Space] to play game";
        isPaused.text.xPos = canvas.width / 7;
        isPaused.text.yPos = canvas.height / 2;
    }
};

const init = () => {
    reactOnWindowSize();

    renderScore();
    renderBestScore();

    createGameLevelElement();

    createAppleObjects();
    randomizeAppleLocation();

    bindEventsHandler();

    // init gameLoop by getFrame
    requestAnimationFrame(getFrame);
};

window.onload = init;


