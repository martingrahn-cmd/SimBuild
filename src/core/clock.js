// Game clock. hour is float 0..24 solar time. Emits time:tick, time:hour, time:day.
export class Clock {
  constructor(world, events) {
    this.world = world;
    this.events = events;
    this.dayLengthSeconds = 600; // real seconds per game day at speed 1
    this._lastHourInt = Math.floor(world.time.hour);
  }
  get hour() { return this.world.time.hour; }
  get day() { return this.world.time.day; }
  get speed() { return this.world.time.speed; }
  get paused() { return this.world.time.paused; }
  set(hour) {
    const t = this.world.time;
    t.hour = ((hour % 24) + 24) % 24;
    this._lastHourInt = Math.floor(t.hour);
    this.events.emit('time:tick', { hour: t.hour, day: t.day, dt: 0 });
  }
  setSpeed(n) { this.world.time.speed = Math.max(0, n); }
  pause() { this.world.time.paused = true; }
  resume() { this.world.time.paused = false; }
  /** game seconds elapsed for a real dt */
  advance(dt) {
    const t = this.world.time;
    if (!t.paused && t.speed > 0) {
      const gameHours = (dt / this.dayLengthSeconds) * 24 * t.speed;
      t.hour += gameHours;
      while (t.hour >= 24) { t.hour -= 24; t.day += 1; this.events.emit('time:day', { day: t.day }); }
      const h = Math.floor(t.hour);
      if (h !== this._lastHourInt) { this._lastHourInt = h; this.events.emit('time:hour', { hour: h, day: t.day }); }
    }
    this.events.emit('time:tick', { hour: t.hour, day: t.day, dt });
  }
  /** Sun elevation in radians for a given hour; simple mid-latitude summer model. */
  sunElevation(hour = this.hour) {
    const a = ((hour - 6) / 24) * Math.PI * 2; // 6h: sunrise, 18h: sunset
    return Math.sin(a) * (Math.PI / 2) * 0.72;
  }
  /** Azimuth radians, 0 = north (-Z), clockwise from above. */
  sunAzimuth(hour = this.hour) {
    return ((hour / 24) * Math.PI * 2 + Math.PI); // 12h => south
  }
  isNight(hour = this.hour) { return this.sunElevation(hour) < -0.05; }
}
