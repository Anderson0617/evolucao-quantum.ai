/**
 * CityScene.js
 * Implements the cyclical cutscene where two cats alternate between life and
 * death under a looping car crash, guiding the player through Quantum City.
 */
import Phaser from "phaser";
import { getAbsoluteBaseUrl } from "../../utils/baseUrl";

const WALK_SPEED = 180;
const ARROW_OFFSET_Y = -48;
const MIN_CAT_DISTANCE = 260;
const CORPSE_SCALE = 0.12;
const CORPSE_GROUND_OFFSET = 12;
const ALIVE_CAT_SCALE = 32 / 480;

const CatKeys = {
  A: "A",
  B: "B",
};

class CityScene extends Phaser.Scene {
  constructor() {
    super("CityScene");

    this.virtualInput = {
      up: false,
      down: false,
      left: false,
      right: false,
    };

    this.streetPositions = [];
    this.catSlots = {};
    this.cats = {};
    this.triggerZones = {};
    this.waitingForPlayerKey = null;
    this.currentCat = null;
    this.loopFlag = false;
    this.completedLoops = 0;
    this.arrow = null;
    this.arrowPulse = null;
    this.arrowTarget = null;
    this.car = null;
    this.carCollider = null;
  }

  preload() {
    const baseUrl = getAbsoluteBaseUrl();
    this.load.setBaseURL(baseUrl);
    this.load.setPath("phaser/");

    this.load.image("city-backdrop", "cidade-fundo.jpg");
    this.load.image("city-robot", "robo.png");
    this.load.image("cat-sprite", "gato-vivo.png");
    this.load.image("cat-corpse", "morto.png");
    this.load.image("car-sprite", "car.png");
    this.load.audio("crash-sfx", "gato.mp3");
  }

  create() {
    this.eventsBus = this.game.events;
    this.eventsBus.on("city:virtual", this.handleVirtualInput, this);
    this.events.once("shutdown", this.handleSceneShutdown, this);
    this.events.once("destroy", this.handleSceneShutdown, this);

    this.createProceduralTextures();

    const background = this.add.image(0, 0, "city-backdrop").setOrigin(0);
    const worldWidth = background.width || this.scale.width;
    const worldHeight = background.height || this.scale.height;

    this.physics.world.setBounds(0, 0, worldWidth, worldHeight);
    this.cameras.main.setBounds(0, 0, worldWidth, worldHeight);

    this.player = this.physics.add
      .sprite(worldWidth * 0.18, worldHeight * 0.65, "city-robot")
      .setScale(0.12)
      .setDepth(10)
      .setCollideWorldBounds(true);

    const bodyWidth = 28;
    const bodyHeight = 32;
    const offsetX = this.player.displayWidth * 0.5 - bodyWidth / 2;
    const offsetY = this.player.displayHeight - bodyHeight;
    this.player.body.setSize(bodyWidth, bodyHeight).setOffset(offsetX, offsetY);

    this.cameras.main.startFollow(this.player, true, 0.18, 0.18);

    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
    });
    this.actionKeys = this.input.keyboard.addKeys({
      primary: Phaser.Input.Keyboard.KeyCodes.SPACE,
      secondary: Phaser.Input.Keyboard.KeyCodes.E,
    });

    this.streetPositions = this.buildStreetPositions(worldWidth, worldHeight);

    const defaultA =
      this.streetPositions[0] ?? new Phaser.Math.Vector2(worldWidth * 0.32, worldHeight * 0.64);
    const defaultB =
      this.streetPositions[1] ?? new Phaser.Math.Vector2(worldWidth * 0.62, worldHeight * 0.28);

    this.catSlots = {
      [CatKeys.A]: { position: defaultA.clone() },
      [CatKeys.B]: { position: defaultB.clone() },
    };

    this.cats = {
      [CatKeys.A]: this.createCat(CatKeys.A, defaultA),
      [CatKeys.B]: this.createCat(CatKeys.B, defaultB),
    };

    this.triggerZones = {
      [CatKeys.A]: new Phaser.Geom.Circle(defaultA.x, defaultA.y, 80),
      [CatKeys.B]: new Phaser.Geom.Circle(defaultB.x, defaultB.y, 92),
    };

    this.assignRandomPosition(CatKeys.A, { avoidOther: false });
    this.assignRandomPosition(CatKeys.B, { avoidOther: true });

    this.setCatState(CatKeys.A, "alive");
    this.setCatState(CatKeys.B, "hidden");

    this.arrow = this.add
      .sprite(this.player.x, this.player.y + ARROW_OFFSET_Y, "loop-arrow")
      .setDepth(12)
      .setVisible(false)
      .setAlpha(0);

    this.time.delayedCall(450, () => {
      this.beginCatCycle(CatKeys.A, { initial: true });
    });

    this.scale.on(Phaser.Scale.Events.RESIZE, this.handleResize, this);
  }

  update() {
    this.updatePlayerMovement();
    this.checkTriggerZones();
    this.updateArrowPosition();
  }

  createProceduralTextures() {
    if (!this.textures.exists("loop-arrow")) {
      const arrowGraphics = this.make.graphics({ add: false });
      arrowGraphics.fillStyle(0xffec58, 1);
      arrowGraphics.fillRoundedRect(0, 12, 74, 16, 8);
      arrowGraphics.fillTriangle(74, 0, 106, 20, 74, 40);
      arrowGraphics.lineStyle(3, 0xe48d25, 0.9);
      arrowGraphics.strokeRoundedRect(0, 12, 74, 16, 8);
      arrowGraphics.strokeTriangle(74, 0, 106, 20, 74, 40);
      arrowGraphics.generateTexture("loop-arrow", 106, 40);
      arrowGraphics.destroy();
    }

  }

  createCat(key, position) {
    const aliveSprite = this.physics.add
      .staticSprite(position.x, position.y, "cat-sprite")
      .setDepth(8)
      .setScale(ALIVE_CAT_SCALE)
      .setOrigin(0.5, 1);
    aliveSprite.refreshBody();

    const corpseSprite = this.add
      .sprite(position.x, position.y + CORPSE_GROUND_OFFSET, "cat-corpse")
      .setOrigin(0.5, 1)
      .setScale(CORPSE_SCALE);
    corpseSprite.setDepth(7);
    corpseSprite.setVisible(false);

    return {
      key,
      position: position.clone(),
      positionIndex: -1,
      aliveSprite,
      corpseSprite,
      state: "hidden",
    };
  }

  buildStreetPositions(worldWidth, worldHeight) {
    return [
      new Phaser.Math.Vector2(worldWidth * 0.18, worldHeight * 0.78),
      new Phaser.Math.Vector2(worldWidth * 0.32, worldHeight * 0.66),
      new Phaser.Math.Vector2(worldWidth * 0.48, worldHeight * 0.74),
      new Phaser.Math.Vector2(worldWidth * 0.62, worldHeight * 0.68),
      new Phaser.Math.Vector2(worldWidth * 0.78, worldHeight * 0.6),
      new Phaser.Math.Vector2(worldWidth * 0.86, worldHeight * 0.44),
      new Phaser.Math.Vector2(worldWidth * 0.74, worldHeight * 0.28),
      new Phaser.Math.Vector2(worldWidth * 0.56, worldHeight * 0.22),
      new Phaser.Math.Vector2(worldWidth * 0.38, worldHeight * 0.26),
      new Phaser.Math.Vector2(worldWidth * 0.24, worldHeight * 0.38),
      new Phaser.Math.Vector2(worldWidth * 0.12, worldHeight * 0.54),
      new Phaser.Math.Vector2(worldWidth * 0.88, worldHeight * 0.72),
    ];
  }

  setCatState(key, state) {
    const cat = this.cats[key];
    if (!cat) {
      return;
    }
    cat.state = state;

    if (state === "alive") {
      cat.aliveSprite.setVisible(true);
      cat.aliveSprite.body.enable = true;
      cat.aliveSprite.refreshBody();
      cat.corpseSprite.setVisible(false);
    } else if (state === "dead") {
      cat.aliveSprite.setVisible(false);
      cat.aliveSprite.body.enable = false;
      cat.corpseSprite.setVisible(true);
    } else {
      cat.aliveSprite.setVisible(false);
      cat.aliveSprite.body.enable = false;
      cat.corpseSprite.setVisible(false);
    }
  }

  assignRandomPosition(catKey, { avoidOther = true } = {}) {
    const cat = this.cats[catKey];
    if (!cat || this.streetPositions.length === 0) {
      return;
    }

    const otherKey = catKey === CatKeys.A ? CatKeys.B : CatKeys.A;
    const forbidden = new Set();
    const otherCat = avoidOther ? this.cats[otherKey] : null;
    const minDistance = MIN_CAT_DISTANCE;

    if (typeof cat.positionIndex === "number" && cat.positionIndex >= 0) {
      forbidden.add(cat.positionIndex);
    }

    if (avoidOther) {
      const otherCat = this.cats[otherKey];
      if (otherCat && typeof otherCat.positionIndex === "number" && otherCat.positionIndex >= 0) {
        forbidden.add(otherCat.positionIndex);
      }
    }

    const candidates = this.streetPositions.map((pos, index) => ({ pos, index })).filter((entry) => {
      if (forbidden.has(entry.index)) {
        return false;
      }
      if (
        avoidOther &&
        otherCat &&
        otherCat.position &&
        typeof otherCat.position.x === "number" &&
        typeof otherCat.position.y === "number"
      ) {
        const distance = Phaser.Math.Distance.Between(
          entry.pos.x,
          entry.pos.y,
          otherCat.position.x,
          otherCat.position.y
        );
        if (distance < minDistance) {
          return false;
        }
      }
      return true;
    });

    const fallbackIndex = cat.positionIndex >= 0 ? cat.positionIndex : 0;
    const fallbackPos = this.streetPositions[fallbackIndex] ?? this.streetPositions[0];

    let choice = null;
    if (candidates.length > 0) {
      choice = Phaser.Utils.Array.GetRandom(candidates);
    } else if (
      avoidOther &&
      otherCat &&
      otherCat.position &&
      typeof otherCat.position.x === "number" &&
      typeof otherCat.position.y === "number"
    ) {
      const widest = this.streetPositions
        .map((pos, index) => ({ pos, index }))
        .filter((entry) => entry.index !== otherCat.positionIndex)
        .reduce(
          (best, entry) => {
            const distance = Phaser.Math.Distance.Between(
              entry.pos.x,
              entry.pos.y,
              otherCat.position.x,
              otherCat.position.y
            );
            if (!best || distance > best.distance) {
              return { entry, distance };
            }
            return best;
          },
          null
        );
      if (widest && widest.entry) {
        choice = widest.entry;
      }
    }

    if (!choice) {
      choice = { pos: fallbackPos, index: fallbackIndex };
    }

    if (!choice || !choice.pos) {
      return;
    }

    const { pos, index } = choice;
    const newPos =
      pos instanceof Phaser.Math.Vector2
        ? pos.clone()
        : new Phaser.Math.Vector2(pos.x, pos.y);

    if (!this.catSlots[catKey]) {
      this.catSlots[catKey] = { position: new Phaser.Math.Vector2() };
    }
    this.catSlots[catKey].position.set(newPos.x, newPos.y);

    cat.position = newPos.clone();
    cat.positionIndex = index;

    cat.aliveSprite.setPosition(newPos.x, newPos.y);
    cat.aliveSprite.refreshBody();
    cat.corpseSprite
      .setPosition(newPos.x, newPos.y + CORPSE_GROUND_OFFSET)
      .setOrigin(0.5, 1);

    const radius = catKey === CatKeys.A ? 80 : 92;
    this.triggerZones[catKey] = new Phaser.Geom.Circle(newPos.x, newPos.y, radius);
  }

  updatePlayerMovement() {
    const direction = new Phaser.Math.Vector2(0, 0);

    if (this.cursors.left?.isDown || this.wasd.left?.isDown || this.virtualInput.left) {
      direction.x -= 1;
    }
    if (this.cursors.right?.isDown || this.wasd.right?.isDown || this.virtualInput.right) {
      direction.x += 1;
    }
    if (this.cursors.up?.isDown || this.wasd.up?.isDown || this.virtualInput.up) {
      direction.y -= 1;
    }
    if (this.cursors.down?.isDown || this.wasd.down?.isDown || this.virtualInput.down) {
      direction.y += 1;
    }

    if (direction.lengthSq() > 0) {
      direction.normalize().scale(WALK_SPEED);
      this.player.setVelocity(direction.x, direction.y);
      if (direction.x !== 0) {
        this.player.setFlipX(direction.x < 0);
      }
    } else {
      this.player.setVelocity(0, 0);
    }

    if (
      this.waitingForPlayerKey === CatKeys.B &&
      (Phaser.Input.Keyboard.JustDown(this.actionKeys.primary) ||
        Phaser.Input.Keyboard.JustDown(this.actionKeys.secondary)) &&
      this.isPlayerInsideZone(CatKeys.A)
    ) {
      this.triggerNextCat(CatKeys.B);
    }
  }

  checkTriggerZones() {
    if (!this.waitingForPlayerKey) {
      return;
    }
    if (this.isPlayerInsideZone(this.waitingForPlayerKey)) {
      this.triggerNextCat(this.waitingForPlayerKey);
    }
  }

  isPlayerInsideZone(catKey) {
    const zone = this.triggerZones[catKey];
    if (!zone) {
      return false;
    }
    return Phaser.Geom.Circle.Contains(zone, this.player.x, this.player.y);
  }

  beginCatCycle(catKey, { initial = false } = {}) {
    this.currentCat = catKey;
    const delay = initial ? 200 : 420;
    this.time.delayedCall(delay, () => {
      this.launchCarFor(catKey);
    });
  }

  launchCarFor(catKey) {
    const cat = this.cats[catKey];
    if (!cat) {
      return;
    }

    this.clearCar();

    const midpoint = this.physics.world.bounds.width * 0.5;
    let fromLeft = cat.position.x < midpoint;
    if (Math.random() < 0.3) {
      fromLeft = !fromLeft;
    }

    const spawnX = fromLeft ? -160 : this.physics.world.bounds.width + 160;
    const spawnY = cat.position.y;

    this.car = this.physics.add.sprite(spawnX, spawnY, "car-sprite").setDepth(9);
    this.car.body.setAllowGravity(false);
    this.car.body.setSize(40, 18);
    this.car.body.setOffset(6, 9);
    this.car.setFlipX(!fromLeft);

    const speed = 280;
    this.car.setVelocityX(fromLeft ? speed : -speed);

    this.carCollider = this.physics.add.overlap(
      this.car,
      cat.aliveSprite,
      () => this.handleCatDeath(catKey),
      undefined,
      this
    );
  }

  handleCatDeath(catKey) {
    const cat = this.cats[catKey];
    if (!cat || cat.state !== "alive") {
      return;
    }

    this.setCatState(catKey, "dead");

    if (this.carCollider) {
      this.physics.world.removeCollider(this.carCollider);
      this.carCollider = null;
    }

    if (this.car) {
      const exitX =
        this.car.body.velocity.x >= 0
          ? this.physics.world.bounds.width + 220
          : -220;
      this.tweens.add({
        targets: this.car,
        x: exitX,
        alpha: 0,
        duration: 640,
        ease: "Sine.easeIn",
        onComplete: () => this.clearCar(),
      });
    }

    const crashSound = this.sound.get("crash-sfx");
    if (crashSound) {
      crashSound.play({ volume: 0.7 });
    } else if (this.sound.locked === false) {
      this.sound.play("crash-sfx", { volume: 0.7 });
    }

    if (catKey === CatKeys.B) {
      this.loopFlag = true;
    } else if (this.loopFlag) {
      this.completedLoops += 1;
      this.loopFlag = false;
    }

    this.prepareNextStep(catKey);
  }

  prepareNextStep(catKey) {
    const nextCat = catKey === CatKeys.A ? CatKeys.B : CatKeys.A;
    this.waitingForPlayerKey = nextCat;
    this.assignRandomPosition(nextCat, { avoidOther: true });
    this.setCatState(nextCat, "hidden");
    this.setArrowTarget(this.catSlots[nextCat].position);
  }

  setArrowTarget(target) {
    this.arrowTarget = target ?? null;

    if (!this.arrowTarget) {
      this.arrow.setVisible(false);
      this.arrow.setAlpha(0);
      if (this.arrowPulse) {
        this.arrowPulse.stop();
        this.arrowPulse = null;
      }
      return;
    }

    this.arrow.setVisible(true);
    this.arrow.setAlpha(0);
    this.arrow.setPosition(this.player.x, this.player.y + ARROW_OFFSET_Y);

    if (this.arrowPulse) {
      this.arrowPulse.stop();
    }
    this.arrowPulse = this.tweens.add({
      targets: this.arrow,
      alpha: { from: 0.3, to: 1 },
      duration: 520,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
  }

  triggerNextCat(catKey) {
    if (this.waitingForPlayerKey !== catKey) {
      return;
    }

    this.waitingForPlayerKey = null;
    this.setArrowTarget(null);

    if (catKey === CatKeys.B) {
      this.setCatState(CatKeys.B, "alive");
    } else {
      this.setCatState(CatKeys.A, "alive");
    }

    this.time.delayedCall(420, () => {
      this.beginCatCycle(catKey);
    });
  }

  clearCar() {
    if (this.carCollider) {
      this.physics.world.removeCollider(this.carCollider);
      this.carCollider = null;
    }
    if (this.car) {
      this.car.destroy();
      this.car = null;
    }
  }

  updateArrowPosition() {
    if (!this.arrow.visible || !this.arrowTarget) {
      return;
    }
    this.arrow.setPosition(this.player.x, this.player.y + ARROW_OFFSET_Y);
    const angle = Phaser.Math.Angle.Between(
      this.player.x,
      this.player.y,
      this.arrowTarget.x,
      this.arrowTarget.y
    );
    this.arrow.setRotation(angle);
  }

  handleVirtualInput(payload = {}) {
    const { direction, pressed } = payload;
    if (!direction || typeof pressed !== "boolean") {
      return;
    }
    if (this.virtualInput[direction] === pressed) {
      return;
    }
    this.virtualInput[direction] = pressed;
  }

  handleSceneShutdown() {
    if (this.eventsBus) {
      this.eventsBus.off("city:virtual", this.handleVirtualInput, this);
    }
    this.scale.off(Phaser.Scale.Events.RESIZE, this.handleResize, this);
    if (this.arrowPulse) {
      this.arrowPulse.stop();
      this.arrowPulse = null;
    }
  }

  emitStatus(message) {
    this.eventsBus?.emit("city:status", message);
  }

  handleResize(gameSize = {}) {
    if (!this.cameras || !this.cameras.main) {
      return;
    }
    const { width = this.scale.width, height = this.scale.height } = gameSize;
    this.cameras.main.setViewport(0, 0, width, height);
  }
}

export default CityScene;
