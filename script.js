// ===================== SETUP =====================

const canvas = document.getElementById("board");
const ctx = canvas.getContext("2d");
const WORLD_WIDTH = 1650;
const WORLD_HEIGHT = 2560;

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

resizeCanvas();
window.addEventListener("resize", resizeCanvas);

const camera = { x: 0, y: 0 };

const START_X = 10;
const START_Y = WORLD_HEIGHT - 70;

const player = {
    x: START_X,
    y: START_Y,
    height: 30,
    width: 30,
    gravity: 0.5,
    velocity: 0,
    velocityX: 0,
    speed: 5,
    ground: false,
};

const clones = [];
let current_locations = [];

// ===================== WORLD GEOMETRY =====================

const grass = {
    x: 0,
    y: WORLD_HEIGHT - 30,
    width: WORLD_WIDTH,
    height: 30,
    friction: 1,
};

const wind_zones = [
    {
        x: 600,
        y: WORLD_HEIGHT - 814,
        width: 300,
        height: 150,
        forceX: 2.5,
        forceY: -0.15,
        maxSpeedX: 8,
    },
];

const BOOST_SPEED = 32;
const BOOST_POP = -15;
const BOOST_TIME = 20;
const BOOST_CD = 400;

const conveyer = [
    { x: 1470, y: WORLD_HEIGHT - 814 - 135, width: 100, height: 20, dir: -1 },
    { x: 700, y: wind_zones[0].y - wind_zones[0].height - 90, width: 100, height: 20, dir: -1 },
    { x: 200, y: wind_zones[0].y - wind_zones[0].height - 150, width: 100, height: 20, dir: -1 },
];

const meteors = [];

const platforms = [
    { width: 100, height: 20, x: 200, y: grass.y - grass.height - 30, friction: 1 },
    { width: 200, height: 20, x: 485, y: WORLD_HEIGHT - 134, friction: 1 },
    { width: 100, height: 20, x: 850, y: WORLD_HEIGHT - 174, friction: 1 },
    { width: 200, height: 20, x: 850, y: WORLD_HEIGHT - 354, friction: 1 },
    { width: 50, height: 20, x: 700, y: WORLD_HEIGHT - 344, friction: 0.01 },
    { width: 50, height: 20, x: 780, y: WORLD_HEIGHT - 454, friction: 0.08 },
    { width: 200, height: 20, x: 100, y: WORLD_HEIGHT - 524, friction: 0.5 },
    { width: 20, height: 10, x: 200, y: WORLD_HEIGHT - 674, friction: 1 },
    { width: 5, height: 2, x: 410, y: WORLD_HEIGHT - 724, friction: 1 },
    { width: 300, height: 20, x: wind_zones[0].x, y: wind_zones[0].y + wind_zones[0].height, friction: 1 },
    { width: 50, height: 20, x: wind_zones[0].x + wind_zones[0].width + 100, y: WORLD_HEIGHT - 714, friction: 1 },
    { width: 50, height: 20, x: wind_zones[0].x + wind_zones[0].width + 200, y: WORLD_HEIGHT - 764, friction: 1 },
    { width: 50, height: 20, x: wind_zones[0].x + wind_zones[0].width + 300, y: WORLD_HEIGHT - 814, friction: 1 },
    { width: 50, height: 20, x: wind_zones[0].x + wind_zones[0].width + 400, y: WORLD_HEIGHT - 864, friction: 1 },
    { width: 50, height: 20, x: wind_zones[0].x + wind_zones[0].width + 500, y: WORLD_HEIGHT - 914, friction: 1 },
];

const wall = [
    {
        x: 200,
        y: platforms[0].y + platforms[0].height,
        width: 20,
        height: grass.y - (platforms[0].y + platforms[0].height),
    },
];

const spikes = [
    {
        width: 50,
        height: 93,
        x: platforms[0].x + platforms[0].width / 3 - 27,
        y: platforms[0].y - 73,
    },
    {
        width: grass.width - 200,
        height: 15,
        x: 200,
        y: grass.y - 15,
    },
    {
        width: 75,
        height: 15,
        x: platforms[6].x + platforms[6].width + 20,
        y: platforms[6].y - platforms[6].height - 100,
    },
];

const fake_sky = [
    { x: 525, y: platforms[1].y - 264, width: 130, height: 170 },
    { x: 250, y: platforms[6].y - 15, width: 30, height: 15 },
];

const fake_spikes = [{ x: 555, y: platforms[1].y - 93, width: 80, height: 93 }];

const fake_platform = {
    x: 525,
    y: platforms[1].y - 304,
    width: 50,
    height: 20,
};

const button = [
    {
        x: platforms[2].x + platforms[2].width / 5 - 0.5,
        y: platforms[2].y - platforms[2].height - 8.7,
        width: 60,
        height: 30,
        teleport_coords: {
            x: 870,
            y: platforms[2].y - platforms[2].height - 8.7 - 200,
        },
    },
];

const checkpoint = [
    {
        x: 850 + platforms[3].width / 2,
        y: platforms[3].y - platforms[3].height - 20,
        width: 40,
        height: 40,
    },
];

const invisible_platform = [
    { width: 0.25, height: 0.25, x: 680, y: WORLD_HEIGHT - 364 },
    { width: 20, height: 20, x: 650, y: WORLD_HEIGHT - 454 },
    { width: 10, height: 5, x: platforms[6].x, y: platforms[6].y - platforms[6].height - 30 },
    { width: 10, height: 5, x: platforms[6].x - 100, y: platforms[6].y - platforms[6].height - 85 },
];

const moving_platforms = [
    { width: 15, height: 10, x: 600, y: WORLD_HEIGHT - 524 },
];

// ---- NEW: crumbling platforms ----
// Stand on one too long and it drops out from under you, then slowly
// rebuilds itself. Placed as the final stretch leading to the flag.
const CRUMBLE_DELAY = 35;   // frames of standing before it gives way
const CRUMBLE_RESPAWN = 160; // frames until it comes back

const crumble_platforms = [
    { width: 70, height: 18, x: 1150, y: WORLD_HEIGHT - 964, state: "solid", standTimer: 0, respawnTimer: 0 },
    { width: 70, height: 18, x: 1270, y: WORLD_HEIGHT - 1024, state: "solid", standTimer: 0, respawnTimer: 0 },
    { width: 70, height: 18, x: 1180, y: WORLD_HEIGHT - 1094, state: "solid", standTimer: 0, respawnTimer: 0 },
];

// ---- NEW: finish flag ----
const finish = {
    x: 1180,
    y: WORLD_HEIGHT - 1094 - 60,
    width: 30,
    height: 60,
};

let hasWon = false;

// ---- NEW: parallax background clouds (purely decorative) ----
const clouds = [];
for (let i = 0; i < 18; i++) {
    clouds.push({
        x: Math.random() * WORLD_WIDTH * 1.4,
        y: 100 + Math.random() * 2000,
        scale: 0.6 + Math.random() * 1.2,
    });
}

// ---- NEW: death-roll dice event ----
// Periodically the game forces a dice roll. Roll the shown target number
// or die on the spot. Physics pause while the prompt is up.
let diceDeathActive = false;
let diceDeathTarget = 4;
let diceDeathTimer = randintSeeded();
let diceDeathTime = 0;

function randintSeeded() {
    return 900 + Math.floor(Math.random() * 700); // 900-1600 frames
}

// ===================== INPUT =====================

const keys = {};
let jumpBuffered = false;

document.addEventListener("keydown", (e) => {
    keys[e.key] = true;
    if (e.key === " ") {
        jumpBuffered = true;
        e.preventDefault();
    }
});

document.addEventListener("keyup", (e) => {
    keys[e.key] = false;
});

// ===================== STATE / TIMERS =====================

let paywall_timer = 2400;
let meteor_timer = 90;
let meteor_time = 0;
let time = 0;
let random_controls = 1200;
let counter = 0;
let change_controls = false;
let buttonCooldown = false;
let checkpoint_set = false;
let invismessageshown = true;

let boosting = 0;
let launchDir = 0;
let onCooldown = false;

let mpDirection = -1;

const MP_SPEED = 2;
const MP_LEFT_BOUND = 350;
const MP_RIGHT_BOUND = 550;

// ---- NEW: cheat dice ----
// Roll a die. Land three sixes in a row (1/216 odds) and you teleport to
// the next checkpoint ahead of you. Any non-six roll resets the streak.
let cheatStreak = 0;
let cheatRolling = false;

// Ordered list of "checkpoints" the cheat can jump you to — the real
// checkpoint plus the finish flag, whichever comes first ahead of the player.
function getCheatTargets() {
    return [
        ...checkpoint.map((c) => ({ x: c.x, y: c.y - player.height + c.height, markCheckpoint: true })),
        { x: finish.x, y: finish.y + finish.height - player.height, markCheckpoint: false, isFinish: true },
    ];
}

function nextCheatTarget() {
    const targets = getCheatTargets();
    for (const t of targets) {
        if (t.x > player.x) return t;
    }
    return targets[targets.length - 1] || null;
}

// ===================== METEORS =====================

function drawMeteor(m) {
    const cx = m.x + m.width / 2;
    const cy = m.y + m.height / 2;
    const rx = m.width / 2;
    const ry = m.height / 2;

    ctx.beginPath();
    const points = m.shape;
    points.forEach((p, i) => {
        const px = cx + Math.cos(p.angle) * rx * p.r;
        const py = cy + Math.sin(p.angle) * ry * p.r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
    });
    ctx.closePath();

    const grad = ctx.createRadialGradient(cx - rx * 0.3, cy - ry * 0.3, rx * 0.1, cx, cy, rx);
    grad.addColorStop(0, "#C97A3D");
    grad.addColorStop(0.6, "#8B4A1F");
    grad.addColorStop(1, "#4A2510");

    ctx.fillStyle = grad;
    ctx.fill();

    ctx.strokeStyle = "#2E1608";
    ctx.lineWidth = 2;
    ctx.stroke();
}

function makeMeteorShape() {
    const numPoints = randint(7, 10);
    const shape = [];
    for (let i = 0; i < numPoints; i++) {
        shape.push({
            angle: (i / numPoints) * Math.PI * 2,
            r: 0.7 + Math.random() * 0.3,
        });
    }
    return shape;
}

// ===================== PLATFORM MOVEMENT =====================

function updateMovingPlatforms() {
    moving_platforms.forEach((platform) => {
        platform.x += MP_SPEED * mpDirection;

        if (platform.x <= MP_LEFT_BOUND) {
            platform.x = MP_LEFT_BOUND;
            mpDirection = 1;
        }
        if (platform.x + platform.width >= MP_RIGHT_BOUND) {
            platform.x = MP_RIGHT_BOUND - platform.width;
            mpDirection = -1;
        }
    });
}

// ---- NEW: crumble platform lifecycle ----
function updateCrumblePlatforms(standingOn) {
    crumble_platforms.forEach((plat) => {
        if (plat.state === "solid") {
            if (standingOn.has(plat)) {
                plat.standTimer++;
                if (plat.standTimer >= CRUMBLE_DELAY) {
                    plat.state = "gone";
                    plat.respawnTimer = CRUMBLE_RESPAWN;
                }
            } else {
                plat.standTimer = 0;
            }
        } else if (plat.state === "gone") {
            plat.respawnTimer--;
            if (plat.respawnTimer <= 0) {
                plat.state = "solid";
                plat.standTimer = 0;
            }
        }
    });
}

// ===================== DEATH / RESET =====================

function death() {
    if (checkpoint_set) {
        player.x = 850 + platforms[3].width / 2;
        player.y = platforms[3].y - platforms[3].height - 20;
    } else {
        player.x = START_X;
        player.y = START_Y;
    }

    player.velocityX = 0;
    player.velocity = 0;
    boosting = 0;

    if (current_locations.length > 0) {
        clones.push({ locations: current_locations, frames: 0 });
    }
    current_locations = [];
}

function collideRect(a, b) {
    return (
        a.x < b.x + b.width &&
        a.x + a.width > b.x &&
        a.y < b.y + b.height &&
        a.y + a.height > b.y
    );
}

function applyButtonEffect(b) {
    if (buttonCooldown) return;

    buttonCooldown = true;
    setTimeout(() => {
        buttonCooldown = false;
    }, 500);

    let chance = Math.floor(Math.random() * 3) + 1;

    if (chance === 1) {
        player.x = b.teleport_coords.x;
        player.y = b.teleport_coords.y;
    } else if (chance === 2) {
        death();
    } else {
        player.x = 270;
        player.y = grass.y - grass.height - 30 - platforms[0].height;
    }

    player.velocity = 0;
    player.velocityX = 0;
}

// ---- NEW: win handling ----
function winGame() {
    if (hasWon) return;
    hasWon = true;

    const overlay = document.getElementById("winOverlay");
    const deathCountEl = document.getElementById("deathCount");
    deathCountEl.textContent = `Deaths this run: ${clones.length}`;
    overlay.classList.remove("hidden");
}

function resetGame() {
    hasWon = false;
    checkpoint_set = false;
    clones.length = 0;
    current_locations = [];
    meteors.length = 0;
    crumble_platforms.forEach((p) => {
        p.state = "solid";
        p.standTimer = 0;
        p.respawnTimer = 0;
    });
    player.x = START_X;
    player.y = START_Y;
    player.velocity = 0;
    player.velocityX = 0;
    cheatStreak = 0;
    document.getElementById("cheatStreakLabel").textContent = "Streak: 0/3 sixes";
    diceDeathActive = false;
    diceDeathTime = 0;
    diceDeathTimer = randintSeeded();
    document.getElementById("diceEventOverlay").classList.add("hidden");
    document.getElementById("winOverlay").classList.add("hidden");
}

document.getElementById("restartBtn").addEventListener("click", resetGame);

// ---- NEW: cheat dice button ----
const DICE_FACES = ["⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];
const cheatBtn = document.getElementById("cheatBtn");
const diceFace = document.getElementById("diceFace");
const cheatStreakLabel = document.getElementById("cheatStreakLabel");

function rollCheatDice() {
    if (cheatRolling || hasWon) return;
    cheatRolling = true;
    cheatBtn.disabled = true;
    diceFace.classList.add("rolling");

    let ticks = 0;
    const maxTicks = 14;
    const spin = setInterval(() => {
        diceFace.textContent = DICE_FACES[randint(0, 5)];
        ticks++;
        if (ticks >= maxTicks) {
            clearInterval(spin);
            settleCheatRoll();
        }
    }, 60);
}

function settleCheatRoll() {
    const result = randint(1, 6);
    diceFace.textContent = DICE_FACES[result - 1];
    diceFace.classList.remove("rolling");

    if (result === 6) {
        cheatStreak++;
    } else {
        cheatStreak = 0;
    }

    if (cheatStreak >= 3) {
        cheatStreak = 0;
        performCheatSkip();
    }

    cheatStreakLabel.textContent = `Streak: ${cheatStreak}/3 sixes`;
    cheatRolling = false;
    cheatBtn.disabled = false;
}

function performCheatSkip() {
    const target = nextCheatTarget();
    if (!target) return;

    player.x = target.x;
    player.y = target.y;
    player.velocity = 0;
    player.velocityX = 0;
    boosting = 0;

    if (target.markCheckpoint) checkpoint_set = true;
    if (target.isFinish) winGame();

    cheatStreakLabel.textContent = "TRIPLE SIX! Skipped ahead.";
    setTimeout(() => {
        cheatStreakLabel.textContent = "Streak: 0/3 sixes";
    }, 1800);
}

cheatBtn.addEventListener("click", rollCheatDice);

// ---- NEW: forced death-roll event ----
const diceEventOverlay = document.getElementById("diceEventOverlay");
const diceEventFace = document.getElementById("diceEventFace");
const diceEventTargetEl = document.getElementById("diceEventTarget");
const diceEventRollBtn = document.getElementById("diceEventRollBtn");
const diceEventResultMsg = document.getElementById("diceEventResultMsg");

function triggerDiceDeathEvent() {
    if (hasWon) return;
    diceDeathActive = true;
    diceDeathTarget = randint(1, 6);
    diceEventTargetEl.textContent = diceDeathTarget;
    diceEventFace.textContent = "🎲";
    diceEventFace.classList.remove("rolling");
    diceEventResultMsg.textContent = "";
    diceEventRollBtn.disabled = false;
    diceEventOverlay.classList.remove("hidden");
}

function rollDiceDeath() {
    diceEventRollBtn.disabled = true;
    diceEventFace.classList.add("rolling");

    let ticks = 0;
    const maxTicks = 16;
    const spin = setInterval(() => {
        diceEventFace.textContent = DICE_FACES[randint(0, 5)];
        ticks++;
        if (ticks >= maxTicks) {
            clearInterval(spin);
            settleDiceDeath();
        }
    }, 60);
}

function settleDiceDeath() {
    const result = randint(1, 6);
    diceEventFace.textContent = DICE_FACES[result - 1];
    diceEventFace.classList.remove("rolling");

    const survived = result === diceDeathTarget;
    diceEventResultMsg.textContent = survived
        ? `Rolled a ${result}. Lucky.`
        : `Rolled a ${result}. Needed a ${diceDeathTarget}. RIP.`;
    diceEventResultMsg.style.color = survived ? "#3fff8f" : "#ff3b3b";

    setTimeout(() => {
        diceEventOverlay.classList.add("hidden");
        diceDeathActive = false;
        diceDeathTime = 0;
        diceDeathTimer = randintSeeded();
        if (!survived) death();
    }, 1100);
}

diceEventRollBtn.addEventListener("click", rollDiceDeath);

// ===================== MAIN PHYSICS STEP =====================

function move() {
    if (hasWon || diceDeathActive) return;

    let dy = 0;

    let left = "a";
    let right = "d";
    if (change_controls) {
        left = "d";
        right = "a";
    }

    let friction = 1;

    if (player.ground) {
        const feetRect = {
            x: player.x,
            y: player.y + player.height - 2,
            width: player.width,
            height: 4,
        };

        if (collideRect(feetRect, grass)) friction = grass.friction;

        platforms.forEach((platform) => {
            if (collideRect(feetRect, platform)) friction = platform.friction;
        });

        moving_platforms.forEach((platform) => {
            if (collideRect(feetRect, platform)) friction = 1;
        });
    }

    let targetDx = 0;
    if (keys[left]) targetDx = -player.speed;
    if (keys[right]) targetDx = player.speed;

    if (boosting > 0) {
        player.velocityX = BOOST_SPEED * launchDir;
        boosting--;
    } else {
        player.velocityX = player.velocityX * (1 - friction) + targetDx * friction;
        if (targetDx === 0 && friction < 1) {
            player.velocityX *= 1 - friction * 0.5;
        }
    }

    let dx = player.velocityX;

    if (jumpBuffered && player.ground) {
        player.velocity = -10;
        player.ground = false;
        jumpBuffered = false;
    } else if (!player.ground) {
        jumpBuffered = false;
    }

    player.velocity += player.gravity;

    wind_zones.forEach((zone) => {
        if (collideRect(player, zone)) {
            player.x -= zone.forceX;
            if (zone.forceY !== undefined && player.velocity > 0) {
                player.velocity *= 0.92;
                if (player.velocity > 2) player.velocity = 2;
            }
        }
    });

    dy += player.velocity;
    player.ground = false;

    const new_x_rect = { x: player.x + dx, y: player.y, width: player.width, height: player.height };
    const new_y_rect = { x: player.x, y: player.y + dy, width: player.width, height: player.height };
    const grassRect = { x: grass.x, y: grass.y, width: grass.width, height: grass.height };

    if (collideRect(new_y_rect, grassRect) && player.velocity > 0) {
        dy = grass.y - player.height - player.y;
        player.velocity = 0;
        player.ground = true;
    }

    if (
        (collideRect(new_x_rect, platforms[5]) || collideRect(new_y_rect, platforms[5])) &&
        invismessageshown
    ) {
        alert("From here, some platforms become invisible, have fun! :)");
        invismessageshown = false;
    }

    platforms.forEach((platform) => {
        const verticalHit = collideRect(new_y_rect, platform);
        if (collideRect(new_x_rect, platform) && !verticalHit) {
            dx = 0;
            player.velocityX = 0;
        }
        if (verticalHit) {
            if (player.velocity > 0) {
                dy = platform.y - player.height - player.y;
                player.velocity = 0;
                player.ground = true;
            } else {
                dy = platform.y + platform.height - player.y;
                player.velocity = 0;
            }
        }
    });

    conveyer.forEach((belt) => {
        if (!collideRect(player, belt)) return;

        const verticalHit = collideRect(new_y_rect, belt);
        const sideHit = collideRect(new_x_rect, belt) && !verticalHit;

        if (sideHit && !onCooldown) {
            onCooldown = true;
            setTimeout(() => {
                onCooldown = false;
            }, BOOST_CD);

            launchDir = belt.dir;
            boosting = BOOST_TIME;
            player.velocity = BOOST_POP;
            dx = 0;
        } else if (sideHit) {
            dx = 0;
        }

        if (verticalHit) {
            if (player.velocity > 0) {
                dy = belt.y - player.height - player.y;
                player.velocity = 0;
                player.ground = true;
            } else {
                dy = belt.y + belt.height - player.y;
                player.velocity = 0;
            }
        }
    });

    invisible_platform.forEach((invis) => {
        const verticalHit = collideRect(new_y_rect, invis);
        if (collideRect(new_x_rect, invis) && !verticalHit) {
            dx = 0;
            player.velocityX = 0;
        }
        if (verticalHit) {
            if (player.velocity > 0) {
                dy = invis.y - player.height - player.y;
                player.velocity = 0;
                player.ground = true;
            } else {
                dy = invis.y + invis.height - player.y;
                player.velocity = 0;
            }
        }
    });

    moving_platforms.forEach((platform) => {
        const verticalHit = collideRect(new_y_rect, platform);
        if (collideRect(new_x_rect, platform) && !verticalHit) {
            dx = 0;
            player.velocityX = 0;
        }
        if (verticalHit) {
            if (player.velocity > 0) {
                dy = platform.y - player.height - player.y;
                player.velocity = 0;
                player.ground = true;
                player.x += MP_SPEED * mpDirection;
            } else {
                dy = platform.y + platform.height - player.y;
                player.velocity = 0;
            }
        }
    });

    // ---- NEW: crumble platform collision ----
    const standingOn = new Set();
    crumble_platforms.forEach((plat) => {
        if (plat.state !== "solid") return;

        const verticalHit = collideRect(new_y_rect, plat);
        if (collideRect(new_x_rect, plat) && !verticalHit) {
            dx = 0;
            player.velocityX = 0;
        }
        if (verticalHit) {
            if (player.velocity > 0) {
                dy = plat.y - player.height - player.y;
                player.velocity = 0;
                player.ground = true;
                standingOn.add(plat);
            } else {
                dy = plat.y + plat.height - player.y;
                player.velocity = 0;
            }
        }
    });
    updateCrumblePlatforms(standingOn);

    button.forEach((b) => {
        let hit = false;

        if (collideRect(new_x_rect, b)) {
            dx = 0;
            player.velocityX = 0;
            hit = true;
        }
        if (collideRect(new_y_rect, b)) {
            if (player.velocity > 0) {
                dy = b.y - player.height - player.y;
                player.velocity = 0;
                player.ground = true;
            } else {
                dy = b.y + b.height - player.y;
                player.velocity = 0;
            }
            hit = true;
        }
        if (hit) applyButtonEffect(b);
    });

    checkpoint.forEach((c) => {
        if (collideRect(new_x_rect, c) || collideRect(new_y_rect, c)) {
            checkpoint_set = true;
        }
    });

    wall.forEach((w) => {
        if (collideRect(new_x_rect, w)) {
            if (new_x_rect.x < w.x) player.x = w.x - player.width;
            else player.x = w.x + w.width;
            dx = 0;
            player.velocityX = 0;
        }
        if (collideRect(new_y_rect, w)) {
            if (player.velocity > 0) {
                dy = w.y - player.height - player.y;
                player.velocity = 0;
                player.ground = true;
            } else {
                dy = w.y + w.height - player.y;
                player.velocity = 0;
            }
        }
    });

    for (let i = meteors.length - 1; i >= 0; i--) {
        const meteor = meteors[i];
        meteor.x += meteor.dx;
        meteor.y += meteor.dy;
        if (meteor.y > WORLD_HEIGHT) meteors.splice(i, 1);
    }

    meteors.forEach((meteor) => {
        if (collideRect(player, meteor)) death();
    });

    player.x += dx;
    player.y += dy;

    if (player.x < 0) {
        player.x = 0;
        player.velocityX = 0;
    }
    if (player.x + player.width > WORLD_WIDTH) {
        player.x = WORLD_WIDTH - player.width;
        player.velocityX = 0;
    }
    if (player.y < 0) {
        player.y = 0;
        player.velocity = 0;
    }
    if (player.y + player.height > WORLD_HEIGHT) {
        player.y = WORLD_HEIGHT - player.height;
        player.velocity = 0;
        player.ground = true;
    }

    spikes.forEach((spike) => {
        if (collideRect(player, spike)) {
            death();
            player.velocity = 0;
        }
    });

    fake_sky.forEach((false_sky) => {
        if (collideRect(player, false_sky)) {
            death();
            player.velocity = 0;
        }
    });

    // ---- NEW: falling into a gone crumble platform's gap kills like any fall gap would ----
    // (no explicit check needed — gravity + world bounds already handle it)

    if (collideRect(player, finish)) {
        winGame();
    }

    current_locations.push({ x: player.x, y: player.y });

    clones.forEach((clone) => {
        clone.frames++;
        if (clone.frames > clone.locations.length) clone.frames = 0;
    });
}

function randint(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ===================== VISUAL HELPERS (decorative only) =====================

function drawSky() {
    const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    grad.addColorStop(0, "#4FA8E0");
    grad.addColorStop(0.6, "#8FD0EE");
    grad.addColorStop(1, "#CDEFFB");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function drawCloud(x, y, scale) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
    ctx.beginPath();
    ctx.ellipse(0, 0, 26, 16, 0, 0, Math.PI * 2);
    ctx.ellipse(20, -8, 18, 13, 0, 0, Math.PI * 2);
    ctx.ellipse(-20, -4, 16, 12, 0, 0, Math.PI * 2);
    ctx.ellipse(6, -14, 14, 11, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

function drawClouds() {
    clouds.forEach((c) => drawCloud(c.x, c.y, c.scale));
}

function drawGrass() {
    const grad = ctx.createLinearGradient(0, grass.y, 0, grass.y + grass.height);
    grad.addColorStop(0, "#5FCB4E");
    grad.addColorStop(1, "#2E8B2E");
    ctx.fillStyle = grad;
    ctx.fillRect(grass.x, grass.y, grass.width, grass.height);

    ctx.fillStyle = "#3A7A2C";
    for (let bx = grass.x; bx < grass.x + grass.width; bx += 14) {
        ctx.beginPath();
        ctx.moveTo(bx, grass.y);
        ctx.lineTo(bx + 4, grass.y - 7);
        ctx.lineTo(bx + 8, grass.y);
        ctx.closePath();
        ctx.fill();
    }
}

function drawSpikeRow(spike) {
    const teeth = Math.max(1, Math.round(spike.width / 22));
    const toothW = spike.width / teeth;
    const grad = ctx.createLinearGradient(0, spike.y, 0, spike.y + spike.height);
    grad.addColorStop(0, "#FF5C4D");
    grad.addColorStop(1, "#A31A1A");
    ctx.fillStyle = grad;

    for (let i = 0; i < teeth; i++) {
        const bx = spike.x + i * toothW;
        ctx.beginPath();
        ctx.moveTo(bx, spike.y + spike.height);
        ctx.lineTo(bx + toothW / 2, spike.y);
        ctx.lineTo(bx + toothW, spike.y + spike.height);
        ctx.closePath();
        ctx.fill();
    }
    ctx.strokeStyle = "#5C0E0E";
    ctx.lineWidth = 1;
    for (let i = 0; i < teeth; i++) {
        const bx = spike.x + i * toothW;
        ctx.beginPath();
        ctx.moveTo(bx, spike.y + spike.height);
        ctx.lineTo(bx + toothW / 2, spike.y);
        ctx.lineTo(bx + toothW, spike.y + spike.height);
        ctx.stroke();
    }
}

function drawPlatform(platform) {
    const grad = ctx.createLinearGradient(0, platform.y, 0, platform.y + platform.height);
    grad.addColorStop(0, "#6FB6D6");
    grad.addColorStop(1, "#38708A");
    ctx.fillStyle = grad;
    ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
    ctx.strokeStyle = "#274F60";
    ctx.lineWidth = 1;
    ctx.strokeRect(platform.x + 0.5, platform.y + 0.5, platform.width - 1, platform.height - 1);
}

function drawConveyorBelt(belt, offset) {
    ctx.fillStyle = "#33322E";
    ctx.fillRect(belt.x, belt.y, belt.width, belt.height);

    ctx.save();
    ctx.beginPath();
    ctx.rect(belt.x, belt.y, belt.width, belt.height);
    ctx.clip();
    ctx.fillStyle = "#FF6B00";
    const stripeW = 10;
    const shift = ((offset * belt.dir) % (stripeW * 2) + stripeW * 2) % (stripeW * 2);
    for (let sx = belt.x - stripeW * 2 + shift; sx < belt.x + belt.width + stripeW; sx += stripeW * 2) {
        ctx.beginPath();
        ctx.moveTo(sx, belt.y + belt.height);
        ctx.lineTo(sx + stripeW, belt.y + belt.height);
        ctx.lineTo(sx + stripeW * 1.6, belt.y);
        ctx.lineTo(sx + stripeW * 0.6, belt.y);
        ctx.closePath();
        ctx.fill();
    }
    ctx.restore();
}

function drawButtonIcon(b) {
    ctx.fillStyle = "#2b2b2b";
    ctx.fillRect(b.x, b.y, b.width, b.height);
    ctx.fillStyle = "#ff3b3b";
    ctx.fillRect(b.x + 6, b.y + 6, b.width - 12, b.height - 12);
    ctx.fillStyle = "#fff";
    ctx.font = "bold 14px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("?", b.x + b.width / 2, b.y + b.height / 2 + 1);
}

function drawCheckpointFlag(c) {
    ctx.fillStyle = "#888";
    ctx.fillRect(c.x + c.width / 2 - 2, c.y, 4, c.height);
    ctx.fillStyle = "#ffd23f";
    ctx.beginPath();
    ctx.moveTo(c.x + c.width / 2 + 2, c.y);
    ctx.lineTo(c.x + c.width, c.y + c.height * 0.22);
    ctx.lineTo(c.x + c.width / 2 + 2, c.y + c.height * 0.44);
    ctx.closePath();
    ctx.fill();
}

function drawPlayer() {
    const facing = player.velocityX < -0.2 ? -1 : 1;

    const grad = ctx.createLinearGradient(player.x, player.y, player.x, player.y + player.height);
    grad.addColorStop(0, "#FFA352");
    grad.addColorStop(1, "#FF6B00");
    ctx.fillStyle = grad;

    const r = 6;
    ctx.beginPath();
    ctx.moveTo(player.x + r, player.y);
    ctx.arcTo(player.x + player.width, player.y, player.x + player.width, player.y + player.height, r);
    ctx.arcTo(player.x + player.width, player.y + player.height, player.x, player.y + player.height, r);
    ctx.arcTo(player.x, player.y + player.height, player.x, player.y, r);
    ctx.arcTo(player.x, player.y, player.x + player.width, player.y, r);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#B34A00";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // eyes, looking in the direction of travel
    const eyeY = player.y + player.height * 0.4;
    const eyeOffsetX = facing === 1 ? player.width * 0.62 : player.width * 0.38;
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(player.x + eyeOffsetX, eyeY, 4.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#1a1a1a";
    ctx.beginPath();
    ctx.arc(player.x + eyeOffsetX + facing * 1.4, eyeY, 2, 0, Math.PI * 2);
    ctx.fill();
}

// ===================== RENDER =====================

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    drawSky();

    ctx.save();
    ctx.translate(-camera.x * 0.3, -camera.y * 0.15);
    drawClouds();
    ctx.restore();

    ctx.save();
    ctx.translate(-camera.x, -camera.y);

    wind_zones.forEach((zone) => {
        ctx.fillStyle = "rgba(0, 206, 209, 0.15)";
        ctx.fillRect(zone.x, zone.y, zone.width, zone.height);
        ctx.strokeStyle = "rgba(0, 206, 209, 0.4)";
        ctx.strokeRect(zone.x, zone.y, zone.width, zone.height);
    });

    drawGrass();

    spikes.forEach(drawSpikeRow);
    fake_spikes.forEach(drawSpikeRow);

    platforms.forEach(drawPlatform);

    conveyer.forEach((belt) => drawConveyorBelt(belt, time * 1.5));

    drawPlatform(fake_platform);
    drawPlatform(moving_platforms[0]);

    // ---- crumble platforms, fading/cracking look ----
    crumble_platforms.forEach((plat) => {
        if (plat.state === "gone") return;
        const wear = plat.standTimer / CRUMBLE_DELAY;
        const r = Math.round(74 + wear * 150);
        const g = Math.round(143 - wear * 100);
        const b = Math.round(168 - wear * 130);
        ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
        ctx.fillRect(plat.x, plat.y, plat.width, plat.height);
        ctx.strokeStyle = "rgba(0,0,0,0.3)";
        ctx.strokeRect(plat.x + 0.5, plat.y + 0.5, plat.width - 1, plat.height - 1);
    });

    button.forEach(drawButtonIcon);
    checkpoint.forEach(drawCheckpointFlag);

    // ---- finish flag ----
    ctx.fillStyle = "#888";
    ctx.fillRect(finish.x, finish.y, 4, finish.height);
    ctx.fillStyle = hasWon ? "#3fff8f" : "#ffd23f";
    ctx.beginPath();
    ctx.moveTo(finish.x + 4, finish.y);
    ctx.lineTo(finish.x + finish.width, finish.y + finish.height * 0.2);
    ctx.lineTo(finish.x + 4, finish.y + finish.height * 0.4);
    ctx.closePath();
    ctx.fill();

    meteors.forEach(drawMeteor);

    drawPlayer();

    // Ghost trail from past deaths is tracked in `clones` but intentionally
    // not rendered — kept invisible.

    ctx.restore();
}

// ===================== GAME LOOP =====================

function loop() {
    if (counter > random_controls) {
        change_controls = !change_controls;
        counter = 0;
    }

    if (time > paywall_timer) {
        time = 0;
        alert("pay up");
        let paid = Math.floor(Math.random() * 2) + 1;
        if (paid === 1) {
            alert("you didn't pay");
            death();
        } else {
            alert("ty");
        }
    }

    time++;
    meteor_time++;
    counter++;

    if (!diceDeathActive && !hasWon) {
        diceDeathTime++;
        if (diceDeathTime > diceDeathTimer) {
            triggerDiceDeathEvent();
        }
    }

    updateMovingPlatforms();
    move();

    camera.x = player.x - canvas.width / 2 + player.width / 2;
    camera.y = player.y - canvas.height / 2 + player.height / 2;
    camera.x = Math.max(0, Math.min(camera.x, WORLD_WIDTH - canvas.width));
    camera.y = Math.max(0, Math.min(camera.y, WORLD_HEIGHT - canvas.height));

    if (meteor_time > meteor_timer) {
        meteor_time = 0;
        meteors.push({
            x: randint(camera.x, camera.x + canvas.width - 50),
            y: camera.y,
            width: randint(20, 50),
            height: randint(20, 50),
            dx: randint(-3, 3),
            dy: randint(2, 5),
            shape: makeMeteorShape(),
        });
    }

    draw();
    requestAnimationFrame(loop);
}

loop();
