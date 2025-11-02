/**
 * BootScene.js
 * Loads every asset required by the Quantum City simulation before
 * handing control to the City and UI scenes.
 */
import Phaser from "phaser";
import { getAbsoluteBaseUrl } from "../../utils/baseUrl";

class BootScene extends Phaser.Scene {
  constructor() {
    super("BootScene");
  }

  preload() {
    const baseUrl = getAbsoluteBaseUrl();
    this.load.setBaseURL(baseUrl);
    this.load.setPath("phaser/");
  }

  create() {
    this.scene.start("CityScene");
    this.scene.launch("UIScene");
  }
}

export default BootScene;




