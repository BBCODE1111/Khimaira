// KHIMAIRA plugin build only: replaces the website's Web Audio piano (piano.js).
// Same interface as the website's Piano class, but every note is sent to the plugin's
// built-in sampler, so preview audio comes out of the DAW track instead of the system speakers.
const send = message => {
  try { window.__JUCE__.backend.emitEvent('khimaira', message); } catch { /* bridge not ready */ }
};

// BeatPlayer only needs a monotonic clock in seconds.
const clock = {
  get currentTime() { return performance.now() / 1000; },
  state: 'running',
  resume() { return Promise.resolve(); }
};

let nextId = 1;
export const releaseSeconds = duration => Math.min(.12, Math.max(.004, duration * .2));

export class Piano {
  constructor() { this.context = clock; this.active = new Set; }
  async load() { return true; }
  note(note, when, duration, velocity) {
    const id = nextId++, now = clock.currentTime;
    send({ type: 'note', id, note, velocity, delay: Math.max(0, when - now), duration: Math.max(.01, duration) });
    const voice = {
      note, when, end: when + duration, ended: false,
      retime: end => { voice.end = end; send({ type: 'retime', id, endDelay: Math.max(0, end - clock.currentTime) }); },
      cancel: () => { if (voice.ended) return; voice.ended = true; this.active.delete(voice); send({ type: 'cancel', id }); },
      damp: () => voice.cancel()
    };
    this.active.add(voice);
    setTimeout(() => { voice.ended = true; this.active.delete(voice); }, Math.max(0, (voice.end - now) * 1000) + 200);
    return voice;
  }
  stop() { this.active.clear(); send({ type: 'stopPreview' }); }
}
