import Phaser from 'phaser';

export class BeatClock {
  private bpm: number = 128;
  private elapsedMs: number = 0;

  update(deltaMs: number) {
    this.elapsedMs += deltaMs;
  }

  getBeatValue(): number {
    const beatDurationMs = 60000 / this.bpm;
    const phase = (this.elapsedMs % beatDurationMs) / beatDurationMs;
    return Math.max(0, 1 - phase * 3);
  }

  getCurrentBeat(): number {
    return Math.floor(this.elapsedMs / (60000 / this.bpm));
  }
}
