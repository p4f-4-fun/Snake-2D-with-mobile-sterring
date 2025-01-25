"use strict";

let actualScore = 0;

const $d = document;
const $ = (domElem) => $d.querySelector(domElem);
const $all = (domElems) => $d.querySelectorAll(domElems);
const canvas = $("#game-canvas");
const ctx = canvas.getContext("2d");

const appGlobalProperties = {
    colorWhite: "rgba(249,249,249, 1)",
    colorBlue: "rgba(49,149,249, 1)",
    colorDark: "rgba(60,56,69, 1)",
    colorRed: "rgba(249,0,0, 1)",
};

const gameLevels = {
    // "level_name": divider
    // for frames per second and more fps = more difficult game actually is
    "EZ": 7,
    "Regular": 15,
    "Pro": 30,
    "Snakesss": 60,
};

let gamerLevel = localStorage.getItem("gamerLevel") || "EZ";

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
    tailColor: appGlobalProperties.colorWhite,
    xPos: canvas.width/2,
    yPos: canvas.height/2,
};

const applesStack = [];
const appleObjectsTemplate = [
    ["color", appGlobalProperties.colorRed],
    ["dimension", snake.dimension],
    ["xPos", 0],
    ["yPos", 0],
];

const createGameLevelElement = () => {
    const gameLevelContainer = $(".game-level");

    // Create as much div levels as Object gameLevels contains (scalable)
    Object.keys(gameLevels).forEach(key => {
        const divLevelElement = $d.createElement("div");
        
        divLevelElement.dataset.level = key;
        
        // flag level element active if
        (key === gamerLevel) 
            ? divLevelElement.classList.add("level","active") 
            : divLevelElement.classList.add("level");

        gameLevelContainer.appendChild(divLevelElement);
    });
};

const gameLevelHandler = (EventTarget) => {
    const levelActiveElements = $all(".level.active");
    levelActiveElements.forEach(element => element.classList.remove("active"));
    
    EventTarget.classList.add("active");

    gamerLevel = EventTarget.dataset.level;
    localStorage.setItem("gamerLevel", gamerLevel);
};

const cleanUpCanvas = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
};

const drawPauseState = () => {
    ctx.font = `${isPaused.fontSize} "${isPaused.fontFamily}"`;
    ctx.fillStyle = `${isPaused.fontColor}`;
    ctx.fillText(`${isPaused.text.content}`, isPaused.text.xPos, isPaused.text.yPos);
};

const renderScore = () => {
    $(".actual-score > span").textContent = actualScore;
};

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

const gameOver = () => {
    window.location.reload();
};

const mapSnakePositions = () => {
    snake.tail.unshift({x: snake.xPos, y: snake.yPos});
};

const isTailCollision = () => {
    const pos = {x: snake.xPos, y: snake.yPos};

    for (let i = 0; i < actualScore; i++) 
        if (snake.tail[i].x === pos.x && snake.tail[i].y === pos.y)
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
    !isPaused.state && keepMovingSnake();
};

const createAppleObjects = () => {
    const howManyApples = 3;

    for (let i = 0; i < howManyApples; i++)
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
    /**
     * Collisions:
     * 1. With snake - object snake.xPos, snake.yPos
     * 2. With snake's tail - array of objects snake.tail.x|*.y []
     * 3. Between each other (apples) - array of objects applesStack.xPos|*.yPos
     */

    // 1.
    if (appleFromStack.xPos === snake.xPos && appleFromStack.yPos === snake.yPos)
        return true;

    // 2.
    for (let i = 0; i < actualScore; i++)
        if (appleFromStack.xPos === snake.tail[i].x && appleFromStack.yPos === snake.tail[i].y)
            return true;

    // 3.
    for (let i = 0; i < applesStack.length; i++)
        if (appleFromStack.xPos === applesStack[i].xPos && appleFromStack.yPos === applesStack[i].yPos)
            return true;

    // If collisions not detected
    return false;
};

const randomizeApplesLocations = () => {
    for (let i = 0; i < applesStack.length; i++) {
        do {
            applesStack[i].xPos = getAppleRandomPosition();
            applesStack[i].yPos = getAppleRandomPosition();
        } while (isAppleInCollision(applesStack[i]) === false);
    }
};

const drawApple = () => {
    ctx.fillStyle = applesStack[0].color;

    for (let i = 0; i < applesStack.length; i++)
        ctx.fillRect(applesStack[i].xPos, applesStack[i].yPos, applesStack[0].dimension, applesStack[0].dimension);
};

const checkAppleEaten = () => {
    for (let i = 0; i < applesStack.length; i++) {
        if (snake.xPos === applesStack[i].xPos && snake.yPos === applesStack[i].yPos) {
            updateScore();

            // This trick is about to setting up xPos far away from game board
            // and if all apples from stack got 999 xPos, than we know all
            // apples have been eaten so.. then we can randomizeApplesLocations
            // We do only xPos, because its enough, it doesnt matter now where is apple in yPos
            applesStack[i].xPos = 999;

            if ( applesStack.every(apple => apple.xPos === 999) ) {
                randomizeApplesLocations();
                return;
            }
        }
    }
};

const isBoundariesCollision = () => {
    return (
        snake.xPos < 0 || snake.xPos > (canvas.width - snake.dimension) || 
        snake.yPos < 0 || snake.yPos > (canvas.height - snake.dimension)
    ) ? true : false;
};

const bindEventsHandler = () => {
    // Game steering
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
};

const getComputedFramesByGameLevel = () => {
    return Object.values(gameLevels)[ Object.entries(gameLevels).findIndex(entry => entry[0] === gamerLevel) ];
};

const gameloop = () => {
    cleanUpCanvas();
    
    isPaused.state && drawPauseState();

    if ( !isPaused.state ) {
        drawApple();
        
        drawSnake();

        checkAppleEaten();
    
        // (short-if) If tail or boundaries collision detected = gameOver()
        isTailCollision() && gameOver();
        isBoundariesCollision() && gameOver();
    }

    // setTimeout(
    //     gameloop,
    //     // 1000 / x => x frames per 1 second [1s=1000ms], "x" depend on chosen game level
    //     1000 / getComputedFramesByGameLevel()
    // );

    setTimeout(() => { console.log(performance.now()); requestAnimationFrame(gameloop) }, 40);
    
};

const init = () => {
    renderScore();
    renderBestScore();

    createGameLevelElement();

    createAppleObjects();
    randomizeApplesLocations();

    bindEventsHandler();

    gameloop();
};

window.onload = init;


