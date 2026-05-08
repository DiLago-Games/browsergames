export type Vec2 = { x: number; y: number };

export type ZoneId =
  | 'STAGE_CORE'
  | 'INNER_DANCE_FLOOR'
  | 'CROWD_RING_A'
  | 'CROWD_RING_B'
  | 'CROWD_RING_C'
  | 'VIP_RING'
  | 'OUTER_CONCOURSE'
  | 'NORTH_GATE'
  | 'EAST_GATE'
  | 'SOUTH_GATE'
  | 'WEST_GATE'
  | 'NORTH_EXIT'
  | 'EAST_EXIT'
  | 'SOUTH_EXIT'
  | 'WEST_EXIT'
  | 'TOWER_DECK_NORTH'
  | 'TOWER_DECK_EAST'
  | 'TOWER_DECK_SOUTH'
  | 'TOWER_DECK_WEST';

export type CrowdState = 'idle' | 'dancing' | 'highHype' | 'panic';

export interface ArenaZone {
  id: ZoneId;
  type: string;
  center: Vec2;
  radius?: number;
  innerRadius?: number;
  outerRadius?: number;
  width?: number;
  height?: number;
  rotationDeg?: number;
  buildable: boolean;
}

export type PathNode = {
  id: string;
  position: Vec2;
  zoneId: ZoneId;
};

export type PathDefinition = {
  id: string;
  nodeIds: string[];
  allowedFor: ('crowd' | 'enemy' | 'panic')[];
  speedMultiplier: number;
};

export const ARENA_WORLD_OFFSET: Vec2 = { x: 640, y: 360 };

export const ARENA_ZONES: ArenaZone[] = [
  { id: 'STAGE_CORE', type: 'stage', center: { x: 0, y: 0 }, radius: 80, buildable: false },
  { id: 'INNER_DANCE_FLOOR', type: 'crowd', center: { x: 0, y: 0 }, innerRadius: 120, outerRadius: 240, buildable: false },
  { id: 'CROWD_RING_A', type: 'crowd', center: { x: 0, y: 0 }, innerRadius: 260, outerRadius: 380, buildable: false },
  { id: 'CROWD_RING_B', type: 'crowd', center: { x: 0, y: 0 }, innerRadius: 400, outerRadius: 520, buildable: false },
  { id: 'CROWD_RING_C', type: 'crowd', center: { x: 0, y: 0 }, innerRadius: 540, outerRadius: 660, buildable: false },
  { id: 'VIP_RING', type: 'crowd', center: { x: 0, y: 0 }, innerRadius: 680, outerRadius: 740, buildable: false },
  { id: 'OUTER_CONCOURSE', type: 'corridor', center: { x: 0, y: 0 }, innerRadius: 760, outerRadius: 880, buildable: false },
  { id: 'NORTH_GATE', type: 'gate', center: { x: 0, y: -920 }, width: 180, height: 100, buildable: false },
  { id: 'EAST_GATE', type: 'gate', center: { x: 920, y: 0 }, width: 180, height: 100, buildable: false },
  { id: 'SOUTH_GATE', type: 'gate', center: { x: 0, y: 920 }, width: 180, height: 100, buildable: false },
  { id: 'WEST_GATE', type: 'gate', center: { x: -920, y: 0 }, width: 180, height: 100, buildable: false },
  { id: 'NORTH_EXIT', type: 'exit', center: { x: 0, y: -1100 }, width: 220, height: 120, buildable: false },
  { id: 'EAST_EXIT', type: 'exit', center: { x: 1100, y: 0 }, width: 220, height: 120, buildable: false },
  { id: 'SOUTH_EXIT', type: 'exit', center: { x: 0, y: 1100 }, width: 220, height: 120, buildable: false },
  { id: 'WEST_EXIT', type: 'exit', center: { x: -1100, y: 0 }, width: 220, height: 120, buildable: false },
  { id: 'TOWER_DECK_NORTH', type: 'tower', center: { x: 0, y: -480 }, width: 280, height: 80, buildable: true },
  { id: 'TOWER_DECK_EAST', type: 'tower', center: { x: 480, y: 0 }, width: 280, height: 80, buildable: true },
  { id: 'TOWER_DECK_SOUTH', type: 'tower', center: { x: 0, y: 480 }, width: 280, height: 80, buildable: true },
  { id: 'TOWER_DECK_WEST', type: 'tower', center: { x: -480, y: 0 }, width: 280, height: 80, buildable: true },
];

export const PATH_NODES: PathNode[] = [
  { id: 'NODE_NORTH_EXIT', position: { x: 0, y: -1100 }, zoneId: 'NORTH_EXIT' },
  { id: 'NODE_EAST_EXIT', position: { x: 1100, y: 0 }, zoneId: 'EAST_EXIT' },
  { id: 'NODE_SOUTH_EXIT', position: { x: 0, y: 1100 }, zoneId: 'SOUTH_EXIT' },
  { id: 'NODE_WEST_EXIT', position: { x: -1100, y: 0 }, zoneId: 'WEST_EXIT' },
  { id: 'NODE_NORTH_GATE', position: { x: 0, y: -920 }, zoneId: 'NORTH_GATE' },
  { id: 'NODE_EAST_GATE', position: { x: 920, y: 0 }, zoneId: 'EAST_GATE' },
  { id: 'NODE_SOUTH_GATE', position: { x: 0, y: 920 }, zoneId: 'SOUTH_GATE' },
  { id: 'NODE_WEST_GATE', position: { x: -920, y: 0 }, zoneId: 'WEST_GATE' },
  { id: 'NODE_CONCOURSE_N', position: { x: 0, y: -820 }, zoneId: 'OUTER_CONCOURSE' },
  { id: 'NODE_CONCOURSE_E', position: { x: 820, y: 0 }, zoneId: 'OUTER_CONCOURSE' },
  { id: 'NODE_CONCOURSE_S', position: { x: 0, y: 820 }, zoneId: 'OUTER_CONCOURSE' },
  { id: 'NODE_CONCOURSE_W', position: { x: -820, y: 0 }, zoneId: 'OUTER_CONCOURSE' },
  { id: 'NODE_RING_C_N', position: { x: 0, y: -640 }, zoneId: 'CROWD_RING_C' },
  { id: 'NODE_RING_C_E', position: { x: 640, y: 0 }, zoneId: 'CROWD_RING_C' },
  { id: 'NODE_RING_C_S', position: { x: 0, y: 640 }, zoneId: 'CROWD_RING_C' },
  { id: 'NODE_RING_C_W', position: { x: -640, y: 0 }, zoneId: 'CROWD_RING_C' },
  { id: 'NODE_RING_B_N', position: { x: 0, y: -460 }, zoneId: 'CROWD_RING_B' },
  { id: 'NODE_RING_B_E', position: { x: 460, y: 0 }, zoneId: 'CROWD_RING_B' },
  { id: 'NODE_RING_B_S', position: { x: 0, y: 460 }, zoneId: 'CROWD_RING_B' },
  { id: 'NODE_RING_B_W', position: { x: -460, y: 0 }, zoneId: 'CROWD_RING_B' },
  { id: 'NODE_RING_A_N', position: { x: 0, y: -300 }, zoneId: 'CROWD_RING_A' },
  { id: 'NODE_RING_A_E', position: { x: 300, y: 0 }, zoneId: 'CROWD_RING_A' },
  { id: 'NODE_RING_A_S', position: { x: 0, y: 300 }, zoneId: 'CROWD_RING_A' },
  { id: 'NODE_RING_A_W', position: { x: -300, y: 0 }, zoneId: 'CROWD_RING_A' },
  { id: 'NODE_DANCE_N', position: { x: 0, y: -180 }, zoneId: 'INNER_DANCE_FLOOR' },
  { id: 'NODE_DANCE_E', position: { x: 180, y: 0 }, zoneId: 'INNER_DANCE_FLOOR' },
  { id: 'NODE_DANCE_S', position: { x: 0, y: 180 }, zoneId: 'INNER_DANCE_FLOOR' },
  { id: 'NODE_DANCE_W', position: { x: -180, y: 0 }, zoneId: 'INNER_DANCE_FLOOR' },
  { id: 'NODE_STAGE_CORE', position: { x: 0, y: 0 }, zoneId: 'STAGE_CORE' },
];

export const PATHS: PathDefinition[] = [
  {
    id: 'ENTRY_NORTH',
    nodeIds: ['NODE_NORTH_GATE', 'NODE_CONCOURSE_N', 'NODE_RING_C_N', 'NODE_RING_B_N', 'NODE_RING_A_N', 'NODE_DANCE_N', 'NODE_STAGE_CORE'],
    allowedFor: ['crowd'],
    speedMultiplier: 1.0
  },
  {
    id: 'ENTRY_EAST',
    nodeIds: ['NODE_EAST_GATE', 'NODE_CONCOURSE_E', 'NODE_RING_C_E', 'NODE_RING_B_E', 'NODE_RING_A_E', 'NODE_DANCE_E', 'NODE_STAGE_CORE'],
    allowedFor: ['crowd'],
    speedMultiplier: 1.0
  },
  {
    id: 'ENTRY_SOUTH',
    nodeIds: ['NODE_SOUTH_GATE', 'NODE_CONCOURSE_S', 'NODE_RING_C_S', 'NODE_RING_B_S', 'NODE_RING_A_S', 'NODE_DANCE_S', 'NODE_STAGE_CORE'],
    allowedFor: ['crowd'],
    speedMultiplier: 1.0
  },
  {
    id: 'ENTRY_WEST',
    nodeIds: ['NODE_WEST_GATE', 'NODE_CONCOURSE_W', 'NODE_RING_C_W', 'NODE_RING_B_W', 'NODE_RING_A_W', 'NODE_DANCE_W', 'NODE_STAGE_CORE'],
    allowedFor: ['crowd'],
    speedMultiplier: 1.0
  },
  {
    id: 'PANIC_NORTH',
    nodeIds: ['NODE_RING_A_N', 'NODE_RING_B_N', 'NODE_RING_C_N', 'NODE_CONCOURSE_N', 'NODE_NORTH_GATE', 'NODE_NORTH_EXIT'],
    allowedFor: ['panic'],
    speedMultiplier: 1.6
  },
  {
    id: 'PANIC_EAST',
    nodeIds: ['NODE_RING_A_E', 'NODE_RING_B_E', 'NODE_RING_C_E', 'NODE_CONCOURSE_E', 'NODE_EAST_GATE', 'NODE_EAST_EXIT'],
    allowedFor: ['panic'],
    speedMultiplier: 1.6
  },
  {
    id: 'PANIC_SOUTH',
    nodeIds: ['NODE_RING_A_S', 'NODE_RING_B_S', 'NODE_RING_C_S', 'NODE_CONCOURSE_S', 'NODE_SOUTH_GATE', 'NODE_SOUTH_EXIT'],
    allowedFor: ['panic'],
    speedMultiplier: 1.6
  },
  {
    id: 'PANIC_WEST',
    nodeIds: ['NODE_RING_A_W', 'NODE_RING_B_W', 'NODE_RING_C_W', 'NODE_CONCOURSE_W', 'NODE_WEST_GATE', 'NODE_WEST_EXIT'],
    allowedFor: ['panic'],
    speedMultiplier: 1.6
  },
  {
    id: 'ENEMY_NORTH',
    nodeIds: ['NODE_NORTH_GATE', 'NODE_CONCOURSE_N', 'NODE_RING_C_N', 'NODE_RING_B_N', 'NODE_RING_A_N', 'NODE_DANCE_N', 'NODE_STAGE_CORE'],
    allowedFor: ['enemy'],
    speedMultiplier: 1.0
  },
  {
    id: 'ENEMY_EAST',
    nodeIds: ['NODE_EAST_GATE', 'NODE_CONCOURSE_E', 'NODE_RING_C_E', 'NODE_RING_B_E', 'NODE_RING_A_E', 'NODE_DANCE_E', 'NODE_STAGE_CORE'],
    allowedFor: ['enemy'],
    speedMultiplier: 1.0
  },
  {
    id: 'ENEMY_SOUTH',
    nodeIds: ['NODE_SOUTH_GATE', 'NODE_CONCOURSE_S', 'NODE_RING_C_S', 'NODE_RING_B_S', 'NODE_RING_A_S', 'NODE_DANCE_S', 'NODE_STAGE_CORE'],
    allowedFor: ['enemy'],
    speedMultiplier: 1.0
  },
  {
    id: 'ENEMY_WEST',
    nodeIds: ['NODE_WEST_GATE', 'NODE_CONCOURSE_W', 'NODE_RING_C_W', 'NODE_RING_B_W', 'NODE_RING_A_W', 'NODE_DANCE_W', 'NODE_STAGE_CORE'],
    allowedFor: ['enemy'],
    speedMultiplier: 1.0
  }
];
