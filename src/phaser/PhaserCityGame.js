/**
 * PhaserCityGame.js
 * Factory that mounts the Phaser Quantum City experience and returns
 * lifecycle controls for pause/resume/destroy.
 */
import Phaser from "phaser";
import BootScene from "./scenes/BootScene";
import CityScene from "./scenes/CityScene";
import UIScene from "./scenes/UIScene";

export default function mountPhaserCity(
  containerElement,
  { onStatusChange, pixelArt = true, backgroundColor = "#0c1220" } = {}
) {
  if (!containerElement) {
    throw new Error("A container element is required to mount the city.");
  }

  const width = containerElement.clientWidth || 960;
  const height = containerElement.clientHeight || 540;

  const game = new Phaser.Game({
    type: Phaser.WEBGL,
    parent: containerElement,
    width,
    height,
    backgroundColor,
    pixelArt,
    roundPixels: true,
    antialias: false,
    failIfMajorPerformanceCaveat: true,
    physics: {
      default: "arcade",
      arcade: {
        gravity: { y: 0 },
        debug: false,
      },
    },
    audio: {
      noAudio: true,
      disableWebAudio: true,
    },
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      expandParent: false,
    },
    scene: [BootScene, CityScene, UIScene],
  });

  let paused = false;
  let destroyed = false;
  const audioUnlockHandler = async () => {
    if (!game.sound || !game.sound.context) {
      return false;
    }
    const { context } = game.sound;
    try {
      if (context.state === "suspended") {
        await context.resume();
      }
      if (game.sound.locked) {
        game.sound.unlock();
      }
      return context.state === "running";
    } catch {
      return false;
    }
  };

  const removeUnlockListeners = () => {
    window.removeEventListener("pointerdown", unlockAudio);
    window.removeEventListener("touchstart", unlockAudio);
    window.removeEventListener("keydown", unlockAudio);
  };

  const unlockAudio = async (event) => {
    if (event?.isTrusted === false) {
      return;
    }
    const unlocked = await audioUnlockHandler();
    if (unlocked) {
      removeUnlockListeners();
    }
  };

  window.addEventListener("pointerdown", unlockAudio, { passive: true });
  window.addEventListener("touchstart", unlockAudio, { passive: true });
  window.addEventListener("keydown", unlockAudio);

  const statusListener =
    typeof onStatusChange === "function" ? (status) => onStatusChange(status) : null;

  if (statusListener) {
    game.events.on("city:status", statusListener);
  }

  const targetScenes = ["CityScene", "UIScene"];

  const pauseSceneWhenActive = (key) => {
    const scene = game.scene.getScene(key);
    if (!scene) {
      return;
    }
    const { status } = scene.sys.settings;
    if (status === Phaser.Scenes.RUNNING) {
      game.scene.pause(key);
      return;
    }
    if (status < Phaser.Scenes.RUNNING) {
      const handleStart = () => {
        if (!destroyed && paused) {
          game.scene.pause(key);
        }
      };
      scene.events.once(Phaser.Scenes.Events.START, handleStart);
    }
  };

  const resumeSceneIfPaused = (key) => {
    if (game.scene.isPaused(key)) {
      game.scene.resume(key);
    }
  };

  const resizeListener = (gameSize) => {
    targetScenes.forEach((key) => {
      const scene = game.scene.getScene(key);
      if (scene && typeof scene.handleResize === "function") {
        scene.handleResize(gameSize);
      }
    });
  };

  game.scale.on(Phaser.Scale.Events.RESIZE, resizeListener);
  resizeListener({ width, height });

  const handle = {
    pause: () => {
      if (destroyed || paused) {
        return;
      }
      paused = true;
      targetScenes.forEach(pauseSceneWhenActive);
    },
    resume: () => {
      if (destroyed || !paused) {
        return;
      }
      paused = false;
      targetScenes.forEach(resumeSceneIfPaused);
    },
    destroy: () => {
      if (destroyed) {
        return;
      }
      destroyed = true;
      document.removeEventListener("visibilitychange", visibilityListener);
      removeUnlockListeners();
      game.scale.off(Phaser.Scale.Events.RESIZE, resizeListener);
      if (statusListener) {
        game.events.off("city:status", statusListener);
      }
      game.destroy(true);
    },
  };

  const visibilityListener = () => {
    if (document.hidden) {
      handle.pause();
    } else {
      handle.resume();
    }
  };

  document.addEventListener("visibilitychange", visibilityListener);

  return handle;
}
