/* THE HAUNTED OFFICE — vanilla JS, no dependencies, no network calls */
(() => {
'use strict';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = a => a[Math.floor(Math.random() * a.length)];
const shuffle = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const RM = matchMedia('(prefers-reduced-motion: reduce)');
const reduce = () => RM.matches;
const wait = ms => new Promise(r => setTimeout(r, ms));

/* ---------- saved progress (this device only) ---------- */
const KEY = 'haunted-office-v1';
const fresh = () => ({ rooms: {}, riddle: false, doors: false, quiz: null, ghosts: [], eggs: {}, name: '', sound: true, scares: true, finale: false });
let S = fresh();
try { S = { ...fresh(), ...JSON.parse(localStorage.getItem(KEY)) }; } catch {}
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch {} };

/* ---------- audio: all synthesized, nothing to download ---------- */
let ac, master, nbuf;
function initAudio() {
  if (ac) { ac.state === 'suspended' && ac.resume(); return; }
  try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch { return; }
  master = ac.createGain(); master.gain.value = S.sound ? .85 : 0;
  const comp = ac.createDynamicsCompressor(); master.connect(comp); comp.connect(ac.destination);
  nbuf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
  const d = nbuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  ambience();
}
const live = () => ac && S.sound;
function tone(f, d, o = {}) {
  if (!live()) return;
  const { type = 'sine', v = .15, slide = 1, at = 0, vib = 0 } = o, t = ac.currentTime + at;
  const os = ac.createOscillator(), g = ac.createGain();
  os.type = type; os.frequency.setValueAtTime(f, t);
  if (slide !== 1) os.frequency.exponentialRampToValueAtTime(Math.max(20, f * slide), t + d);
  if (vib) { const l = ac.createOscillator(), lg = ac.createGain(); l.frequency.value = vib; lg.gain.value = f * .04; l.connect(lg); lg.connect(os.frequency); l.start(t); l.stop(t + d + .05); }
  g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(v, t + .02); g.gain.exponentialRampToValueAtTime(.0001, t + d);
  os.connect(g); g.connect(master); os.start(t); os.stop(t + d + .05);
}
function noise(d, o = {}) {
  if (!live()) return;
  const { v = .2, f0 = 1200, f1 = 300, at = 0, type = 'bandpass', q = 1 } = o, t = ac.currentTime + at;
  const s = ac.createBufferSource(), fl = ac.createBiquadFilter(), g = ac.createGain();
  s.buffer = nbuf; fl.type = type; fl.Q.value = q; fl.frequency.setValueAtTime(f0, t); fl.frequency.exponentialRampToValueAtTime(f1, t + d);
  g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(v, t + d * .15); g.gain.exponentialRampToValueAtTime(.0001, t + d);
  s.connect(fl); fl.connect(g); g.connect(master); s.start(t); s.stop(t + d + .05);
}
const sfx = {
  creak() { tone(90, 1.4, { type: 'sawtooth', v: .08, slide: 2.2, vib: 14 }); tone(130, 1.2, { type: 'sawtooth', v: .05, slide: 1.6, vib: 11, at: .1 }); noise(1.3, { v: .06, f0: 500, f1: 1400, q: 6 }); },
  knock() { tone(110, .2, { v: .5, slide: .45 }); noise(.12, { v: .3, type: 'lowpass', f0: 400, f1: 100 }); },
  whoosh() { noise(.9, { v: .25, f0: 300, f1: 3000, q: .8 }); },
  laugh() { [0, .14, .28, .42, .56].forEach((a, i) => tone(330 - i * 22, .12, { type: 'square', v: .06, at: a, slide: .8, vib: 30 })); },
  ghost() { tone(260, 1.2, { v: .09, slide: 1.9, vib: 6 }); tone(262, 1.2, { v: .06, slide: 1.9, vib: 7, at: .05 }); },
  whisper() { tone(300, 1.6, { v: .03, slide: 1.5, vib: 5 }); noise(1.4, { v: .03, f0: 2500, f1: 900 }); },
  scare() { noise(.7, { v: .6, f0: 4000, f1: 500, q: .5 }); tone(150, .7, { type: 'sawtooth', v: .3, slide: .5 }); tone(157, .7, { type: 'sawtooth', v: .25, slide: .5 }); tone(1200, .5, { type: 'square', v: .08, slide: .4 }); },
  screech() { tone(1800, .5, { type: 'sawtooth', v: .07, slide: .4, vib: 25 }); noise(.3, { v: .08, f0: 5000, f1: 2000 }); },
  ok() { tone(523, .12, { type: 'triangle', v: .12 }); tone(784, .2, { type: 'triangle', v: .12, at: .1 }); },
  bad() { tone(180, .35, { type: 'sawtooth', v: .1, slide: .6 }); },
  found() { tone(660, .1, { type: 'triangle', v: .12 }); tone(990, .25, { type: 'triangle', v: .12, at: .08 }); },
  win() { [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => tone(f, .28, { type: 'triangle', v: .12, at: i * .12 })); noise(.5, { v: .08, f0: 6000, f1: 3000, at: .8 }); }
};
function ambience() {
  const bus = ac.createGain(); bus.gain.value = .55; bus.connect(master);
  const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 170; lp.connect(bus);
  [55, 55.6, 82.5].forEach((f, i) => { const o = ac.createOscillator(), g = ac.createGain(); o.type = i < 2 ? 'sawtooth' : 'sine'; o.frequency.value = f; g.gain.value = i < 2 ? .05 : .04; o.connect(g); g.connect(lp); o.start(); });
  const l1 = ac.createOscillator(), l1g = ac.createGain(); l1.frequency.value = .07; l1g.gain.value = 70; l1.connect(l1g); l1g.connect(lp.frequency); l1.start();
  const w = ac.createBufferSource(); w.buffer = nbuf; w.loop = true;
  const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 420; bp.Q.value = .6;
  const wg = ac.createGain(); wg.gain.value = .05;
  const l2 = ac.createOscillator(), l2g = ac.createGain(); l2.frequency.value = .11; l2g.gain.value = .04; l2.connect(l2g); l2g.connect(wg.gain); l2.start();
  w.connect(bp); bp.connect(wg); wg.connect(bus); w.start();
  (function toll() { setTimeout(() => { if (live() && document.visibilityState === 'visible') { tone(196, 4, { v: .05, slide: .995 }); tone(392.7, 3, { v: .025 }); } toll(); }, rnd(22000, 48000)); })();
}

/* ---------- small UI helpers ---------- */
const toastEl = $('#toast'); let toastT;
function toast(msg, ms = 3400) {
  (document.querySelector('dialog[open]') || document.body).appendChild(toastEl);
  toastEl.textContent = msg; toastEl.classList.add('on');
  clearTimeout(toastT); toastT = setTimeout(() => toastEl.classList.remove('on'), ms);
}
let askQ = Promise.resolve();
const ask = o => { const p = askQ.then(() => askNow(o)); askQ = p.catch(() => {}); return p; };   // one modal at a time
function askNow({ title, body, actions }) {
  const d = $('#msg'); $('#msgT').textContent = title; $('#msgB').textContent = body;
  const box = $('#msgA'); box.innerHTML = '';
  return new Promise(res => {
    actions.forEach(a => { const b = document.createElement('button'); b.type = 'button'; b.className = 'btn' + (a.primary ? '' : ' ghost'); b.textContent = a.label; b.onclick = () => { d.close(); res(a.value ?? null); }; box.appendChild(b); });
    d.onclose = () => res(null);
    d.showModal();
  });
}
function popText(el, text) {
  const r = el.getBoundingClientRect(), p = document.createElement('div');
  p.className = 'pop'; p.textContent = text;
  p.style.left = Math.min(innerWidth - 90, Math.max(90, r.left + r.width / 2)) + 'px'; p.style.top = Math.max(60, r.top) + 'px';
  (document.querySelector('dialog[open]') || document.body).appendChild(p); setTimeout(() => p.remove(), 1300);
}
const setSay = (el, html) => { el.innerHTML = html; el.style.animation = 'none'; void el.offsetWidth; el.style.animation = ''; };
const ic = (id, c = '') => `<svg class="ic ${c}" aria-hidden="true"><use href="#${id}"/></svg>`;

/* ---------- toggles ---------- */
function renderToggles() {
  [['#soundBtn', '#introSound']].flat().forEach(s => { const b = $(s); b.setAttribute('aria-pressed', S.sound); b.setAttribute('aria-label', S.sound ? 'Sound on. Press to mute.' : 'Sound off. Press to unmute.'); b.innerHTML = ic(S.sound ? 'i-sound' : 'i-mute'); });
  ['#scareBtn', '#introScare'].forEach(s => { const b = $(s); b.setAttribute('aria-pressed', S.scares); b.setAttribute('aria-label', `Jump scares ${S.scares ? 'on' : 'off'}. Press to toggle.`); b.innerHTML = ic(S.scares ? 'i-eye' : 'i-eyeoff') + `<span><i class="lbl">${s === '#introScare' ? 'Jump scares' : 'Scares'} </i><b>${S.scares ? 'ON' : 'OFF'}</b></span>`; });
}
function toggleSound() {
  S.sound = !S.sound; save(); renderToggles();
  if (S.sound) { initAudio(); if (master) master.gain.setTargetAtTime(.85, ac.currentTime, .05); sfx.ok(); }
  else if (master) master.gain.setTargetAtTime(0, ac.currentTime, .05);
}
function toggleScares() { S.scares = !S.scares; save(); renderToggles(); toast(S.scares ? 'Jump scares are ON. Brace yourself.' : 'Jump scares are OFF. The ghosts will behave.'); }
['#soundBtn', '#introSound'].forEach(s => $(s).onclick = toggleSound);
['#scareBtn', '#introScare'].forEach(s => $(s).onclick = toggleScares);

/* ---------- artwork (original SVG) ---------- */
const hs = (I, act, label) => I ? `data-act="${act}" role="button" tabindex="0" aria-label="${label}"` : '';
const ring = (I, cx, cy, r) => I ? `<circle class="ring" cx="${cx}" cy="${cy}" r="${r}"/>` : '';
const head = label => `<svg class="art" viewBox="0 0 320 200" preserveAspectRatio="xMidYMid slice" role="img" aria-label="${label}">`;
const ART = {
  reception: I => `${head('Reception area with a ghost receptionist')}
    <rect width="320" height="200" fill="url(#wall)"/><rect y="152" width="320" height="48" fill="#0b0a12"/>
    <rect x="222" y="22" width="74" height="86" rx="3" fill="#0c1428" stroke="#2c2740" stroke-width="4"/>
    <circle cx="260" cy="52" r="15" fill="url(#moong)"/><path d="M222 66h74M259 22v86" stroke="#2c2740" stroke-width="3"/>
    <rect x="28" y="26" width="112" height="28" rx="4" fill="#15151D" stroke="#FF7518" stroke-opacity=".7"/>
    <text x="84" y="46" text-anchor="middle" font-size="19" fill="#FF7518" class="flk">RECEPTION</text>
    <g class="fl" ${hs(I, 'ghost', 'The ghost receptionist. Click to talk to her.')}>
      <use href="#g-ghost" x="124" y="56" width="72" height="90" opacity=".95" style="filter:drop-shadow(0 0 10px #cdb8ff)"/>
      <rect x="146" y="114" width="30" height="10" rx="2" fill="#15151D" stroke="#FF7518" stroke-width=".8"/>
      <text x="161" y="122" text-anchor="middle" font-size="7.5" fill="#FF7518">BOO-TRICE</text>${ring(I, 160, 100, 42)}
    </g>
    <path d="M40 150h240v50H40z" fill="#1b1826" stroke="#3b2a55" stroke-width="2"/><rect x="34" y="142" width="252" height="14" rx="3" fill="#2a2238"/>
    <circle cx="258" cy="104" r="46" fill="url(#lampg)" class="flk"/><path d="M262 142l-14-34 24-10" stroke="#8c8aa0" stroke-width="3" fill="none"/><ellipse cx="272" cy="97" rx="12" ry="7" fill="#ffb36b" transform="rotate(-20 272 97)"/>
    <path d="M58 142a11 11 0 0122 0z" fill="#d8b36a"/><rect x="65" y="136" width="8" height="3" fill="#d8b36a"/></svg>`,
  meeting: I => `${head('A creepy conference room')}
    <rect width="320" height="200" fill="url(#wall)"/><rect y="150" width="320" height="50" fill="#0b0a12"/>
    <path d="M120 0h80l56 150H64z" fill="url(#cone)" class="flk"/>
    <g ${hs(I, 'screen', 'The projector screen. Click for the agenda.')}>
      <rect x="96" y="22" width="128" height="68" rx="3" fill="#05070d" stroke="#59506e" stroke-width="3"/>
      <text x="160" y="43" text-anchor="middle" font-size="11" fill="#9a93ad">NEXT MEETING</text>
      <text x="160" y="69" text-anchor="middle" font-size="20" fill="#FF7518" class="flk">THE UNKNOWN</text>
      <text x="160" y="83" text-anchor="middle" font-size="8" fill="#9a93ad">9:00 AM · ROOM INFINITY</text>${ring(I, 160, 56, 60)}
    </g>
    ${[44, 86, 128, 192, 234, 276].map(x => `<rect x="${x - 11}" y="106" width="22" height="30" rx="6" fill="#0f0c16" stroke="#3b2a55"/>`).join('')}
    <path d="M60 128h200l40 36H20z" fill="#211a2d" stroke="#3b2a55" stroke-width="2"/><rect x="20" y="164" width="280" height="10" fill="#150f1d"/>
    <g class="eyes"><ellipse cx="20" cy="118" rx="4" ry="2.4" fill="#FF7518"/><ellipse cx="32" cy="118" rx="4" ry="2.4" fill="#FF7518"/></g></svg>`,
  manager: I => `${head("The manager's dark cabin")}
    <rect width="320" height="200" fill="url(#wall)"/><rect y="150" width="320" height="50" fill="#0b0a12"/>
    <g ${hs(I, 'door', "The manager's door. Click if you dare.")}>
      <rect x="104" y="26" width="112" height="146" rx="3" fill="#1b1520" stroke="#3b2a55" stroke-width="4"/>
      <rect x="120" y="44" width="80" height="76" fill="url(#warm)" opacity=".92" class="flk"/>
      <g class="sway"><circle cx="160" cy="80" r="12" fill="#05050a"/><path d="M132 120Q132 92 160 92Q188 92 188 120Z" fill="#05050a"/></g>
      <path d="M120 82h80M160 44v76" stroke="#1b1520" stroke-width="3"/>
      <rect x="134" y="130" width="52" height="13" rx="2" fill="#15151D" stroke="#FF7518" stroke-opacity=".7"/><text x="160" y="140" text-anchor="middle" font-size="9" fill="#FF7518">MANAGER</text>
      <circle cx="205" cy="108" r="4" fill="#FF7518"/>${ring(I, 205, 108, 12)}
    </g>
    <rect x="106" y="172" width="108" height="3" fill="#A30000" class="flk"/></svg>`,
  desk: I => `${head('An employee desk with a haunted computer')}
    <rect width="320" height="200" fill="url(#wall)"/><rect x="0" y="30" width="34" height="170" fill="#17141f"/><rect x="286" y="30" width="34" height="170" fill="#17141f"/>
    <rect y="152" width="320" height="48" fill="#0b0a12"/>
    <g ${hs(I, 'pc', 'The computer. Click it.')}>
      <rect x="96" y="36" width="128" height="86" rx="5" fill="#0a0d12" stroke="#59506e" stroke-width="4"/><rect x="104" y="44" width="112" height="70" fill="#07110c"/>
      <text class="scr" data-scr x="110" y="64">&gt; I SEE YOU</text><text class="scr" x="110" y="80" opacity=".6">&gt; ...</text><text class="scr flk" x="110" y="100">C:\\HAUNT&gt; _</text>${ring(I, 160, 80, 56)}
    </g>
    <rect x="148" y="122" width="24" height="14" fill="#2a2238"/><rect x="118" y="134" width="84" height="6" rx="2" fill="#2a2238"/>
    <path d="M50 150h220v50H50z" fill="#1b1826"/><rect x="108" y="146" width="104" height="9" rx="3" fill="#2f2840"/>
    <g transform="rotate(-6 52 90)"><rect x="40" y="76" width="30" height="30" fill="#ffb36b"/><text x="55" y="94" text-anchor="middle" font-size="10" fill="#5a2a00">HELP</text></g>
    <rect x="238" y="126" width="22" height="22" rx="3" fill="#2a2238" stroke="#59506e"/><path d="M244 120q-4-6 0-12M252 120q4-6 0-12" stroke="#cdb8ff" stroke-width="2" fill="none" opacity=".6" class="fl"/></svg>`,
  door: () => `<div class="pic" style="background-image:url(door.jpg)" role="img" aria-label="A heavy locked wooden door"></div>`
};

/* ---------- rooms ---------- */
const GHOST_LINES = [
  'Welcome! Your 9 AM appointment has been dead since 1987.',
  "I'd offer you coffee, but I can't hold a mug. It's a whole existential thing.",
  'Your badge works. Your soul is still pending approval.',
  "Please sign the guest book. In blood. Or pen. Pen is fine, we're not savages.",
  'Boo-king a room? Sorry, we are fully haunted until 2099.',
  "I'm here 9 to 5. And 5 to 9. And, well, forever.",
  "Wi-Fi password is BooFi_1234. Don't ask what happened to BooFi_1233."
];
const AGENDA = ['1. Existential dread (15 min)', "2. Q3 ghost review", '3. Who ate the last candy bar? (accusations welcome)', '4. AOB: Any Other Boo-siness', '5. Screaming, in a structured format'];
const SCREEN = ['> I SEE YOU', '> HELLO?', '> NEW MAIL: 1894', '> UPDATE 99% FOREVER', "> DON'T LOOK BEHIND", '> SOUL NOT FOUND'];
const RIDDLE = "I have no body, yet I haunt every hallway. I'm see-through, I love to float, and I shout BOO for no reason. What am I?";
const ROOMS = {
  reception: {
    title: 'Reception', sub: 'Please take a number. Any number.',
    body: () => `<div class="art-wrap">${ART.reception(true)}</div><div class="say" id="say">Click the receptionist. She has been waiting since 1987.</div>`,
    act: { ghost() { S.rooms.reception = 1; sfx.ghost(); setSay($('#say'), `<strong>Boo-trice:</strong> ${pick(GHOST_LINES)}`); update(); } }
  },
  meeting: {
    title: 'Meeting Room', sub: 'Attendance is not optional.',
    body: () => `<div class="art-wrap">${ART.meeting(true)}</div><div class="say" id="say"><strong>Your next meeting has been scheduled with the unknown.</strong><br>Click the screen to see the agenda.</div>`,
    act: { screen() { sfx.whisper(); const n = (ROOMS.meeting.n = ((ROOMS.meeting.n ?? -1) + 1) % AGENDA.length); setSay($('#say'), `<strong>Agenda:</strong> ${AGENDA[n]}`); } },
    open() { S.rooms.meeting = 1; update(); }
  },
  manager: {
    title: "Manager's Cabin", sub: 'The light is on. Someone is clearly working late.',
    body: () => `<div class="art-wrap">${ART.manager(true)}</div><div class="say" id="say">A silhouette is working behind the glass. Maybe knock?</div>`,
    act: {
      door() {
        S.rooms.manager = 1; sfx.knock(); setSay($('#say'), '<em>Knock... knock...</em>');
        setTimeout(() => { sfx.creak(); scare(shown => { setSay($('#say'), shown ? '<strong>The manager:</strong> "Got a minute for a quick sync?" You ran. You always run.' : '<strong>The manager:</strong> "Got a minute for a quick sync?" (A scare was waiting, but you turned them off.)'); update(); }); }, 700);
      }
    }
  },
  desk: {
    title: 'Employee Desk', sub: 'The monitor is awake. It has been awake for decades.',
    body: () => `<div class="art-wrap">${ART.desk(true)}</div><div class="say" id="say">The screen keeps typing by itself. Click the computer.</div>`,
    act: { pc() { S.rooms.desk = 1; sfx.ghost(); setSay($('#say'), '<strong>SECRET UNLOCKED:</strong> "The thing that haunts this office has no body, floats around, and loves to say BOO. Remember this for the locked door."'); update(); } },
    open(root) { let i = 0; const el = $('[data-scr]', root); ROOMS.desk.t = setInterval(() => { if (el) el.textContent = SCREEN[++i % SCREEN.length]; }, 2200); },
    close() { clearInterval(ROOMS.desk.t); }
  },
  door: {
    title: 'The Locked Door', sub: 'It has a keypad. It also has opinions.',
    body: () => `<div class="doorpic ${S.riddle ? 'open' : ''}" id="dpic">${ART.door()}</div>
      <div class="riddle" id="rid">${S.riddle ? riddleDone() : `<p>${RIDDLE}</p>
        <form id="rf" autocomplete="off"><input id="ri" aria-label="Your answer" placeholder="Type the password" maxlength="30"><button class="btn" type="submit">Unlock</button></form>
        <p class="note" id="rn" aria-live="polite"></p>`}</div>`,
    open(root) {
      const f = $('#rf', root); if (!f) return; let tries = 0;
      f.onsubmit = e => {
        e.preventDefault(); const v = $('#ri').value.trim().toLowerCase().replace(/^(a|the)\s+/, '');
        if (!v) { $('#rn').textContent = 'The door is waiting. Type something. Anything.'; return; }
        if (['ghost', 'ghosts', 'a ghost', 'spirit', 'phantom'].includes(v)) {
          S.riddle = 1; sfx.creak(); sfx.ok(); $('#dpic').classList.add('open'); setSay($('#rid'), riddleDone()); update();
        } else {
          tries++; sfx.bad(); const r = $('#rid'); r.classList.remove('shake'); void r.offsetWidth; r.classList.add('shake');
          $('#rn').textContent = tries === 1 ? 'Wrong. The door is not amused. (Hint: check the Employee Desk.)' : tries === 2 ? 'Still wrong. Think: see-through, floaty, says BOO.' : `Starts with G. Has five letters. The receptionist is one.`;
        }
      };
      $('#ri').focus({ preventScroll: true });
    }
  }
};
const riddleDone = () => '<p><strong>CLICK.</strong> The lock falls away and the door creaks open. Behind it: one sticky note reading <em>"Thanks for visiting. Please leave a review."</em></p><p class="note">Riddle solved. The ghosts are impressed.</p>';

let roomId = null, roomOpener = null;
function openRoom(id, from) {
  const R = ROOMS[id], dlg = $('#room'); roomId = id; roomOpener = from || null;
  $('#roomT').textContent = R.title; $('#roomS').textContent = R.sub;
  const body = $('#roomBody'); body.innerHTML = R.body();
  body.onclick = e => { const a = e.target.closest('[data-act]'); if (a && R.act?.[a.dataset.act]) R.act[a.dataset.act](a); };
  body.onkeydown = e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[data-act]')) { e.preventDefault(); e.target.click(); } };
  sfx.creak(); dlg.showModal(); dlg.scrollTop = 0; R.open?.(body);
}
$('#room').addEventListener('close', () => { ROOMS[roomId]?.close?.(); roomId = null; $('#toast').classList.remove('on'); document.body.appendChild(toastEl); });
$('#roomBack').onclick = () => $('#room').close();

/* ---------- jump scare (optional) ---------- */
let scaring = false;
function scare(after) {
  if (!S.scares) { toast('A jump scare was waiting. It respects your settings.'); after?.(false); return; }
  if (scaring) return; scaring = true;
  const el = $('#scare'); (document.querySelector('dialog[open]') || document.body).appendChild(el);
  el.hidden = false; sfx.scare(); try { navigator.vibrate?.([120, 60, 200]); } catch {}
  setTimeout(() => { el.hidden = true; scaring = false; after?.(true); }, reduce() ? 900 : 1400);
}

/* ---------- progress ---------- */
const GAMES = { doors: () => S.doors, quiz: () => !!S.quiz?.done, ghosts: () => S.ghosts.length >= 5 };
const TASKS = [
  { id: 'reception', label: 'Meet the receptionist', done: () => S.rooms.reception, go: () => openRoom('reception') },
  { id: 'meeting', label: 'Attend the meeting with the unknown', done: () => S.rooms.meeting, go: () => openRoom('meeting') },
  { id: 'manager', label: "Knock on the manager's door", done: () => S.rooms.manager, go: () => openRoom('manager') },
  { id: 'desk', label: 'Read the haunted computer', done: () => S.rooms.desk, go: () => openRoom('desk') },
  { id: 'door', label: 'Unlock the locked door', done: () => S.riddle, go: () => openRoom('door') },
  { id: 'doors', label: "Game: Who's behind the door?", done: GAMES.doors, go: () => gotoGame('doors') },
  { id: 'quiz', label: 'Game: Halloween quiz', done: GAMES.quiz, go: () => gotoGame('quiz') },
  { id: 'ghosts', label: 'Game: Find the ghosts', done: GAMES.ghosts, go: () => go('office') }
];
const doneCount = () => TASKS.filter(t => t.done()).length;
const allDone = () => doneCount() === TASKS.length;

function update() {
  save();
  $$('.tile').forEach(t => t.classList.toggle('done', !!TASKS.find(x => x.id === t.dataset.room)?.done()));
  $$('#seg button').forEach(b => b.classList.toggle('is-done', !!GAMES[b.dataset.g]()));
  const g = S.ghosts.length; $('#ghCount span').textContent = `${g} / 5 ghosts found`;
  const tab = $('#tabFinale'), ok = allDone();
  tab.classList.toggle('locked', !ok); tab.classList.toggle('ready', ok && current !== 'finale');
  tab.innerHTML = `${ic(ok ? 'g-pumpkin' : 'i-lock')}Finale`;
  if (ok && !S.finale) { S.finale = true; save(); unlockAnnounce(); }
}
function unlockAnnounce() {
  sfx.win(); confetti(120);
  ask({ title: 'You did it!', body: 'Every challenge is complete. The finale is unlocked.', actions: [{ label: 'Show me', primary: true, value: 'go' }, { label: 'Keep exploring' }] })
    .then(v => { if (v === 'go') { $('#room').open && $('#room').close(); go('finale'); } });
}
function renderProgress() {
  const n = doneCount(), t = TASKS.length, left = t - n, el = $('#prog');
  const eggs = Object.keys(S.eggs).length;
  el.innerHTML = `<div class="pnum"><span>${n} of ${t} complete</span><span>${Math.round(n / t * 100)}%</span></div>
    <div class="pbar" role="progressbar" aria-valuemin="0" aria-valuemax="${t}" aria-valuenow="${n}" aria-label="Challenges completed"><i></i></div>
    ${n === 0 ? '<p class="empty">Nothing yet. The ghosts are patiently waiting for you.</p>' : ''}
    <ul class="tasks">${TASKS.map(k => `<li><button type="button" data-t="${k.id}" class="${k.done() ? 'ok' : ''}"><span class="chk">${ic('i-check')}</span><span>${k.label}</span></button></li>`).join('')}</ul>
    <div class="row">${allDone() ? '<button class="btn" id="pFin" type="button">Enter the finale</button>' : `<button class="btn ghost" disabled>Finale locked: ${left} to go</button>`}
    <button class="btn ghost" id="pShare" type="button">${ic('i-share')}Share with team</button></div>
    <p class="row" style="color:var(--mut);font-size:14px;margin-top:16px">Hidden secrets found: ${eggs} / 3 (pumpkin, bat, moon)</p>
    <div class="row"><button class="link" id="pReset" type="button">Reset my progress</button></div>`;
  requestAnimationFrame(() => requestAnimationFrame(() => { $('.pbar i', el).style.width = (n / t * 100) + '%'; }));
  $$('[data-t]', el).forEach(b => b.onclick = () => TASKS.find(k => k.id === b.dataset.t).go());
  $('#pFin', el) && ($('#pFin', el).onclick = () => go('finale'));
  $('#pShare', el).onclick = share;
  $('#pReset', el).onclick = async () => { if (await ask({ title: 'Reset progress?', body: 'This clears rooms, games and ghosts on this device.', actions: [{ label: 'Reset', primary: true, value: 1 }, { label: 'Cancel' }] })) { resetProgress(); renderProgress(); toast('Progress reset. The ghosts forgot you.'); } };
}
function resetProgress() { const { name, sound, scares } = S; S = { ...fresh(), name, sound, scares }; save(); update(); }

/* ---------- navigation ---------- */
const VIEWS = ['office', 'games', 'progress', 'finale']; let current = 'office';
function go(v) {
  if (v === 'finale' && !allDone()) { toast(`The finale is locked. ${TASKS.length - doneCount()} challenge(s) to go.`); v = 'progress'; }
  VIEWS.forEach(n => { $('#v-' + n).hidden = n !== v; });
  $$('.tabs button').forEach(b => b.setAttribute('aria-current', b.dataset.view === v ? 'page' : 'false'));
  current = v; scrollTo(0, 0);
  const el = $('#v-' + v); el.style.animation = 'none'; void el.offsetWidth; el.style.animation = '';
  if (v === 'games') renderGames(); if (v === 'progress') renderProgress();
  v === 'finale' ? startFinale() : stopConfetti();
  update();
}
$$('.tabs button').forEach(b => b.onclick = () => { sfx.whoosh(); go(b.dataset.view); });
$('#brand').onclick = e => { e.preventDefault(); go('office'); };

/* ---------- office hub ---------- */
const ROOM_META = [
  { id: 'reception', name: 'Reception', sub: 'Someone is expecting you', g: [82, 15] },
  { id: 'meeting', name: 'Meeting Room', sub: 'Attendance is mandatory', g: [9, 50] },
  { id: 'manager', name: "Manager's Cabin", sub: 'The door is slightly ajar', g: [93, 44] },
  { id: 'desk', name: 'Employee Desk', sub: 'The monitor is awake', g: [11, 20] },
  { id: 'door', name: 'The Locked Door', sub: 'It wants a password', g: [50, 11] }
];
function renderHub() {
  $('#hub').innerHTML = ROOM_META.map((r, i) => `<div class="tw">
    <button class="tile" type="button" data-room="${r.id}" aria-label="${r.name}. ${r.sub}">${ART[r.id](false)}<span class="badge">${ic('i-check')}</span><span class="lbl"><b>${r.name}</b><span>${r.sub}</span></span></button>
    <button class="hg" type="button" data-gh="${i}" style="left:${r.g[0]}%;top:${r.g[1]}%" aria-label="A tiny hidden ghost. Click to catch it."><svg><use href="#g-ghost"/></svg></button></div>`).join('');
  $$('.tile').forEach(t => t.onclick = () => openRoom(t.dataset.room, t));
  $$('.hg').forEach(h => { const i = +h.dataset.gh; h.classList.toggle('found', S.ghosts.includes(i)); h.onclick = () => findGhost(i, h); });
}
function findGhost(i, el) {
  if (S.ghosts.includes(i)) { toast('You already caught this one.'); return; }
  S.ghosts.push(i); el.classList.add('found'); sfx.found(); popText(el, S.ghosts.length + ' / 5');
  if (S.ghosts.length === 5) ghostReward();
  update();
}
function ghostReward() {
  confetti(80); sfx.win();
  ask({ title: 'Ghost Hunter!', body: 'All five ghosts found. REWARD: one (1) coupon for a guilt-free long lunch. Not valid anywhere. Ask your manager. Or don\'t.', actions: [{ label: 'Claim reward', primary: true }] });
}

/* ---------- mini games ---------- */
let gameTab = 'doors', qz = null;
function gotoGame(g) { gameTab = g; go('games'); }
function renderGames() {
  $$('#seg button').forEach(b => b.setAttribute('aria-selected', b.dataset.g === gameTab));
  ({ doors: gDoors, quiz: gQuiz, ghosts: gGhosts })[gameTab]();
}
$$('#seg button').forEach(b => b.onclick = () => { gameTab = b.dataset.g; qz = null; sfx.tick?.(); renderGames(); });

const PRIZES = [
  { k: 'ghost', t: 'A ghost', s: 'He wants to discuss your TPS report.' },
  { e: '🧟', t: 'A zombie', s: 'He just wants to circle back on an email from 2019.' },
  { k: 'pk', t: 'A pumpkin', s: 'Employee of the Month. Again. Unanimous.' },
  { k: 'bat', t: 'A bat', s: '"Per my last echo..."' },
  { e: '💀', t: 'A skeleton', s: 'Still waiting on approval for his vacation. Since 1998.' },
  { e: '🍬', t: 'Free candy!', s: 'This door is your lucky one. Do not tell the others.' },
  { e: '🕷️', t: 'A spider', s: 'He just wants to schedule a quick web-inar.' }
];
const prizeArt = p => (p.k === 'ghost' ? '<svg><use href="#g-ghost"/></svg>' : p.k === 'pk' ? '<svg><use href="#g-pumpkin"/></svg>' : p.k === 'bat' ? '<svg><use href="#g-bat"/></svg>' : `<span class="em">${p.e}</span>`) + `<span>${p.t}</span>`;
function gDoors() {
  const P = $('#gpanel'), pr = shuffle(PRIZES).slice(0, 3); let locked = false;
  P.innerHTML = `<h2>Who's behind the door?</h2><p class="lead">Pick one door. Something is waiting on the other side. Probably.</p>
    <div class="doors">${[1, 2, 3].map((n, i) => `<button class="dr" type="button" data-d="${i}" aria-label="Door ${n}"><span class="dr-back">${prizeArt(pr[i])}</span><span class="dr-front"><i>${n}</i></span></button>`).join('')}</div>
    <div class="say" id="dsay" aria-live="polite">Choose wisely. Or don't. We're not your manager.</div><div class="row" id="dact" style="margin-top:16px"></div>`;
  $$('.dr', P).forEach(b => b.onclick = () => {
    if (locked) return; locked = true; const i = +b.dataset.d, p = pr[i]; sfx.knock();
    setTimeout(() => {
      sfx.creak(); b.classList.add('open', 'pick');
      setTimeout(() => { p.k === 'pk' ? sfx.laugh() : p.k === 'bat' ? sfx.screech() : p.k === 'ghost' || p.e === '🧟' || p.e === '💀' ? sfx.ghost() : sfx.ok(); }, 500);
      setSay($('#dsay'), `<strong>${p.t}!</strong> ${p.s}`);
      if (!S.doors) { S.doors = true; update(); }
      setTimeout(() => $$('.dr', P).forEach(o => { if (o !== b) o.classList.add('open', 'dim'); }), 1100);
      $('#dact').innerHTML = '<button class="btn" id="again" type="button">Open more doors</button>'; $('#again').onclick = gDoors;
    }, 500);
  });
}

const QUIZ = [
  { q: 'Where did Halloween originally come from?', a: ['Ireland, from the Celtic festival Samhain', 'Ancient Egypt', 'Mexico', 'Your office kitchen'], f: 'The Celts lit bonfires and wore costumes to confuse wandering spirits.' },
  { q: 'What were the first jack-o\'-lanterns carved from?', a: ['Turnips', 'Pumpkins', 'Watermelons', 'Spreadsheets'], f: 'Turnips! Pumpkins took over when the tradition reached America.' },
  { q: 'What is the fear of Halloween called?', a: ['Samhainophobia', 'Arachnophobia', 'Pumpkinphobia', 'Mondayphobia'], f: 'Named after Samhain. Mondayphobia is also real, but different.' },
  { q: 'Which holiday is celebrated in Mexico on November 1 and 2?', a: ['Day of the Dead', 'Cinco de Mayo', 'Easter', 'Fiscal Year End'], f: 'Dia de los Muertos honors loved ones with color, music and food.' },
  { q: "What is a ghost's favourite kind of meeting?", a: ['A boo-ard meeting', 'A stand-up', 'An all-hands', 'A retro-spective'], f: 'Terrible pun. Fully intentional.' }
];
const QMSG = ['The ghosts are disappointed. They expected more from someone with a work email.', 'The ghosts are disappointed. They expected more from someone with a work email.', 'Dangerously average. The ghosts will let you live. Barely.', 'Respectable! You would survive at least until the second act.', 'Impressive. Even the skeletons nodded.', 'Perfect! You are officially Head of Spookology.'];
function gQuiz() {
  const P = $('#gpanel');
  if (!qz) {
    P.innerHTML = `<h2>Halloween Quiz</h2><p class="lead">Five questions. Zero pressure. Slight pressure.</p>${S.quiz?.done ? `<p class="lead">Your best: <strong>${S.quiz.best} / 5</strong></p>` : ''}<button class="btn big" id="qs" type="button">${S.quiz?.done ? 'Play again' : 'Start the quiz'}</button>`;
    $('#qs').onclick = () => { qz = { i: 0, score: 0 }; gQuiz(); }; return;
  }
  if (qz.i >= QUIZ.length) {
    const best = Math.max(S.quiz?.best ?? 0, qz.score); S.quiz = { done: true, best, last: qz.score }; update(); qz.score === 5 && (confetti(80), sfx.win());
    P.innerHTML = `<h2>Results</h2><div class="score">${qz.score} / 5</div><div class="say">${QMSG[qz.score]}</div><div class="row" style="margin-top:18px"><button class="btn" id="qr" type="button">Restart quiz</button><button class="btn ghost" id="qh" type="button">Back to the office</button></div>`;
    $('#qr').onclick = () => { qz = { i: 0, score: 0 }; gQuiz(); }; $('#qh').onclick = () => { qz = null; go('office'); }; return;
  }
  const Q = QUIZ[qz.i], order = shuffle(Q.a.map((t, i) => i));
  P.innerHTML = `<div class="qmeta"><span>Question ${qz.i + 1} of ${QUIZ.length}</span><span>Score ${qz.score}</span></div><div class="qbar"><i style="width:${qz.i / QUIZ.length * 100}%"></i></div>
    <p class="qq">${Q.q}</p><div class="opts">${order.map(i => `<button class="opt" type="button" data-i="${i}">${Q.a[i]}</button>`).join('')}</div><div class="say" id="qf" aria-live="polite" hidden></div><div class="row" id="qn" style="margin-top:14px"></div>`;
  $$('.opt', P).forEach(b => b.onclick = () => {
    const ok = +b.dataset.i === 0; $$('.opt', P).forEach(o => { o.disabled = true; if (+o.dataset.i === 0) o.classList.add('right'); });
    if (ok) { qz.score++; sfx.ok(); } else { b.classList.add('wrong'); sfx.bad(); }
    const f = $('#qf'); f.hidden = false; setSay(f, `<strong>${ok ? 'Correct!' : 'Not quite.'}</strong> ${Q.f}`);
    $('#qn').innerHTML = `<button class="btn" id="qnext" type="button">${qz.i === QUIZ.length - 1 ? 'See results' : 'Next question'}</button>`;
    $('#qnext').onclick = () => { qz.i++; gQuiz(); }; $('#qnext').focus({ preventScroll: true });
  });
}
function gGhosts() {
  const n = S.ghosts.length;
  $('#gpanel').innerHTML = `<h2>Find the Ghosts</h2><p class="lead">Five tiny ghosts are hiding around the office floor. They shimmer faintly. Hover or tap the dark corners of each room to catch them.</p>
    <div class="gdots" role="img" aria-label="${n} of 5 ghosts found">${[0, 1, 2, 3, 4].map(i => `<svg class="${S.ghosts.includes(i) ? 'on' : ''}"><use href="#g-ghost"/></svg>`).join('')}</div>
    ${n >= 5 ? '<div class="reward"><h3>Ghost Hunter badge unlocked</h3><p>Reward: one (1) coupon for a guilt-free long lunch. Not valid anywhere. Ask your manager. Or do not.</p></div>' : `<p class="lead">${n === 0 ? 'None found yet. They are very good at hiding.' : `${5 - n} still hiding.`}</p>`}
    <button class="btn" id="hunt" type="button">${n >= 5 ? 'Back to the office' : 'Start hunting'}</button>`;
  $('#hunt').onclick = () => go('office');
}

/* ---------- finale, confetti ---------- */
const cf = $('#confetti'), cx = cf.getContext('2d'); let parts = [], cfRun = false, cfTimer;
function sizeCf() { cf.width = innerWidth; cf.height = innerHeight; }
addEventListener('resize', sizeCf); sizeCf();
function confetti(n = 120) {
  if (reduce()) return; sizeCf();
  const cols = ['#FF7518', '#F5F0E8', '#9b6be0', '#A30000', '#ffb36b'];
  for (let i = 0; i < n; i++) parts.push({ x: rnd(0, cf.width), y: rnd(-40, -10), vx: rnd(-60, 60), vy: rnd(120, 340), w: rnd(6, 12), h: rnd(8, 16), r: rnd(0, 6), vr: rnd(-6, 6), c: pick(cols) });
  if (!cfRun) { cfRun = true; let last = performance.now(); requestAnimationFrame(function loop(t) {
    const dt = Math.min(.05, (t - last) / 1000); last = t; cx.clearRect(0, 0, cf.width, cf.height);
    parts = parts.filter(p => p.y < cf.height + 30);
    for (const p of parts) { p.x += p.vx * dt + Math.sin(p.y / 40) * .6; p.y += p.vy * dt; p.r += p.vr * dt; cx.save(); cx.translate(p.x, p.y); cx.rotate(p.r); cx.fillStyle = p.c; cx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); cx.restore(); }
    if (parts.length) requestAnimationFrame(loop); else { cfRun = false; cx.clearRect(0, 0, cf.width, cf.height); }
  }); }
}
function stopConfetti() { clearInterval(cfTimer); }
function startFinale() {
  const n = doneCount(); $('#nameIn').value = S.name;
  const upd = () => { $('#certName').textContent = S.name || 'A Brave Teammate'; $('#certStats').textContent = `${n}/${TASKS.length} challenges · Quiz ${S.quiz?.best ?? 0}/5 · ${S.ghosts.length}/5 ghosts · ${new Date().toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}`; };
  upd(); $('#nameIn').oninput = e => { S.name = e.target.value.trim(); save(); upd(); };
  sfx.win(); confetti(200); clearInterval(cfTimer); cfTimer = setInterval(() => confetti(14), 1100);
  if (!reduce()) for (let i = 0; i < 3; i++) setTimeout(() => spawnWanderer(), 1500 * (i + 1));
}
$('#finShare').onclick = share;
$('#shareBtn').onclick = share;
$('#replay').onclick = async () => {
  if (await ask({ title: 'Replay the experience?', body: 'Your progress will be cleared and the door will lock behind you again.', actions: [{ label: 'Replay', primary: true, value: 1 }, { label: 'Not yet' }] })) { resetProgress(); location.reload(); }
};

/* ---------- share ---------- */
async function share() {
  const url = location.href.split('#')[0], text = 'I survived THE HAUNTED OFFICE 🎃 Dare to enter?';
  try { if (navigator.share) { await navigator.share({ title: 'The Haunted Office', text, url }); return; } } catch (e) { if (e.name === 'AbortError') return; }
  try { await navigator.clipboard.writeText(`${text} ${url}`); toast('Link copied! Send it to your team.'); }
  catch { ask({ title: 'Copy this link', body: url, actions: [{ label: 'Close', primary: true }] }); }
}

/* ---------- selfie (camera only after the button + permission) ---------- */
let stream, shot;
const sv = $('#selfVid'), si = $('#selfImg');
const selfUI = state => {
  sv.hidden = state !== 'live'; si.hidden = state !== 'shot'; $('#selfFrame').hidden = state === 'idle';
  $('#selfEmpty').hidden = state !== 'idle'; $('#selfStart').hidden = state !== 'idle';
  $('#selfSnap').hidden = state !== 'live'; $('#selfSave').hidden = $('#selfRetake').hidden = state !== 'shot';
  $('#selfUp').hidden = state === 'live';
};
function stopStream() { stream?.getTracks().forEach(t => t.stop()); stream = null; sv.srcObject = null; }
function selfErr(m) { $('#selfErr').textContent = m; }
$('#finSelfie').onclick = () => { selfErr(''); selfUI('idle'); $('#selfie').showModal(); };
$('#selfClose').onclick = () => $('#selfie').close();
$('#selfie').addEventListener('close', stopStream);
$('#selfStart').onclick = async () => {
  selfErr('');
  if (!navigator.mediaDevices?.getUserMedia) { selfErr('The camera is not available here. You can use a photo instead.'); return; }
  try { stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 1080 }, height: { ideal: 1350 } }, audio: false }); sv.srcObject = stream; await sv.play(); selfUI('live'); }
  catch (e) { stopStream(); selfErr(e.name === 'NotAllowedError' ? 'Camera permission was denied. Allow it in your browser settings, or use a photo instead.' : e.name === 'NotFoundError' ? 'No camera found on this device. You can use a photo instead.' : 'The camera could not start. You can use a photo instead.'); }
};
async function compose(src, sw, sh, mirror) {
  try { await document.fonts.load('96px Creepster'); } catch {}
  const W = 1080, H = 1350, c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
  const r = Math.max(W / sw, H / sh), dw = sw * r, dh = sh * r;
  x.save(); if (mirror) { x.translate(W, 0); x.scale(-1, 1); } x.drawImage(src, (W - dw) / 2, (H - dh) / 2, dw, dh); x.restore();
  x.fillStyle = 'rgba(84,43,117,.2)'; x.fillRect(0, 0, W, H);
  const g = x.createRadialGradient(W / 2, H / 2, 320, W / 2, H / 2, 900); g.addColorStop(0, 'rgba(8,9,15,0)'); g.addColorStop(1, 'rgba(8,9,15,.88)'); x.fillStyle = g; x.fillRect(0, 0, W, H);
  const web = (cx0, cy0, sx, sy, R) => { x.strokeStyle = 'rgba(245,240,232,.55)'; x.lineWidth = 2;
    for (let i = 0; i <= 4; i++) { const a = i * Math.PI / 8; x.beginPath(); x.moveTo(cx0, cy0); x.lineTo(cx0 + sx * R * Math.cos(a), cy0 + sy * R * Math.sin(a)); x.stroke(); }
    for (let k = 1; k <= 4; k++) { x.beginPath(); for (let i = 0; i <= 4; i++) { const a = i * Math.PI / 8, rr = R * k / 4, px = cx0 + sx * rr * Math.cos(a), py = cy0 + sy * rr * Math.sin(a); i ? x.lineTo(px, py) : x.moveTo(px, py); } x.stroke(); } };
  web(0, 0, 1, 1, 260); web(W, 0, -1, 1, 260);
  x.fillStyle = '#0a0a12'; const bat = new Path2D('M30 12C26 4 18 2 6 6c4 4 4 10 2 16 6-4 12-2 16 4 2-4 4-6 6-6s4 2 6 6c4-6 10-8 16-4-2-6-2-12 2-16C42 2 34 4 30 12z');
  [[170, 330, 3], [900, 260, 2.4], [820, 520, 1.6]].forEach(([bx, by, s]) => { x.save(); x.translate(bx, by); x.scale(s, s); x.shadowColor = '#FF7518'; x.shadowBlur = 12; x.fill(bat); x.restore(); });
  x.fillStyle = 'rgba(8,9,15,.82)'; x.fillRect(0, 1120, W, 230); x.textAlign = 'center';
  x.fillStyle = '#FF7518'; x.shadowColor = '#FF7518'; x.shadowBlur = 24; x.font = '104px Creepster, fantasy'; x.fillText('THE HAUNTED OFFICE', W / 2, 1236); x.shadowBlur = 0;
  x.fillStyle = '#F5F0E8'; x.font = '800 40px Manrope, system-ui, sans-serif'; x.fillText('I SURVIVED  ·  HAPPY HALLOWEEN, TEAM!', W / 2, 1306);
  return c;
}
async function showShot(c) { shot = c; si.src = c.toDataURL('image/jpeg', .9); selfUI('shot'); sfx.found(); }
$('#selfSnap').onclick = async () => { if (!sv.videoWidth) { selfErr('The camera is still warming up. Try again in a second.'); return; } sfx.knock(); const c = await compose(sv, sv.videoWidth, sv.videoHeight, true); stopStream(); showShot(c); };
$('#selfRetake').onclick = () => { selfErr(''); selfUI('idle'); };
$('#selfFile').onchange = e => {
  const f = e.target.files[0]; e.target.value = ''; if (!f) return; selfErr('');
  const im = new Image(), u = URL.createObjectURL(f);
  im.onload = async () => { const c = await compose(im, im.naturalWidth, im.naturalHeight, false); URL.revokeObjectURL(u); stopStream(); showShot(c); };
  im.onerror = () => selfErr('That file could not be read as a photo. Try another one.'); im.src = u;
};
$('#selfSave').onclick = () => shot.toBlob(b => { const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'haunted-office-selfie.jpg'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); toast('Saved. Post it before the ghosts do.'); }, 'image/jpeg', .92);

/* ---------- easter eggs ---------- */
const MOON = ['The moon whispers: "Have you tried turning it off and on again?" ...Too late. It is a full moon.', 'The moon says: back up your files. Something is lurking in the cloud.', 'Secret: the real 13th floor is just a very long meeting that never ended.', 'The moon knows who left the microwave fish. It is judging them.'];
function egg(k) { if (!S.eggs[k]) { S.eggs[k] = 1; save(); toast('Hidden secret found! (' + Object.keys(S.eggs).length + ' / 3)'); } }
document.addEventListener('click', e => {
  const pk = e.target.closest('[data-pk]'), mn = e.target.closest('[data-moon]');
  if (pk) { initAudio(); pk.classList.remove('laugh'); void pk.offsetWidth; pk.classList.add('laugh'); sfx.laugh(); popText(pk, pick(['HEHEHEHE!', 'MUAHAHA!', 'Hehe... you poked me.'])); egg('pumpkin'); }
  if (mn) { initAudio(); sfx.whisper(); egg('moon'); ask({ title: 'A secret from the moon', body: pick(MOON), actions: [{ label: 'Creepy. Thanks.', primary: true }] }); }
});
$('#bats').addEventListener('click', e => {
  const b = e.target.closest('.bat'); if (!b || b.classList.contains('zap')) return;
  initAudio(); b.classList.add('zap'); sfx.screech(); popText(b, pick(['SCREEEECH!', 'EEEEK!', 'Not the face!', 'Squeak?'])); egg('bat'); setTimeout(() => b.classList.remove('zap'), 900);
});
function makeBats() {
  for (let i = 0; i < 4; i++) {
    const b = document.createElement('button'); b.className = 'bat'; b.type = 'button'; b.setAttribute('aria-label', 'A flying bat. Poke it.');
    b.style.setProperty('--d', rnd(15, 28).toFixed(1) + 's'); b.style.setProperty('--dl', '-' + rnd(0, 20).toFixed(1) + 's'); b.style.setProperty('--b', rnd(2, 4).toFixed(1) + 's'); b.style.top = rnd(10, 62) + 'vh';
    b.innerHTML = '<svg><use href="#g-bat"/></svg>'; b.addEventListener('animationiteration', e => { if (e.target === b) b.style.top = rnd(10, 62) + 'vh'; });
    $('#bats').appendChild(b);
  }
}
function spawnWanderer() {
  const g = document.createElement('div'), left = Math.random() < .5; g.className = 'wg' + (left ? ' l' : ''); g.style.top = rnd(12, 70) + 'vh'; g.innerHTML = '<svg><use href="#g-ghost"/></svg>';
  document.body.appendChild(g); sfx.whisper(); setTimeout(() => g.remove(), 8200);
}
function hauntLoop() {
  setTimeout(() => {
    if (!reduce() && document.visibilityState === 'visible' && !$('#app').hidden && !document.querySelector('dialog[open]')) spawnWanderer();
    hauntLoop();
  }, rnd(20000, 42000));
  setTimeout(function f() { if (!reduce() && document.visibilityState === 'visible') { const el = $('#flicker'); el.classList.remove('on'); void el.offsetWidth; el.classList.add('on'); } setTimeout(f, rnd(16000, 38000)); }, rnd(9000, 16000));
}

/* ---------- intro ---------- */
function buildWindows() {
  let h = '';
  for (let r = 0; r < 5; r++) for (let c = 0; c < 4; c++) {
    const lit = Math.random() < .62;
    h += `<rect class="${lit ? 'win' : ''}" x="${62 + c * 48}" y="${82 + r * 42}" width="32" height="28" rx="2" fill="${lit ? (Math.random() < .7 ? '#ff9a3c' : '#9b6be0') : '#0a0a10'}" stroke="#2c2740" style="--w:${rnd(2, 6).toFixed(1)}s;--wd:-${rnd(0, 5).toFixed(1)}s"/>`;
  }
  $('#wins').innerHTML = h + '<use href="#g-ghost" x="165" y="125" width="20" height="25" opacity=".85" class="win" style="--w:3s;--wd:-1s"/>';
}
let entering = false;
function reveal() {
  $('#intro').hidden = true; $('#app').hidden = false; document.body.classList.remove('is-intro');
  renderHub(); go('office'); hauntLoop();
}
async function enter() {
  if (entering) return; entering = true; initAudio();
  const b = $('#building'), intro = $('#intro');
  if (reduce()) { sfx.creak(); reveal(); return; }
  intro.classList.add('opening'); b.classList.add('knock'); [0, 380, 760].forEach(ms => setTimeout(sfx.knock, ms));
  await wait(1200); b.classList.remove('knock'); b.classList.add('open'); sfx.creak();
  await wait(1500); sfx.whoosh(); b.classList.add('zoom'); intro.classList.add('leaving');
  await wait(1300); reveal(); sfx.ghost();
}
$('#enter').onclick = enter;
$('#skip').onclick = () => { if (entering) return; entering = true; initAudio(); sfx.whoosh(); $('#intro').classList.add('leaving'); setTimeout(reveal, 450); };

/* ---------- boot ---------- */
buildWindows(); makeBats(); renderToggles();
addEventListener('load', async () => {
  const imgs = ['graveyard', 'door', 'pumpkin'].map(n => new Promise(r => { const i = new Image(); i.onload = i.onerror = r; i.src = `${n}.jpg`; }));
  await Promise.race([Promise.all([...imgs, document.fonts?.ready]), wait(3500)]);
  await wait(500); $('#loader').classList.add('done'); setTimeout(() => $('#loader').remove(), 800);
  $('#enter').focus({ preventScroll: true });
});
// test hook (harmless): lets you inspect state from the console
window.__haunted = { get state() { return S; } };
})();
