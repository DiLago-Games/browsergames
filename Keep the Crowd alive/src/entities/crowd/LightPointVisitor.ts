import Phaser from 'phaser';
import {
  PATHS, PATH_NODES, PathDefinition, PathNode, ARENA_WORLD_OFFSET
} from '../data/arenaConfig';
import { CROWD_LIGHT_CONFIG } from '../data/crowdLightConfig';
import { BeatClock } from './BeatClock';

export class LightPointVisitor {
  public id: number;
  public pos: { x: number; y: number };
  private targetNodeIdx: number = 0;
  public pathId: string;
  public state: 'idle' | 'entering' | 'dancing' | 'highHype' | 'panic' = 'entering';
  private circle: Phaser.GameObjects.Arc;
  private glow: Phaser.GameObjects.Arc;
  private beatOffset: number;

  constructor(
    private scene: Phaser.Scene,
    id: number,
    start: { x: number; y: number },
    pathId: string,
    state: LightPointVisitor['state'] = 'entering'
  ) {
    this.id = id;
    this.pos = { ...start };
    this.pathId = pathId;
    this.state = state;
    this.beatOffset = Math.random() * Math.PI * 2;

    const worldX = start.x + ARENA_WORLD_OFFSET.x;
    const worldY = start.y + ARENA_WORLD_OFFSET.y;

    this.glow = scene.add.circle(worldX, worldY, CROWD_LIGHT_CONFIG.baseGlowRadius, CROWD_LIGHT_CONFIG.colors.entering, 0.15);
    this.circle = scene.add.circle(worldX, worldY, CROWD_LIGHT_CONFIG.baseRadius, CROWD_LIGHT_CONFIG.colors.entering, 0.9);
    this.glow.setBlendMode(Phaser.BlendModes.ADD);
    this.circle.setBlendMode(Phaser.BlendModes.ADD);
  }

  update(deltaMs: number, path: PathDefinition, nodes: Map<string, PathNode>, hype: number, beatValue: number) {
    const targetNodeId = path.nodeIds[this.targetNodeIdx];
    if (!targetNodeId) {
      this.applyDrift(deltaMs, hype, beatValue);
      this.render(hype, beatValue);
      return;
    }

    const targetNode = nodes.get(targetNodeId);
    if (!targetNode) return;

    const dx = targetNode.position.x - this.pos.x;
    const dy = targetNode.position.y - this.pos.y;
    const dist = Math.sqrt(dx*dx + dy*dy);

    if (dist < 8) {
      this.targetNodeIdx++;
      return;
    }

    const dirX = dx / dist;
    const dirY = dy / dist;
    const speed = this.getSpeed() * path.speedMultiplier;
    this.pos.x += dirX * speed * (deltaMs / 1000);
    this.pos.y += dirY * speed * (deltaMs / 1000);

    this.render(hype, beatValue);
  }

  private getSpeed(): number {
    switch (this.state) {
      case 'panic': return CROWD_LIGHT_CONFIG.panicSpeed;
      case 'entering': return CROWD_LIGHT_CONFIG.enteringSpeed;
      default: return CROWD_LIGHT_CONFIG.baseSpeed;
    }
  }

  private applyDrift(deltaMs: number, hype: number, beatValue: number) {
    const speed = CROWD_LIGHT_CONFIG.dancingDriftSpeed;
    const intensity = 0.3 + hype * 0.6;
    this.pos.x += Math.cos(performance.now() * 0.003 + this.beatOffset) * speed * intensity * (deltaMs / 1000);
    this.pos.y += Math.sin(performance.now() * 0.003 + this.beatOffset) * speed * intensity * (deltaMs / 1000);
    if (beatValue > 0.85 && this.state !== 'panic') {
      this.pos.y -= 1.5 * intensity * (deltaMs / 1000);
    }
  }

  private render(hype: number, beatValue: number) {
    const color = CROWD_LIGHT_CONFIG.colors[this.state];
    let radius = CROWD_LIGHT_CONFIG.baseRadius;
    let glowRadius = CROWD_LIGHT_CONFIG.baseGlowRadius;
    let alpha = 0.8;

    if (this.state === 'highHype') {
      radius = CROWD_LIGHT_CONFIG.highHypeRadius;
      glowRadius = CROWD_LIGHT_CONFIG.highHypeGlowRadius;
      alpha = 1.0;
    } else if (this.state === 'panic') {
      radius = CROWD_LIGHT_CONFIG.panicRadius;
      glowRadius = CROWD_LIGHT_CONFIG.panicGlowRadius;
      alpha = 0.9;
    }

    const pulse = 1 + beatValue * CROWD_LIGHT_CONFIG.beatPulseScale[this.state] * (0.5 + hype);
    const worldX = this.pos.x + ARENA_WORLD_OFFSET.x;
    const worldY = this.pos.y + ARENA_WORLD_OFFSET.y;

    this.circle.setPosition(worldX, worldY);
    this.glow.setPosition(worldX, worldY);
    this.circle.setFillStyle(color, alpha);
    this.glow.setFillStyle(color, 0.1 + hype * 0.2);
    this.circle.setRadius(radius * pulse);
    this.glow.setRadius(glowRadius * pulse);
  }

  setState(state: LightPointVisitor['state']) {
    this.state = state;
  }

  setPath(pathId: string) {
    this.pathId = pathId;
    this.targetNodeIdx = 0;
  }

  destroy() {
    this.circle.destroy();
    this.glow.destroy();
  }
}
