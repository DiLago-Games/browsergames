import Phaser from 'phaser';
import { PATHS, PATH_NODES, PathDefinition } from '../data/arenaConfig';
import { LightPointVisitor } from '../entities/crowd/LightPointVisitor';
import { CROWD_LIGHT_CONFIG } from '../data/crowdLightConfig';
import { BeatClock } from './BeatClock';

export class CrowdFlowSystem {
  private visitors: LightPointVisitor[] = [];
  private nodesMap: Map<string, PathNode> = new Map(PATH_NODES.map(n => [n.id, n]));
  private pathsMap: Map<string, PathDefinition> = new Map(PATHS.map(p => [p.id, p]));
  private nextId = 1;
  private spawnTimer = 0;
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  update(deltaMs: number, hype: number, beatValue: number) {
    this.spawnTimer += deltaMs;
    const interval = Phaser.Math.Linear(800, 200, hype);

    if (this.spawnTimer >= interval && this.visitors.length < CROWD_LIGHT_CONFIG.maxVisitors) {
      this.spawnVisitor(hype);
      this.spawnTimer = 0;
    }

    for (const v of this.visitors) {
      const path = this.pathsMap.get(v.pathId);
      if (path) v.update(deltaMs, path, this.nodesMap, hype, beatValue);
    }

    // State updates
    for (const v of this.visitors) {
      if (v.state === 'panic') continue;
      if (hype > 0.7) v.setState('highHype');
      else if (hype > 0.35) v.setState('dancing');
      else v.setState('idle');
    }
  }

  private spawnVisitor(hype: number) {
    const entryPaths = ['ENTRY_NORTH', 'ENTRY_EAST', 'ENTRY_SOUTH', 'ENTRY_WEST'];
    const pathId = Phaser.Utils.Array.GetRandom(entryPaths);
    const path = this.pathsMap.get(pathId);
    if (!path) return;
    const firstNode = this.nodesMap.get(path.nodeIds[0]);
    if (!firstNode) return;

    const jitter = CROWD_LIGHT_CONFIG.pathJitter.normal;
    const start = {
      x: firstNode.position.x + Phaser.Math.Between(-jitter, jitter),
      y: firstNode.position.y + Phaser.Math.Between(-jitter, jitter)
    };

    const visitor = new LightPointVisitor(
      this.scene,
      this.nextId++,
      start,
      pathId,
      hype > 0.7 ? 'highHype' : 'entering'
    );
    this.visitors.push(visitor);
  }

  triggerPanic(direction: 'north' | 'east' | 'south' | 'west') {
    const panicMap: Record<string, string> = {
      north: 'PANIC_SOUTH',
      east: 'PANIC_WEST',
      south: 'PANIC_NORTH',
      west: 'PANIC_EAST'
    };
    const panicPathId = panicMap[direction];
    for (const v of this.visitors) {
      if (Math.random() > 0.8) continue; // not everyone panics
      v.setState('panic');
      v.setPath(panicPathId);
    }
  }

  getCount(): number {
    return this.visitors.length;
  }

  destroyAll() {
    for (const v of this.visitors) v.destroy();
    this.visitors = [];
  }
}
