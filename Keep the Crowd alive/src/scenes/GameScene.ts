import Phaser from 'phaser';
import { ARENA_ZONES, PATH_NODES, PATHS, ARENA_WORLD_OFFSET } from '../data/arenaConfig';
import { ArenaRenderer } from '../systems/ArenaRenderer';
import { CrowdFlowSystem } from '../systems/CrowdFlowSystem';
import { BeatClock } from '../systems/BeatClock';
import { CROWD_LIGHT_CONFIG } from '../data/crowdLightConfig';

const nodesById = new Map(PATH_NODES.map(n => [n.id, n]));
const pathsById = new Map(PATHS.map(p => [p.id, p]));

export class GameScene extends Phaser.Scene {
  private arenaRenderer!: ArenaRenderer;
  private crowdSystem!: CrowdFlowSystem;
  private beatClock!: BeatClock;
  private hype = 0.45;
  private wave = 1;
  private waveActive = false;
  private enemies: Array<{ x: number; y: number; pathIndex: number; speed: number; health: number }> = [];
  private towers: Array<{ x: number; y: number; type: string; cooldown: number }> = [];
  private projectiles: Array<{ x: number; y: number; target: any; speed: number; damage: number }> = [];
  private waveTimer = 0;
  private spawnCounter = 0;
  private enemiesToSpawn = 0;
  private graphics!: Phaser.GameObjects.Graphics;
  private debugText!: Phaser.GameObjects.Text;
  private lastTime = 0;

  constructor() {
    super({ key: 'GameScene' });
  }

  create() {
    this.lastTime = this.time.now;
    this.graphics = this.add.graphics();
    this.debugText = this.add.text(16, 16, '', { fontSize: '16px', color: '#0ff', backgroundColor: '#0008' });
    this.arenaRenderer = new ArenaRenderer(this);
    this.crowdSystem = new CrowdFlowSystem(this);
    this.beatClock = new BeatClock(128);

    this.cameras.main.setZoom(1);
    this.setupInput();
    this.startWave(1);

    this.input.on('gameobjectdown', (pointer, gameObject) => {
      // Check if clicked on a valid tower placement zone
      const world = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
      this.tryPlaceTower(world.x, world.y);
    });
  }

  private setupInput() {
    this.input.keyboard?.on('keydown-H', () => { this.hype = Phaser.Math.Clamp(this.hype + 0.1, 0, 1); });
    this.input.keyboard?.on('keydown-L', () => { this.hype = Phaser.Math.Clamp(this.hype - 0.1, 0, 1); });
    this.input.keyboard?.on('keydown-P', () => { this.crowdSystem.triggerPanic('north'); });
    this.input.keyboard?.on('keydown-SPACE', () => { this.startWave(this.wave + 1); });
    this.input.on('pointerdown', (p) => {
      const world = this.cameras.main.getWorldPoint(p.x, p.y);
      this.tryPlaceTower(world.x, world.y);
    });
  }

  private tryPlaceTower(wx: number, wy: number) {
    const ax = wx - ARENA_WORLD_OFFSET.x;
    const ay = wy - ARENA_WORLD_OFFSET.y;
    // Check tower zones
    for (const zone of ARENA_ZONES) {
      if (!zone.buildable) continue;
      if (zone.width && zone.height) {
        const dx = Math.abs(ax - zone.center.x);
        const dy = Math.abs(ay - zone.center.y);
        if (dx < zone.width/2 && dy < zone.height/2) {
          this.towers.push({ x: zone.center.x, y: zone.center.y, type: 'bass', cooldown: 0 });
          this.add.text(zone.center.x + ARENA_WORLD_OFFSET.x, zone.center.y + ARENA_WORLD_OFFSET.y, 'B', { fontSize: '20px', color: '#0f0' }).setOrigin(0.5);
        }
      }
    }
  }

  private startWave(n: number) {
    this.wave = n;
    this.waveActive = true;
    this.enemiesToSpawn = 3 + n * 2;
    this.spawnCounter = 0;
    this.waveTimer = 0;
  }

  private spawnEnemy() {
    const paths = ['ENEMY_NORTH', 'ENEMY_EAST', 'ENEMY_SOUTH', 'ENEMY_WEST'];
    const pathId = Phaser.Utils.Array.GetRandom(paths);
    const path = pathsById.get(pathId);
    if (!path) return;
    const firstNodeId = path.nodeIds[0];
    const firstNode = nodesById.get(firstNodeId);
    if (!firstNode) return;

    this.enemies.push({
      x: firstNode.position.x,
      y: firstNode.position.y,
      pathIndex: 0,
      speed: 60 + this.wave * 5,
      health: 20 + this.wave * 10
    });
  }

  private updateEnemies(deltaMs: number) {
    if (this.waveActive && this.spawnCounter < this.enemiesToSpawn) {
      this.waveTimer += deltaMs;
      if (this.waveTimer > 1500) {
        this.spawnEnemy();
        this.spawnCounter++;
        this.waveTimer = 0;
      }
    }

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      // Simple path following: just move towards stage core along diagonal
      const dx = -e.x; const dy = -e.y;
      const dist = Math.sqrt(dx*dx + dy*dy);
      if (dist > 5) {
        const move = (e.speed * deltaMs) / 1000;
        e.x += (dx/dist) * move;
        e.y += (dy/dist) * move;
      }
      // Check if reached inner dance floor (radius ~200)
      if (dist < 200) {
        // Damage crowd
        const crowdCount = this.crowdSystem.getCount();
        const damage = Math.floor(crowdCount * 0.05); // 5% of crowd per hit
        // We'll just reduce crowd by killing random visitors
        // (simplified: no actual health tracking, just visitor destruction)
        this.hype = Math.max(0, this.hype - 0.1);
        this.enemies.splice(i, 1);
        continue;
      }
    }

    // Towers shoot
    for (const t of this.towers) {
      t.cooldown -= deltaMs;
      if (t.cooldown <= 0) {
        // Find nearest enemy within range
        let nearest: any = null;
        let nearestDist = 300;
        for (const e of this.enemies) {
          const d = Math.hypot(e.x - t.x, e.y - t.y);
          if (d < nearestDist) { nearestDist = d; nearest = e; }
        }
        if (nearest) {
          this.projectiles.push({ x: t.x, y: t.y, target: nearest, speed: 200, damage: 10 + this.wave });
          t.cooldown = 800;
        }
      }
    }

    // Update projectiles
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      const dx = p.target.x - p.x;
      const dy = p.target.y - p.y;
      const dist = Math.sqrt(dx*dx + dy*dy);
      if (dist < 15) {
        p.target.health -= p.damage;
        this.projectiles.splice(i, 1);
        if (p.target.health <= 0) {
          const idx = this.enemies.indexOf(p.target);
          if (idx > -1) this.enemies.splice(idx, 1);
        }
      } else {
        p.x += (dx/dist) * p.speed * (deltaMs/1000);
        p.y += (dy/dist) * p.speed * (deltaMs/1000);
      }
    }
  }

  update(_time: number, delta: number) {
    const deltaMs = delta as unknown as number; // actually delta in ms? Phaser delta is ms

    this.beatClock.update(deltaMs);
    const beatValue = this.beatClock.getBeatValue();

    this.crowdSystem.update(deltaMs, this.hype, beatValue);
    this.updateEnemies(deltaMs);

    // Win/lose checks
    const crowdCount = this.crowdSystem.getCount();
    if (crowdCount < 20 && this.hype < 0.1) {
      this.add.text(640, 360, 'SHOW OVER - CROWD GONE', { fontSize: '48px', color: '#f00', backgroundColor: '#000' }).setOrigin(0.5);
      this.scene.pause();
      return;
    }

    if (this.waveActive && this.enemies.length === 0 && this.spawnCounter >= this.enemiesToSpawn) {
      this.waveActive = false;
      this.wave++;
      this.hype = Math.min(1, this.hype + 0.2);
      this.add.text(640, 360, `WAVE ${this.wave-1} COMPLETE!`, { fontSize: '32px', color: '#0f0', backgroundColor: '#000' }).setOrigin(0.5);
      this.time.delayedCall(2000, () => this.startWave(this.wave));
    }

    this.render();
  }

  private render() {
    this.graphics.clear();
    this.arenaRenderer.preRender();
    this.arenaRenderer.render();

    // Draw towers
    this.graphics.fillStyle(0xff00, 0.9);
    for (const t of this.towers) {
      this.graphics.fillRect(t.x + ARENA_WORLD_OFFSET.x - 15, t.y + ARENA_WORLD_OFFSET.y - 15, 30, 30);
    }

    // Draw enemies
    this.graphics.fillStyle(0xff0000, 0.9);
    for (const e of this.enemies) {
      this.graphics.fillCircle(e.x + ARENA_WORLD_OFFSET.x, e.y + ARENA_WORLD_OFFSET.y, 12);
    }

    // Draw projectiles
    this.graphics.fillStyle(0xffff00, 1);
    for (const p of this.projectiles) {
      this.graphics.fillCircle(p.x + ARENA_WORLD_OFFSET.x, p.y + ARENA_WORLD_OFFSET.y, 4);
    }

    // Hype bar
    const barWidth = 300; const barHeight = 20;
    const barX = ARENA_WORLD_OFFSET.x - barWidth/2;
    const barY = 30;
    this.graphics.fillStyle(0x333, 0.8);
    this.graphics.fillRect(barX, barY, barWidth, barHeight);
    this.graphics.fillStyle(this.hype > 0.5 ? 0x00ff00 : this.hype > 0.2 ? 0xffff00 : 0xff0000, 1);
    this.graphics.fillRect(barX, barY, barWidth * this.hype, barHeight);
    this.graphics.lineStyle(2, 0xffffff, 1);
    this.graphics.strokeRect(barX, barY, barWidth, barHeight);

    this.debugText.setText([
      `Wave: ${this.wave}`,
      `Hype: ${(this.hype*100).toFixed(0)}%`,
      `Crowd: ${this.crowdSystem.getCount()}`,
      `Towers: ${this.towers.length}`,
      `Enemies: ${this.enemies.length}`,
      '',
      'Controls:',
      'Click tower decks to build Bass towers',
      'H/L: hype up/down',
      'P: panic north',
      'SPACE: next wave'
    ]);
  }
}
