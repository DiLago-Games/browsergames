class AnimationController {
  constructor(character) {
    this.character = character;
    this.active = false;
    this.elapsed = 0;
    this.duration = 3.2;
  }

  startPerformance() {
    this.active = true;
    this.elapsed = 0;
  }

  update(deltaSeconds) {
    if (!this.active) return;
    this.elapsed += deltaSeconds;
    if (this.elapsed >= this.duration) {
      this.active = false;
      this.character.resetPose();
      return;
    }

    const t = this.elapsed;
    this.character.rotation = Math.sin(t * 2.5) * 0.24;
    this.character.bounce = Math.abs(Math.sin(t * 4.6)) * 7;
    this.character.armWave = 0.8 + Math.sin(t * 9.2) * 0.55;
    this.character.hatTilt = Math.sin(t * 7.1) * 0.22;
  }

  isRunning() {
    return this.active;
  }
}

class UIController {
  constructor() {
    this.messageEl = document.getElementById("message");
    this.startBtn = document.getElementById("start-btn");
    this.aldaBtn = document.getElementById("alda-btn");
  }

  onStart(callback) {
    this.startBtn.addEventListener("click", callback);
  }

  onAlda(callback) {
    this.aldaBtn.addEventListener("click", callback);
  }

  disableStart() {
    this.startBtn.disabled = true;
  }

  showAldaButton() {
    this.aldaBtn.hidden = false;
  }

  hideAldaButton() {
    this.aldaBtn.hidden = true;
  }

  setMessage(text) {
    this.messageEl.textContent = text;
  }
}

class GameManager {
  constructor() {
    this.canvas = document.getElementById("scene");
    this.ctx = this.canvas.getContext("2d");
    this.ui = new UIController();

    this.character = {
      x: this.canvas.width * 0.5,
      y: this.canvas.height * 0.62,
      rotation: 0,
      bounce: 0,
      armWave: 0,
      hatTilt: 0,
      resetPose() {
        this.rotation = 0;
        this.bounce = 0;
        this.armWave = 0;
        this.hatTilt = 0;
      }
    };

    this.animationController = new AnimationController(this.character);
    this.backgroundConfetti = this.makeConfetti(90, ["#f0b149", "#f06d4a", "#fff3cd"], true);
    this.celebrationConfetti = [];
    this.sparkles = this.makeSparkles(45);
    this.stageFlash = 0;
    this.time = 0;
    this.state = "idle";

    this.lastTs = performance.now();
    this.setupUI();
    requestAnimationFrame((ts) => this.loop(ts));
  }

  setupUI() {
    this.ui.onStart(async () => {
      if (this.state !== "idle") return;
      this.state = "performing";
      this.ui.disableStart();
      this.ui.setMessage("");
      this.animationController.startPerformance();
      this.playMelody();
    });

    this.ui.onAlda(() => {
      if (this.state !== "message1") return;
      this.state = "done";
      this.ui.hideAldaButton();
      this.ui.setMessage("Alda, du bist einfach klasse: warmherzig, lebendig und immer für ein Lächeln gut.");
    });
  }

  makeConfetti(count, colors, slow) {
    const result = [];
    for (let i = 0; i < count; i += 1) {
      result.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        speed: slow ? 20 + Math.random() * 28 : 80 + Math.random() * 120,
        size: 3 + Math.random() * 5,
        color: colors[Math.floor(Math.random() * colors.length)],
        drift: -20 + Math.random() * 40
      });
    }
    return result;
  }

  makeSparkles(count) {
    const items = [];
    for (let i = 0; i < count; i += 1) {
      items.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * (this.canvas.height * 0.7),
        phase: Math.random() * Math.PI * 2,
        speed: 1.8 + Math.random() * 3.4,
        size: 1.5 + Math.random() * 2.4
      });
    }
    return items;
  }

  triggerCelebrationConfetti() {
    this.celebrationConfetti = this.makeConfetti(70, ["#0f7f2e", "#be1e2d"], false);
    this.celebrationConfetti.forEach((p) => {
      p.x = this.canvas.width * 0.5 + (Math.random() - 0.5) * 110;
      p.y = this.canvas.height * 0.45 + (Math.random() - 0.5) * 50;
    });
    this.stageFlash = 1;
  }

  async playMelody() {
    const frequencies = [392.0, 440.0, 523.25, 440.0, 392.0];
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

    const playTone = (freq, delay) => {
      const start = audioCtx.currentTime + delay;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.18, start + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.21);
      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start(start);
      osc.stop(start + 0.23);
    };

    frequencies.forEach((f, i) => playTone(f, i * 0.24));
  }

  updateParticles(deltaSeconds) {
    const move = (p) => {
      p.x += p.drift * deltaSeconds;
      p.y += p.speed * deltaSeconds;
      if (p.y > this.canvas.height + 20) {
        p.y = -20;
        p.x = Math.random() * this.canvas.width;
      }
      if (p.x < -20) p.x = this.canvas.width + 10;
      if (p.x > this.canvas.width + 20) p.x = -10;
    };

    this.backgroundConfetti.forEach(move);
    this.celebrationConfetti.forEach((p) => {
      p.speed += 150 * deltaSeconds;
      move(p);
      p.size *= 0.996;
    });

    this.celebrationConfetti = this.celebrationConfetti.filter((p) => p.size > 0.6);

    this.sparkles.forEach((s) => {
      s.phase += deltaSeconds * s.speed;
    });

    this.stageFlash = Math.max(0, this.stageFlash - deltaSeconds * 1.6);
  }

  drawParticles(particles) {
    for (const p of particles) {
      this.ctx.fillStyle = p.color;
      this.ctx.fillRect(p.x, p.y, p.size, p.size * 1.7);
    }
  }

  drawStage() {
    const { ctx, canvas } = this;
    const pulse = 0.5 + Math.sin(this.time * 2.2) * 0.5;

    ctx.save();
    ctx.globalAlpha = 0.23;
    ctx.fillStyle = "#fff0c9";
    ctx.beginPath();
    ctx.moveTo(canvas.width * 0.18, 0);
    ctx.lineTo(canvas.width * 0.37, canvas.height * 0.77);
    ctx.lineTo(canvas.width * 0.07, canvas.height * 0.77);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(canvas.width * 0.82, 0);
    ctx.lineTo(canvas.width * 0.93, canvas.height * 0.77);
    ctx.lineTo(canvas.width * 0.63, canvas.height * 0.77);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    ctx.fillStyle = "#8d2a24";
    ctx.beginPath();
    ctx.ellipse(canvas.width * 0.5, canvas.height * 0.79, 190, 40, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = `rgba(255, 208, 130, ${0.24 + pulse * 0.14})`;
    ctx.beginPath();
    ctx.ellipse(canvas.width * 0.5, canvas.height * 0.79, 140, 26, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "rgba(255, 238, 204, 0.46)";
    ctx.beginPath();
    ctx.ellipse(canvas.width * 0.5, canvas.height * 0.22, 230, 80, 0, 0, Math.PI * 2);
    ctx.fill();

    if (this.stageFlash > 0) {
      ctx.fillStyle = `rgba(255, 250, 240, ${this.stageFlash * 0.38})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  }

  drawSparkles() {
    const { ctx } = this;
    this.sparkles.forEach((s) => {
      const twinkle = 0.55 + (Math.sin(s.phase + this.time * 2.6) + 1) * 0.25;
      const size = s.size * twinkle;
      ctx.save();
      ctx.translate(s.x, s.y + Math.sin(s.phase) * 5);
      ctx.rotate(this.time + s.phase);
      ctx.globalAlpha = 0.26 + twinkle * 0.5;
      ctx.fillStyle = "#fff7d9";
      ctx.fillRect(-size * 0.5, -size * 2.4, size, size * 4.8);
      ctx.fillRect(-size * 2.4, -size * 0.5, size * 4.8, size);
      ctx.restore();
    });
  }

  drawCharacter() {
    const { ctx } = this;
    const c = this.character;

    ctx.save();
    ctx.translate(c.x, c.y - c.bounce);
    ctx.rotate(c.rotation);

    // Jacket (warm burgundy) instead of blue, with gold trim.
    ctx.fillStyle = "#7d1f28";
    ctx.fillRect(-34, -92, 68, 92);
    ctx.strokeStyle = "#f5cf78";
    ctx.lineWidth = 3;
    ctx.strokeRect(-30, -88, 60, 84);

    // Shirt center and jacket lapels to avoid a bandeau-like silhouette.
    ctx.fillStyle = "#f5e8d5";
    ctx.fillRect(-8, -86, 16, 78);
    ctx.fillStyle = "#5f1820";
    ctx.beginPath();
    ctx.moveTo(-34, -90);
    ctx.lineTo(-8, -72);
    ctx.lineTo(-8, -10);
    ctx.lineTo(-34, -10);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(34, -90);
    ctx.lineTo(8, -72);
    ctx.lineTo(8, -10);
    ctx.lineTo(34, -10);
    ctx.closePath();
    ctx.fill();

    // Waist sash at the hips.
    ctx.fillStyle = "#215b31";
    ctx.fillRect(-34, -18, 68, 12);

    // Gold buttons.
    ctx.fillStyle = "#f4c96b";
    for (let i = 0; i < 4; i += 1) {
      ctx.beginPath();
      ctx.arc(0, -70 + i * 16, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = "#f4c79f";
    ctx.beginPath();
    ctx.arc(0, -118, 22, 0, Math.PI * 2);
    ctx.fill();

    // Friendly face details.
    ctx.fillStyle = "#2d1a12";
    ctx.beginPath();
    ctx.arc(-7, -120, 2.2, 0, Math.PI * 2);
    ctx.arc(7, -120, 2.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#8e3d2d";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, -112, 6, 0.15, Math.PI - 0.15);
    ctx.stroke();

    ctx.save();
    ctx.translate(0, -142);
    ctx.rotate(c.hatTilt);
    ctx.fillStyle = "#1a1a1a";
    ctx.fillRect(-28, -8, 56, 12);
    ctx.fillRect(-16, -28, 32, 22);
    ctx.fillStyle = "#b82831";
    ctx.fillRect(-16, -14, 32, 3);
    ctx.restore();

    ctx.fillStyle = "#f4c79f";
    ctx.fillRect(-46, -76, 12, 50);

    ctx.save();
    ctx.translate(40, -76);
    ctx.rotate(-c.armWave);
    ctx.fillRect(-6, 0, 12, 52);
    ctx.restore();

    ctx.fillStyle = "#1a1412";
    ctx.fillRect(-24, 0, 16, 52);
    ctx.fillRect(8, 0, 16, 52);

    ctx.fillStyle = "#2f241f";
    ctx.fillRect(-26, 50, 20, 6);
    ctx.fillRect(6, 50, 20, 6);

    ctx.restore();
  }

  update(deltaSeconds) {
    this.time += deltaSeconds;
    this.updateParticles(deltaSeconds);
    this.animationController.update(deltaSeconds);

    if (this.state === "performing" && !this.animationController.isRunning()) {
      this.state = "message1";
        this.ui.setMessage("Alles Liebe für dich, Alda - heute wird gelacht, getanzt und gefeiert.");
      this.ui.showAldaButton();
      this.triggerCelebrationConfetti();
    }
  }

  render() {
    const { ctx, canvas } = this;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    this.drawStage();
    this.drawSparkles();
    this.drawParticles(this.backgroundConfetti);
    this.drawCharacter();
    this.drawParticles(this.celebrationConfetti);
  }

  loop(ts) {
    const deltaSeconds = Math.min((ts - this.lastTs) / 1000, 0.033);
    this.lastTs = ts;

    this.update(deltaSeconds);
    this.render();
    requestAnimationFrame((nextTs) => this.loop(nextTs));
  }
}

new GameManager();
