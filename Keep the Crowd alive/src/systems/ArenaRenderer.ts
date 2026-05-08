import Phaser from 'phaser';
import { ARENA_ZONES, PATH_NODES, PATHS, ARENA_WORLD_OFFSET } from '../data/arenaConfig';

export class ArenaRenderer {
  private graphics: Phaser.GameObjects.Graphics;
  private nodesById: Map<string, { position: {x: number, y: number} }>;

  constructor(scene: Phaser.Scene) {
    this.graphics = scene.add.graphics();
    this.nodesById = new Map(PATH_NODES.map(n => [n.id, n]));
  }

  preRender() {
    this.graphics.clear();
  }

  render() {
    this.renderZones();
    this.renderNodes();
    this.renderPaths();
  }

  private renderZones() {
    this.graphics.lineStyle(2, 0x334455, 0.6);
    this.graphics.fillStyle(0x112233, 0.12);

    for (const zone of ARENA_ZONES) {
      const cx = zone.center.x + ARENA_WORLD_OFFSET.x;
      const cy = zone.center.y + ARENA_WORLD_OFFSET.y;

      if (zone.radius) {
        this.graphics.strokeCircle(cx, cy, zone.radius);
        this.graphics.fillCircle(cx, cy, zone.radius * 0.95);
      } else if (zone.innerRadius && zone.outerRadius) {
        this.graphics.strokeCircle(cx, cy, zone.outerRadius);
        this.graphics.strokeCircle(cx, cy, zone.innerRadius);
      } else if (zone.width && zone.height) {
        const rot = Phaser.Math.DegToRad(zone.rotationDeg || 0);
        this.graphics.save();
        this.graphics.translateCanvas(cx, cy);
        this.graphics.rotateCanvas(rot);
        this.graphics.strokeRect(-zone.width/2, -zone.height/2, zone.width, zone.height);
        this.graphics.fillRect(-zone.width/2, -zone.height/2, zone.width, zone.height);
        this.graphics.restoreCanvas();
      }

      if (zone.buildable) {
        this.graphics.lineStyle(3, 0x00ff00, 0.8);
        this.graphics.strokeRect(cx - 30, cy - 30, 60, 60);
      }
    }
  }

  private renderNodes() {
    this.graphics.fillStyle(0xffff00, 0.7);
    for (const node of PATH_NODES) {
      const x = node.position.x + ARENA_WORLD_OFFSET.x;
      const y = node.position.y + ARENA_WORLD_OFFSET.y;
      this.graphics.fillCircle(x, y, 3);
    }
  }

  private renderPaths() {
    this.graphics.lineStyle(1.5, 0x00ffff, 0.25);
    for (const path of PATHS) {
      for (let i = 0; i < path.nodeIds.length - 1; i++) {
        const a = this.nodesById.get(path.nodeIds[i]);
        const b = this.nodesById.get(path.nodeIds[i+1]);
        if (!a || !b) continue;
        this.graphics.lineBetween(
          a.position.x + ARENA_WORLD_OFFSET.x, a.position.y + ARENA_WORLD_OFFSET.y,
          b.position.x + ARENA_WORLD_OFFSET.x, b.position.y + ARENA_WORLD_OFFSET.y
        );
      }
    }
  }
}
