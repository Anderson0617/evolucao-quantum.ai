/**
 * UIScene.js
 * Overlay HUD for controls and contextual narration. Listens to the
 * shared event bus to synchronise text with the CityScene storyline.
 */
import Phaser from "phaser";

class UIScene extends Phaser.Scene {
  constructor() {
    super("UIScene");
    this.statusMessage = "";
    this.virtualDirections = ["up", "down", "left", "right"];
    this.pointerAssignments = new Map();
    this.directionControllers = new Map();
    this.directionCounts = new Map();
    this.virtualDirections.forEach((direction) => {
      this.directionCounts.set(direction, 0);
    });
  }

  create() {
    this.cameras.main.setBackgroundColor("rgba(0,0,0,0)");
    this.eventsBus = this.game.events;

    this.statusText = this.add
      .text(24, 24, this.statusMessage, {
        fontFamily: "monospace",
        fontSize: "18px",
        color: "rgba(0, 246, 255, 0.0)",
        wordWrap: { width: 380 },
      })
      .setScrollFactor(0);

    this.hintsText = null;

    this.virtualButtons = {
      up: this.createArrowButton("up", "^"),
      down: this.createArrowButton("down", "v"),
      left: this.createArrowButton("left", "<"),
      right: this.createArrowButton("right", ">"),
    };

    this.input.on("pointerup", this.handleGlobalPointerUp, this);
    this.input.on("pointerupoutside", this.handleGlobalPointerUp, this);
    this.input.on("pointercancel", this.handleGlobalPointerUp, this);
    this.input.on("gameout", this.handleGlobalPointerUp, this);

    this.eventsBus.on("city:status", this.updateStatus, this);

    this.scale.on(Phaser.Scale.Events.RESIZE, this.handleResize, this);
    this.handleResize({ width: this.scale.width, height: this.scale.height });

    this.events.on("shutdown", this.handleShutdown, this);
    this.events.on("destroy", this.handleShutdown, this);
  }

  getPointerKey(pointer) {
    if (!pointer) {
      return "__default__";
    }
    return pointer.id !== undefined ? `p-${pointer.id}` : "__default__";
  }

  emitDirectionState(direction, pressed) {
    this.eventsBus?.emit("city:virtual", { direction, pressed });
  }

  animateDirection(direction, pressed) {
    const controller = this.directionControllers.get(direction);
    if (!controller) {
      return;
    }
    const { circle, arrow, bobTween, baseY } = controller;
    controller.scaleTween?.stop();
    controller.scaleTween = null;
    if (pressed) {
      bobTween?.pause();
      circle.setY(baseY);
      arrow.setY(baseY);
      circle.setScale(1);
      arrow.setScale(1);
      const tween = this.tweens.add({
        targets: [circle, arrow],
        scale: 1.12,
        duration: 120,
        ease: "Sine.easeOut",
        onComplete: () => {
          if (controller.scaleTween === tween) {
            controller.scaleTween = null;
          }
        },
      });
      controller.scaleTween = tween;
    } else {
      bobTween?.resume();
      const currentScale = circle.scale;
      if (currentScale !== 1) {
        circle.setScale(currentScale);
        arrow.setScale(currentScale);
      }
      const tween = this.tweens.add({
        targets: [circle, arrow],
        scale: 1,
        duration: 160,
        ease: "Sine.easeOut",
        onComplete: () => {
          if (controller.scaleTween === tween) {
            controller.scaleTween = null;
          }
        },
      });
      controller.scaleTween = tween;
    }
  }

  pressDirection(direction, pointer) {
    const pointerKey = this.getPointerKey(pointer);
    const currentDirection = this.pointerAssignments.get(pointerKey);
    if (currentDirection === direction) {
      return;
    }
    if (currentDirection) {
      this.releasePointer(pointerKey);
    }
    this.pointerAssignments.set(pointerKey, direction);
    const nextCount = (this.directionCounts.get(direction) || 0) + 1;
    this.directionCounts.set(direction, nextCount);
    if (nextCount === 1) {
      this.animateDirection(direction, true);
      this.emitDirectionState(direction, true);
    }
  }

  releasePointer(pointerKey) {
    const direction = this.pointerAssignments.get(pointerKey);
    if (!direction) {
      return;
    }
    this.pointerAssignments.delete(pointerKey);
    const currentCount = this.directionCounts.get(direction) || 0;
    const nextCount = Math.max(0, currentCount - 1);
    this.directionCounts.set(direction, nextCount);
    if (nextCount === 0) {
      this.animateDirection(direction, false);
      this.emitDirectionState(direction, false);
    }
  }

  handleGlobalPointerUp(pointer) {
    const pointerKey = this.getPointerKey(pointer);
    this.releasePointer(pointerKey);
  }

  updateStatus(message) {
    this.statusMessage = message;
    if (this.statusText) {
      this.statusText.setText(message);
    }
  }

  handleShutdown() {
    if (this.eventsBus) {
      this.eventsBus.off("city:status", this.updateStatus, this);
      ["up", "down", "left", "right"].forEach((direction) => {
        this.eventsBus.emit("city:virtual", { direction, pressed: false });
      });
    }
    if (this.input) {
      this.input.off("pointerup", this.handleGlobalPointerUp, this);
      this.input.off("pointerupoutside", this.handleGlobalPointerUp, this);
      this.input.off("pointercancel", this.handleGlobalPointerUp, this);
      this.input.off("gameout", this.handleGlobalPointerUp, this);
    }
    this.scale.off(Phaser.Scale.Events.RESIZE, this.handleResize, this);
    const pointerKeys = Array.from(this.pointerAssignments.keys());
    pointerKeys.forEach((key) => this.releasePointer(key));
    this.pointerAssignments.clear();
    this.directionCounts.forEach((_, direction) => {
      this.directionCounts.set(direction, 0);
      this.animateDirection(direction, false);
    });
    this.directionControllers.forEach((controller) => {
      controller.bobTween?.stop();
      controller.scaleTween?.stop();
      controller.scaleTween = null;
      controller.circle.setScale(1);
      controller.arrow.setScale(1);
      controller.circle.setY(controller.baseY);
      controller.arrow.setY(controller.baseY);
    });
    this.directionControllers.clear();
  }

  createArrowButton(direction, label) {
    const buttonRadius = 44;
    const buttonSize = buttonRadius * 2 + 6;

    const circle = this.add
      .circle(0, 0, buttonRadius, 0x041124, 0.58)
      .setStrokeStyle(2, 0x00f6ff, 0.65)
      .setScrollFactor(0);

    const arrow = this.add
      .text(0, 0, label, {
        fontFamily: "monospace",
        fontSize: "32px",
        color: "rgba(0, 246, 255, 0.85)",
      })
      .setOrigin(0.5)
      .setScrollFactor(0);

    const zone = this.add
      .zone(0, 0, buttonSize, buttonSize)
      .setOrigin(0.5)
      .setScrollFactor(0);
    zone.setInteractive();

    this.directionControllers.set(direction, {
      circle,
      arrow,
      zone,
      baseY: 0,
      bobTween: null,
      scaleTween: null,
    });

    zone.on("pointerdown", (pointer) => {
      this.pressDirection(direction, pointer);
    });

    zone.on("pointerup", (pointer) => {
      this.handleGlobalPointerUp(pointer);
    });

    zone.on("pointerupoutside", (pointer) => {
      this.handleGlobalPointerUp(pointer);
    });

    zone.on("pointercancel", (pointer) => {
      this.handleGlobalPointerUp(pointer);
    });

    zone.on("pointerover", (pointer) => {
      if (pointer.isDown) {
        this.pressDirection(direction, pointer);
      }
      this.tweens.add({
        targets: circle,
        alpha: 0.78,
        duration: 140,
        ease: "Sine.easeOut",
      });
    });

    zone.on("pointerout", () => {
      this.tweens.add({
        targets: circle,
        alpha: 0.58,
        duration: 140,
        ease: "Sine.easeIn",
      });
    });

    this.events.once("shutdown", () => {
      const controller = this.directionControllers.get(direction);
      controller?.bobTween?.stop();
      controller?.scaleTween?.stop();
      this.directionControllers.delete(direction);
    });

    return {
      circle,
      arrow,
      zone,
    };
  }

  positionVirtualButtons(width, height) {
    const padX = width - 120;
    const padY = height - 140;
    const positions = {
      up: [padX, padY - 76],
      down: [padX, padY + 76],
      left: [padX - 76, padY],
      right: [padX + 76, padY],
    };

    Object.entries(positions).forEach(([direction, [posX, posY]]) => {
      const controller = this.directionControllers.get(direction);
      if (!controller) {
        return;
      }
      controller.baseY = posY;
      controller.circle.setPosition(posX, posY);
      controller.arrow.setPosition(posX, posY);
      controller.zone.setPosition(posX, posY);
      controller.bobTween?.stop();
      controller.bobTween = this.tweens.add({
        targets: [controller.circle, controller.arrow],
        y: posY + 4,
        duration: 1800,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });
    });
  }

  handleResize(gameSize = {}) {
    const { width = this.scale.width, height = this.scale.height } = gameSize;
    this.positionVirtualButtons(width, height);
  }
}

export default UIScene;
