/********************************
        CANVAS & CONTEXT
********************************/

// Hämta canvas-elementet från HTML-koden där spelet ritas upp
const canvas = document.getElementById("myCanvas"); 
// Hämta rit-kontexten (2D) för att kunna rita bilder, former och text på canvasen
const ctx = canvas.getContext("2d"); 

/********************************
             BILDER
********************************/

// Skapa ett nytt bildobjekt för Mario och ladda in bilden
const marioImg = new Image(); 
marioImg.src = "assets/mario.png";

/********************************
              LJUD
********************************/

// Objekt som innehåller alla ljudeffekter i spelet
const sounds = {
    jump: new Audio("assets/sounds/jump.mp3"),     // Ljud när man hoppar
    score: new Audio("assets/sounds/score.mp3"),   // Ljud när man får poäng
    hit: new Audio("assets/sounds/hit.mp3"),       // Ljud när man krockar
    gameOver: new Audio("assets/sounds/gameover.mp3") // Ljud när spelet tar slut
};

// Justera ljudvolymen på alla ljudeffekter (0.0 till 1.0)
sounds.jump.volume = 0.4;
sounds.score.volume = 0.5;
sounds.hit.volume = 0.6;
sounds.gameOver.volume = 0.6;

/********************************
        SPELKONSTANTER
********************************/

// Fysik-inställningar
const gravity = 0.28;       // Dragningskraften som drar Mario nedåt varje frame
const jumpStrength = -8.8;  // Kraften uppåt när spelaren hoppar (negativt värde flyttar objekt uppåt på Y-axeln)

// Timing & Hastighet
const pipeInterval = 2200;  // Tid mellan att nya rör-par skapas (i millisekunder)
const PIPE_SPEED = 2.3;     // Hur många pixlar rören flyttas åt vänster varje frame

// Inställningar för rören (Pipes)
const PIPE_WIDTH = 80;       // Rörens bredd i pixlar
const PIPE_GAP = 225;        // Avståndet (öppningen) mellan övre och nedre röret
const MIN_PIPE_HEIGHT = 60;  // Minsta tillåtna höjd för ett rör
const MAX_PIPE_VARIATION = 80; // Hur mycket öppningens position får skifta upp/ned från föregående rör

// Inställningar för fienderna (Pokémon)
const ENEMY_WIDTH = 50;           // Fiendens bredd
const ENEMY_HEIGHT = 70;          // Fiendens höjd
const ENEMY_SPEED_X = 2.4;        // Hastighet i sidled (åt vänster)
const ENEMY_SPEED_Y = 0.9;        // Hastighet i höjdled (upp/ned i öppningen)
const ENEMY_VERTICAL_MARGIN = 24; // Säkerhetsavstånd så fienden inte flyger inuti själva rören

// Inställningar för kollisioner (minskar träffytan för skönare gameplay)
const PIPE_COLLISION_PADDING = 10;  // Gör Marios krockbox mot rör 10px mindre på varje sida
const ENEMY_COLLISION_PADDING = 18; // Gör Marios krockbox mot fiender 18px mindre

// Variabler för rör-spawning
let pipeTimer = 0;                  // Håller koll på hur lång tid som gått sedan förra röret skapades
let lastGapY = canvas.height / 2;   // Sparar mitten-Y-koordinaten för det senaste rörets öppning

/********************************
        HJÄLPFUNKTIONER
********************************/

// Ritar text på canvasen med en tydlig svart outline runt bokstäverna
function drawOutlineText(text, x, y, fontSize = "20px", align = "left") {
    ctx.font = `${fontSize} Barriecito`; // Använder det importerade Barriecito-typsnittet
    ctx.textAlign = align;              // Sätter textjustering (left, center, right)
    ctx.lineWidth = 5;                  // Tjockleken på outlinen
    ctx.strokeStyle = "black";          // Outlinens färg
    ctx.strokeText(text, x, y);         // Ritar outlinen
    ctx.fillStyle = "white";            // Textens fyllnadsfärg
    ctx.fillText(text, x, y);           // Fyller i texten
    if (align !== "left") ctx.textAlign = "left"; // Återställer textjustering till standard
}

// Rensar bort objekt ur en lista när de har åkt utanför skärmens vänstra kant
function removeOffscreen(array) {
    for (let i = array.length - 1; i >= 0; i--) {
        // Om objektets högra kant (x + width) är mindre än 0 (utanför skärmen till vänster)
        if (array[i].x + array[i].width < 0) {
            array.splice(i, 1); // Ta bort objektet från listan
        }
    }
}

/****** UPDATE & DRAW ******/

// Uppdaterar all spellogik (positioner, krockar, poäng). Körs varje frame.
function update() {
    // Kör inte logiken om spelet inte har startat eller om det är Game Over
    if (!gameStarted || gameOver) return;

    mario.update();  // Uppdatera Marios position och fysik
    pipeTimer += 16; // Öka timern med ca 16ms (vilket motsvarar tiden för en frame i 60 FPS)

    // Om det har gått tillräckligt lång tid skapar vi ett nytt rör-par
    if (pipeTimer > pipeInterval) {
        spawnPipePair();
        pipeTimer = 0; // Återställ timern
    }

    // Uppdatera alla aktiva rör
    pipes.forEach(pipe => {
        pipe.update();
        
        // Om Mario krockar med ett rör avslutas spelet
        if (checkCollision(mario, pipe)) endGame();

        // Kolla om Mario har passerat röret för att ge poäng (kollar bara på det nedre/icke-vända röret)
        if (!pipe.isFlipped && !pipe.passed && pipe.x + pipe.width < mario.x) {
            pipe.passed = true; // Markera att röret gett poäng
            score++;            // Öka poängräknaren
            sounds.score.currentTime = 0; // Återställ ljudet till början
            sounds.score.play();          // Spela upp poängljudet
        }
    });

    // Uppdatera alla aktiva fiender
    enemies.forEach(enemy => {
        enemy.update();
        
        // Om Mario krockar med en fiende avslutas spelet
        if (checkCollision(mario, enemy, ENEMY_COLLISION_PADDING)) endGame();
    });

    // Ta bort rör och fiender som åkt ut ur skärmen för att spara prestanda
    removeOffscreen(pipes);
    removeOffscreen(enemies);
}

// Ritar upp all grafik på skärmen. Körs varje frame.
function draw() {
    // Rensa hela canvasen innan vi ritar den nya framen
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    mario.draw(); // Rita Mario
    pipes.forEach(pipe => pipe.draw()); // Rita alla rör
    enemies.forEach(enemy => enemy.draw()); // Rita alla fiender (Pokémon)

    // Rita spelarens nuvarande poäng i övre vänstra hörnet
    drawOutlineText(`Score: ${score}`, 20, 30, "20px");

    // Visa startskärmen om spelet inte har startat ännu
    if (!gameStarted) {
        ctx.fillStyle = "rgba(0,0,0,0.6)"; // Halvgenomskinlig svart bakgrund
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        drawOutlineText("PIPE GAME", canvas.width / 2, 180, "32px", "center");
        drawOutlineText("Tryck SPACE eller klicka", canvas.width / 2, 230, "20px", "center");
        drawOutlineText("för att starta", canvas.width / 2, 260, "20px", "center");
    }

    // Visa Game Over-skärmen om spelet är slut
    if (gameOver) {
        ctx.fillStyle = "rgba(0,0,0,0.6)"; // Halvgenomskinlig svart bakgrund
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        drawOutlineText("GAME OVER", canvas.width / 2, 150, "28px", "center");
        drawOutlineText(`Score: ${score}`, canvas.width / 2, 190, "28px", "center");
        drawOutlineText(`Highscore: ${highScore}`, canvas.width / 2, 230, "28px", "center");

        // Rita en röd omstartsknapp
        ctx.fillStyle = "#ff4444";
        ctx.fillRect(canvas.width / 2 - 70, 280, 140, 40);
        drawOutlineText("Restart", canvas.width / 2, 308, "20px", "center");
    }
}

/****** SPELSTATE ******/

// Variabler som sparar spelets aktuella tillstånd
let gameStarted = false; // Sant om spelet har startats av spelaren
let gameOver = false;    // Sant om spelaren har förlorat
let score = 0;           // Nuvarande poäng i denna spelomgång
let highScore = Number(localStorage.getItem("highScore")) || 0; // Hämtar sparad highscore från webbläsarens minne

/****** API DATA ******/

// Lista som kommer innehålla alla flygande Pokémon från typ-anropet
let flyingPokemon = []; 

// Hämtar listan över alla flygande Pokémon från PokeAPI när sidan laddas
function initPokeAPI() {
    fetch("https://pokeapi.co/api/v2/type/flying")
        .then(response => response.json())
        .then(data => {
            flyingPokemon = data.pokemon; // Spara listan över tillgängliga Pokémon
        })
        .catch(error => console.error("Kunde inte hämta Pokémon-listan:", error));
}

// Hämtar detaljerad data för en slumpmässig Pokémon och skapar fienden asynkront
function spawnEnemy(x, gapStart, pipeGap) {
    // Avbryt om Pokémon-listan inte har laddats färdigt från API:et än
    if (flyingPokemon.length === 0) return;

    // Välj ut en slumpmässig Pokémon från den förladdade listan
    const randomPokemon = flyingPokemon[Math.floor(Math.random() * flyingPokemon.length)];
    
    // Gör ett API-anrop till den specifika Pokémonens URL för att få namn och bild
    fetch(randomPokemon.pokemon.url)
        .then(response => response.json())
        .then(data => {
            const name = data.name;                  // Pokémonens namn
            const imageUrl = data.sprites.front_default; // URL till Pokémonens standardbild
            
            // Skapa fiende-objektet med dess unika data och lägg till det i listan
            enemies.push(new Enemy(x, gapStart, pipeGap, name, imageUrl));
        })
        .catch(error => console.error("Kunde inte ladda detaljer för Pokémon:", error));
}

// Kör igång API-anropet vid start för att hämta listan över Pokémon
initPokeAPI(); 

/****** MARIO CLASS ******/

// Klass för spelaren (Mario)
class Mario {
    constructor() {
        this.width = 50;     // Marios bredd på skärmen
        this.height = 70;    // Marios höjd på skärmen
        this.x = canvas.width / 2 - this.width / 2; // Centrera Mario horisontellt vid start
        this.y = canvas.height / 2 - this.height / 2; // Centrera Mario vertikellt vid start
        this.velocity = 0;   // Aktuell fart i Y-led (fall- eller hopphastighet)
    }

    // Uppdaterar fysik för Mario varje frame
    update() {
        this.velocity += gravity; // Öka fallhastigheten med gravitationen
        this.y += this.velocity;  // Flytta Mario nedåt (eller uppåt om velocity är negativ)

        // Stoppa Mario vid canvasens nederkant (så han inte faller igenom marken)
        if (this.y + this.height > canvas.height) {
            this.y = canvas.height - this.height;
            this.velocity = 0;
        }
        // Stoppa Mario vid canvasens överkant (taket)
        if (this.y < 0) {
            this.y = 0;
            this.velocity = 0;
        }
    }

    // Ger Mario en hastighet uppåt när spelaren hoppar
    jump() {
        this.velocity = jumpStrength;
    }

    // Ritar Mario på canvasen på hans nuvarande koordinater
    draw() {
        ctx.drawImage(marioImg, this.x, this.y, this.width, this.height);
    }

    // Återställer Marios position och hastighet när spelet startar om
    reset() {
        this.y = canvas.height / 2 - this.height / 2;
        this.velocity = 0;
    }
}

// Skapa Marios instans
const mario = new Mario(); 

/****** INPUT ******/

// Startar spelet eller får Mario att hoppa
function jump() {
    // Om spelet inte har startat, starta spelet vid första trycket/klicket
    if (!gameStarted) {
        gameStarted = true;
        return;
    }

    // Om spelet är igång, utför hoppet och spela hoppmallen
    if (!gameOver) {
        mario.jump();
        const jumpSound = new Audio("assets/sounds/jump.mp3");
        jumpSound.volume = 0.4;
        jumpSound.play();
    }
}

// Lyssna efter tryck på Space eller musklick på hela skärmen
document.addEventListener("keydown", e => { if (e.code === "Space") jump(); });
document.addEventListener("mousedown", jump);

/****** PIPE CLASS ******/

// Klass för rören som Mario måste undvika
class Pipe {
    constructor(x, y, width, height, isFlipped = false) {
        this.x = x;                 // X-position (börjar längst till höger)
        this.y = y;                 // Y-position (0 för övre rör, gapStart + pipeGap för nedre rör)
        this.width = width;         // Rörets bredd
        this.height = height;       // Rörets höjd
        this.speed = PIPE_SPEED;    // Hastigheten som röret rör sig mot vänster
        this.isFlipped = isFlipped; // Sant om det är det övre röret som ska peka nedåt
        this.passed = false;        // Sparar om Mario har åkt förbi röret (så poäng inte ges flera gånger)
        this.image = new Image();   // Skapa bildobjekt för rör-grafiken
        this.image.src = "assets/pipe.png";
    }

    // Flyttar röret åt vänster
    update() {
        this.x -= this.speed;
    }

    // Ritar röret. Om det är det övre röret spegelvänds det.
    draw() {
        ctx.save(); // Spara nuvarande canvas-inställningar

        if (this.isFlipped) {
            // Övre rör: Flytta nollpunkten till rörets mitt, skala -1 på Y-axeln för att vända upp-och-ned
            ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
            ctx.scale(1, -1);
            ctx.drawImage(this.image, -this.width / 2, -this.height / 2, this.width, this.height);
        } else {
            // Nedre rör: Rita ut på vanliga koordinater
            ctx.drawImage(this.image, this.x, this.y, this.width, this.height);
        }

        ctx.restore(); // Återställ canvas-inställningar
    }
}

/****** ENEMY CLASS ******/

// Klass för Pokémon-fienderna som flyger upp och ned i öppningarna
class Enemy {
    constructor(x, gapStart, pipeGap, name, imageUrl) {
        this.x = x;               // Startar på samma X-position som rören
        this.width = ENEMY_WIDTH;
        this.height = ENEMY_HEIGHT;
        this.speedX = ENEMY_SPEED_X; // Rör sig åt vänster i samma/liknande takt som rören
        this.speedY = ENEMY_SPEED_Y; // Hur snabbt den rör sig upp/ned
        this.directionY = 1;         // 1 för nedåt, -1 för uppåt

        // Beräkna max och min Y-gräns så fienden stannar i öppningen mellan rören
        const offset = Math.random() * 10 - 5; // Lite slumpmässig startförskjutning i höjdled
        const verticalMargin = ENEMY_VERTICAL_MARGIN;
        this.minY = gapStart + verticalMargin; // Högsta punkten fienden får nå
        this.maxY = gapStart + pipeGap - this.height - verticalMargin; // Lägsta punkten fienden får nå
        
        // Startposition i mitten av rörens öppning
        this.y = Math.max(this.minY, Math.min(gapStart + (pipeGap - this.height) / 2 + offset, this.maxY));

        this.name = name;            // Sparar den unika Pokémonens namn direkt på objektet (korrekt OOP)
        this.image = new Image();    // Skapa ett bildobjekt unikt för denna fiende
        this.image.src = imageUrl;   // Ladda bilden från PokeAPI:s bild-URL
    }

    // Uppdaterar positionen för fienden
    update() {
        this.x -= this.speedX; // Flytta fienden åt vänster
        this.y += this.speedY * this.directionY; // Flytta fienden uppåt eller nedåt

        // Om fienden når sin övre eller nedre gräns, byt riktning (studsa)
        if (this.y <= this.minY || this.y >= this.maxY) {
            this.directionY *= -1;
            this.y = Math.max(this.minY, Math.min(this.y, this.maxY));
        }
    }

    // Ritar fienden och skriver ut Pokémonens namn ovanför
    draw() {
        ctx.drawImage(this.image, this.x, this.y, this.width, this.height);
        drawOutlineText(this.name.toUpperCase(), this.x + this.width / 2, this.y - 15, "22px", "center");
    }
}

/****** LISTOR ******/

const pipes = [];   // Innehåller alla rör som för tillfället finns på skärmen
const enemies = []; // Innehåller alla fiender (Pokémon) som finns på skärmen

/****** PIPE SPAWN ******/

// Skapar ett nytt par med rör (ett övre och ett nedre) samt en fiende
function spawnPipePair() {
    // Räkna ut öppningens Y-position baserat på förra öppningen (för en jämnare svårighetsgrad)
    let gapStart = lastGapY + (Math.random() * MAX_PIPE_VARIATION * 2 - MAX_PIPE_VARIATION);
    // Håll öppningen inom tillåtna ramar på skärmen
    gapStart = Math.max(MIN_PIPE_HEIGHT, Math.min(gapStart, canvas.height - PIPE_GAP - MIN_PIPE_HEIGHT));
    lastGapY = gapStart;

    // Lägg till de två nya rören i listan
    pipes.push(
        new Pipe(canvas.width, 0, PIPE_WIDTH, gapStart, true), // Övre rör (flipped)
        new Pipe(canvas.width, gapStart + PIPE_GAP, PIPE_WIDTH, canvas.height - (gapStart + PIPE_GAP)) // Nedre rör
    );

    // Hämta en ny Pokémon och skapa en fiende som rör sig i öppningen
    spawnEnemy(canvas.width + 160, gapStart, PIPE_GAP);
}

/****** GAME STATE ******/

// Kollar om två objekt (AABB rektanglar) krockar med varandra
function checkCollision(a, b, padding = PIPE_COLLISION_PADDING) {
    // Använder en padding (marginal) för att göra krockboxen lite mindre och mer förlåtande mot spelaren
    return a.x + padding < b.x + b.width && a.x + a.width - padding > b.x && 
           a.y + padding < b.y + b.height && a.y + a.height - padding > b.y;
}

// Avslutar spelet (kallas när Mario krockar)
function endGame() {
    if (gameOver) return; // Gör inget om spelet redan är avslutat
    gameOver = true;
    
    // Spela upp träff- och game over-ljuden
    sounds.hit.currentTime = 0;
    sounds.hit.play();
    sounds.gameOver.currentTime = 0;
    sounds.gameOver.play();
    
    // Spara ny highscore lokalt om det aktuella resultatet är bättre
    if (score > highScore) {
        highScore = score;
        localStorage.setItem("highScore", highScore);
    }
}

// Återställer variabler och tömmer listor inför en ny runda
function restartGame() {
    gameStarted = false;
    gameOver = false;
    score = 0;
    pipes.length = 0;   // Tömmer listan med rör
    enemies.length = 0; // Tömmer listan med fiender
    mario.reset();      // Återställer Marios position och fart
}

// Lyssna efter klick på Restart-knappen när Game Over-skärmen visas
canvas.addEventListener("click", e => {
    if (!gameOver) return;
    
    // Beräkna klickets koordinater relativt canvasens övre vänstra hörn
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Om klicket sker inom den röda knappen: starta om spelet
    if (x > canvas.width / 2 - 70 && x < canvas.width / 2 + 70 && y > 280 && y < 320) {
        restartGame();
    }
});

/****** GAME LOOP ******/

// Spelets huvudloop som körs kontinuerligt (ca 60 gånger per sekund)
function gameLoop() {
    update(); // Räkna ut all fysik, förflyttningar och kollisioner
    draw();   // Rita upp alla objekt på sin nuvarande koordinater
    requestAnimationFrame(gameLoop); // Säger till webbläsaren att köra gameLoop igen vid nästa skärmuppdatering
}

// Startar spelets loop så fort Marios bild har laddats färdigt
marioImg.onload = gameLoop;