// KHIMAIRA plugin bridge. Loaded only inside the VST3/AU/Standalone build, before the app.
// It never modifies the website's code: it listens to the app's own save() (localStorage)
// and recomputes the same note data the app uses for preview and MIDI export, then sends
// it to the plugin so the DAW can play it in sync and drag it as a MIDI clip.
(function () {
  'use strict';
  const STATE_KEY = 'khimaira-v4';
  const queue = [];
  const backend = () => window.__JUCE__ && window.__JUCE__.backend;
  function send(message) {
    const b = backend();
    if (!b) { queue.push(message); return; }
    while (queue.length) b.emitEvent('khimaira', queue.shift());
    b.emitEvent('khimaira', message);
  }
  const flushTimer = setInterval(() => { if (backend() && queue.length) send(queue.shift()); else if (backend()) clearInterval(flushTimer); }, 50);

  const modules = Promise.all([import('../performance.js'), import('../solutions.js'), import('../music.js')])
    .then(([perf, sol, music]) => ({ performance: perf.performance, parseChart: sol.parseChart, keyName: music.keyName }));

  const flat = notes => {
    const out = [];
    for (const n of notes) out.push(+n.beat.toFixed(5), +n.duration.toFixed(5), n.note, +n.velocity.toFixed(4));
    return out;
  };

  let currentBars = [];
  async function publish(state) {
    const { performance, keyName } = await modules;
    if (!state || !Array.isArray(state.bars) || !state.bars.length) return;
    const options = {
      arpFoundation: state.arpFoundation, bpm: +state.tempo || 92, bassMode: state.bassMode, balladEntry: state.balladEntry, loop: true, voicing: state.voicing, rate: +state.rate, gate: +state.gate / 100, swing: +state.swing / 100,
      human: +state.human / 100, seed: 42, arpMode: state.arpMode, arpRate: state.arpRate,
      arpOctaves: +state.arpOctaves, arpPhase: state.arpPhase, arpAccent: state.arpAccent, arpSeed: +state.arpSeed
    };
    currentBars = state.bars;
    const pattern = state.pattern || 'sustain';
    const notes = performance(state.bars, pattern, options);
    const sustain = performance(state.bars, 'sustain', options);
    const name = ['KHIMAIRA', keyName(+state.key || 0, state.mode), state.bars.length + 'bars', pattern].join('-');
    send({ type: 'sequence', beats: state.bars.length * 4, notes: flat(notes), sustain: flat(sustain), name, arpFoundation: state.arpFoundation, bpm: +state.tempo || 0 });
  }

  let timer = null, seen = false;
  function schedule(json) {
    seen = true;
    clearTimeout(timer);
    timer = setTimeout(() => {
      send({ type: 'state', json });
      try { publish(JSON.parse(json)); } catch (e) { console.warn('KHIMAIRA bridge', e); }
    }, 120);
  }

  const setItem = Storage.prototype.setItem;
  Storage.prototype.setItem = function (key, value) {
    const result = setItem.apply(this, arguments);
    if (this === window.localStorage && key === STATE_KEY) schedule(String(value));
    return result;
  };

  // First load with nothing saved yet: read the chart the app rendered.
  window.addEventListener('load', () => setTimeout(async () => {
    if (seen) return;
    const saved = (() => { try { return localStorage.getItem(STATE_KEY); } catch { return null; } })();
    if (saved) { schedule(saved); return; }
    const { parseChart } = await modules;
    const cells = [...document.querySelectorAll('.bar-edit')].map(i => i.value.trim());
    if (!cells.length) return;
    const state = { bars: parseChart('| ' + cells.join(' | ') + ' |') };
    for (const id of ['key', 'mode', 'style', 'freedom', 'density', 'randomness', 'tempo', 'bassMode', 'balladEntry', 'arpFoundation', 'midiSplit', 'pattern', 'voicing', 'rate', 'gate', 'swing', 'human', 'arpMode', 'arpRate', 'arpOctaves', 'arpPhase', 'arpAccent', 'arpSeed']) {
      const el = document.getElementById(id); if (el) state[id] = el.value;
    }
    state.source = structuredClone(state.bars);
    schedule(JSON.stringify(state));
  }, 600));

  // MIDI buttons in the page: save the file through the plugin instead of a browser download.
  const click = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function () {
    if (this.download && /^blob:/.test(this.href)) {
      const name = this.download;
      fetch(this.href).then(r => r.arrayBuffer()).then(buffer => {
        let binary = '';
        const bytes = new Uint8Array(buffer);
        for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
        send({ type: 'midiFile', name, data: btoa(binary) });
      });
      return;
    }
    return click.apply(this, arguments);
  };

  // Host transport is authoritative while synced. The website remains independently usable.
  let hostActive = false, visibleBar = -1;
  window.addEventListener('load', () => {
    document.title = 'KHIMAIRA 1.1';
    const brand = document.querySelector('.brand span');
    if (brand?.firstChild?.nodeType === Node.TEXT_NODE) brand.firstChild.textContent = 'KHIMAIRA 1.1';
    backend()?.addEventListener?.('hostTransport', transport => {
      const active = !!transport.playing && transport.beats > 0;
      const position = document.getElementById('position');
      if (!position) return;
      if (active && !hostActive) document.getElementById('stop')?.click();
      for (const id of ['play', 'stop']) {
        const button = document.getElementById(id);
        button.disabled = active;
        button.title = active ? 'DAW 同步播放中，請使用 DAW 的播放／停止控制。' : '';
      }
      if (active) {
        const beat = Math.max(0, transport.ppq) % transport.beats;
        const bar = Math.floor(beat / 4), within = beat % 4;
        document.querySelectorAll('.bar').forEach((el, index) => {
          el.classList.toggle('playing', transport.ppq >= 0 && index === bar);
          if (index === bar && visibleBar !== bar) {
            const grid = document.getElementById('grid');
            if (el.offsetLeft < grid.scrollLeft || el.offsetLeft + el.offsetWidth > grid.scrollLeft + grid.clientWidth)
              grid.scrollTo({left: el.offsetLeft - grid.offsetLeft, behavior: 'instant'});
          }
        });
        visibleBar = bar;
        document.querySelectorAll('.chord-event').forEach(el => {
          const chords = currentBars[+el.dataset.bar]?.chords || [];
          const index = +el.dataset.chord;
          const start = chords.slice(0, index).reduce((sum, chord) => sum + chord.beats, 0);
          el.classList.toggle('sounding', transport.ppq >= 0 && +el.dataset.bar === bar &&
            within >= start && within < start + (chords[index]?.beats || 0));
        });
        position.dataset.beat = beat.toFixed(3);
        position.textContent = transport.ppq < 0 ? 'DAW · COUNT IN' :
          `DAW · BAR ${bar + 1} / ${Math.ceil(transport.beats / 4)} · BEAT ${Math.floor(within) + 1} · ${transport.bpm} BPM`;
      } else if (hostActive) {
        document.querySelectorAll('.playing,.sounding').forEach(el => el.classList.remove('playing', 'sounding'));
        position.textContent = 'DAW STOPPED · READY';
        visibleBar = -1;
      }
      hostActive = active;
    });
  });
  document.addEventListener('keydown', event => {
    if (hostActive && event.code === 'Space' && !event.target.closest('input,textarea,select,[contenteditable]')) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }, true);

  window.addEventListener('pagehide', () => send({ type: 'stopPreview' }));
})();
