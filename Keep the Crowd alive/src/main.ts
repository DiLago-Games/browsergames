import Phaser from 'phaser';
import { GameScene } from './scenes/GameScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.WEBGL,
  width: 1280,
  height: 720,
  parent: 'game',
  backgroundColor: '#05040d',
  scene: [GameScene],
  render: { pixelArt: false, antialias: true },
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH }
};

new Phaser.Game(config);
