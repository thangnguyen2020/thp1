// ===================================================================
//  Học Piano – prototype
//  Phần 1: đọc bài nhạc (lessons.js)   Phần 2: âm thanh & máy đếm nhịp
//  Phần 3: bàn phím ảo                 Phần 4: khuông nhạc (VexFlow)
//  Phần 5: logic bài tập               Phần 6: kết nối đàn (Web MIDI)
//  Phần 7: mục lục & lưu tiến độ
// ===================================================================

const $ = (id) => document.getElementById(id);
const VF = Vex.Flow;

// ---------- Phần 1: đọc bài nhạc ----------
const PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const VI_NAMES = { C: "Đô", D: "Rê", E: "Mi", F: "Fa", G: "Sol", A: "La", B: "Si" };
const BEATS = { w: 4, hd: 3, h: 2, qd: 1.5, q: 1, "8": 0.5 };
const NOTE_RE = /^([A-G])([#b]?)(\d)$/;

function noteToMidi(name) {
  const m = NOTE_RE.exec(name);
  let n = 12 * (Number(m[3]) + 1) + PC[m[1]];
  if (m[2] === "#") n++;
  if (m[2] === "b") n--;
  return n;
}
const WHITE_PCS = [0, 2, 4, 5, 7, 9, 11];
const LETTERS_BY_PC = { 0: "C", 2: "D", 4: "E", 5: "F", 7: "G", 9: "A", 11: "B" };
const isWhite = (midi) => WHITE_PCS.includes(midi % 12);

let useSolfege = true; // true: Đô Rê Mi, false: C D E
function label(midi) {
  const letter = LETTERS_BY_PC[midi % 12];
  if (!letter) return "";
  return useSolfege ? VI_NAMES[letter] : letter;
}

// Đọc một dòng nốt (ví dụ "C4:q:1 D4:q:2 | C3+E3+G3:w:5+3+1") thành danh sách sự kiện.
function parseVoice(str, hand) {
  const evs = [];
  let dyn = null, sym = null, beat = 0;
  for (let tok of str.split(/\s+/)) {
    if (!tok || tok === "|") continue;
    if (tok[0] === "!") { dyn = tok.slice(1); continue; }
    if (tok[0] === "@") { sym = tok.slice(1); continue; }
    let slurStart = false, slurEnd = false;
    if (tok[0] === "(") { slurStart = true; tok = tok.slice(1); }
    if (tok.endsWith(")")) { slurEnd = true; tok = tok.slice(0, -1); }
    const [p, d0 = "q", f] = tok.split(":");
    let dur = d0, tie = false;
    if (dur.endsWith("~")) { tie = true; dur = dur.slice(0, -1); }
    if (!(dur in BEATS)) throw new Error(`trường độ "${d0}" không hợp lệ ở "${tok}"`);
    const rest = p === "r";
    const keys = rest ? [] : p.split("+");
    keys.forEach((k) => { if (!NOTE_RE.test(k)) throw new Error(`tên nốt "${k}" không hợp lệ`); });
    evs.push({
      hand, keys, midis: keys.map(noteToMidi), dur, beats: BEATS[dur],
      fingers: f ? f.split("+") : null, rest, tie, tiedFrom: false,
      dyn, sym, slurStart, slurEnd, onset: beat,
    });
    beat += BEATS[dur];
    dyn = null; sym = null;
  }
  for (let i = 1; i < evs.length; i++) if (evs[i - 1].tie && !evs[i].rest) evs[i].tiedFrom = true;
  return evs;
}

// Chuẩn bị một bài: tách tay, gom các nốt cùng thời điểm thành "bước", chia dòng.
function prepare(lesson) {
  if (lesson.prep || lesson.soon) return lesson.prep;
  const time = lesson.time || 4;
  const voices = {};
  if (lesson.rh) voices.R = parseVoice(lesson.rh, "R");
  if (lesson.lh) voices.L = parseVoice(lesson.lh, "L");
  const all = [...(voices.R || []), ...(voices.L || [])];

  const byOnset = new Map();
  all.forEach((e) => {
    if (e.rest || e.tiedFrom) return;
    if (!byOnset.has(e.onset)) byOnset.set(e.onset, new Set());
    e.midis.forEach((m) => byOnset.get(e.onset).add(m));
  });
  const steps = [...byOnset.keys()].sort((a, b) => a - b).map((o) => ({ onset: o, midis: [...byOnset.get(o)] }));
  all.forEach((e) => {
    const i = steps.findIndex((s) => s.onset >= e.onset - 1e-9);
    e.step = i === -1 ? steps.length : i;
  });

  const firstLen = lesson.pickup || time;
  const measureOf = (onset) => (onset < firstLen - 1e-9 ? 0 : 1 + Math.floor((onset - firstLen + 1e-9) / time));
  const total = Math.max(...Object.values(voices).map((v) => v.reduce((s, e) => s + e.beats, 0)));
  const nMeasures = measureOf(total - 1e-6) + 1;
  // chia dòng: 4 ô nhịp mỗi dòng, không để dòng cuối chỉ có 1 ô
  const lines = [];
  if (nMeasures <= 5) lines.push([0, nMeasures - 1]);
  else {
    for (let m = 0; m < nMeasures; m += 4) lines.push([m, Math.min(m + 3, nMeasures - 1)]);
    const last = lines[lines.length - 1];
    if (last[0] === last[1]) { lines.pop(); lines[lines.length - 1][1] = last[1]; }
  }
  lesson.prep = { voices, steps, measureOf, lines, time, firstLen };
  return lesson.prep;
}

// ---------- Phần 2: âm thanh & máy đếm nhịp ----------
let audio = null;
function ac() {
  audio = audio || new (window.AudioContext || window.webkitAudioContext)();
  if (audio.state === "suspended") audio.resume();
  return audio;
}

function playTone(midi) {
  const a = ac();
  const t = a.currentTime;
  const freq = 440 * Math.pow(2, (midi - 69) / 12);
  const out = a.createGain();
  out.gain.setValueAtTime(0, t);
  out.gain.linearRampToValueAtTime(0.3, t + 0.008);
  out.gain.exponentialRampToValueAtTime(0.001, t + 1.6);
  out.connect(a.destination);
  [[1, 1, "triangle"], [2, 0.35, "sine"], [3, 0.12, "sine"]].forEach(([mult, g, type]) => {
    const o = a.createOscillator();
    const og = a.createGain();
    o.type = type;
    o.frequency.value = freq * mult;
    og.gain.value = g;
    o.connect(og).connect(out);
    o.start(t);
    o.stop(t + 1.7);
  });
}

function click(time, accent) {
  const a = ac();
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = "square";
  o.frequency.value = accent ? 1600 : 1000;
  g.gain.setValueAtTime(0.0001, time);
  g.gain.exponentialRampToValueAtTime(accent ? 0.35 : 0.2, time + 0.002);
  g.gain.exponentialRampToValueAtTime(0.0001, time + 0.05);
  o.connect(g).connect(a.destination);
  o.start(time);
  o.stop(time + 0.06);
}

const metro = { on: false, bpm: 60, running: false, timer: null, nextBeat: 0, beatNo: 0, countIn: 0 };
const spb = () => 60 / metro.bpm; // số giây mỗi phách

function metroStart(beatsPerBar, onCountInEnd) {
  metroStop();
  const a = ac();
  metro.running = true;
  metro.beatNo = 0;
  metro.countIn = beatsPerBar;
  metro.nextBeat = a.currentTime + 0.15;
  const countInEndTime = metro.nextBeat + beatsPerBar * spb();
  metro.timer = setInterval(() => {
    while (metro.nextBeat < a.currentTime + 0.12) {
      const beatInBar = metro.beatNo % beatsPerBar;
      const when = metro.nextBeat;
      const n = metro.beatNo;
      click(when, beatInBar === 0);
      setTimeout(() => showBeat(beatInBar, beatsPerBar, n), Math.max(0, (when - a.currentTime) * 1000));
      metro.beatNo++;
      metro.nextBeat += spb();
    }
  }, 25);
  onCountInEnd(countInEndTime);
}

function metroStop() {
  metro.running = false;
  clearInterval(metro.timer);
  $("countIn").classList.add("hidden");
  renderDots(curTime(), -1);
}

function renderDots(n, active) {
  const d = $("beatDots");
  d.innerHTML = "";
  if (!metro.on) return;
  for (let i = 0; i < n; i++) {
    const el = document.createElement("i");
    if (i === active) el.className = "on" + (i === 0 ? " accent" : "");
    d.appendChild(el);
  }
}

function showBeat(beatInBar, beatsPerBar, n) {
  if (!metro.running) return;
  renderDots(beatsPerBar, beatInBar);
  const ci = $("countIn");
  if (n < metro.countIn) { ci.textContent = String(n + 1); ci.classList.remove("hidden"); }
  else ci.classList.add("hidden");
}

// ---------- Phần 3: bàn phím ảo ----------
const KB_LOW = 36;  // C2
const KB_HIGH = 84; // C6
const keyEls = {};

function buildKeyboard() {
  const kb = $("keyboard");
  kb.innerHTML = "";
  const whites = [];
  for (let m = KB_LOW; m <= KB_HIGH; m++) if (isWhite(m)) whites.push(m);
  const ww = 100 / whites.length;
  let wi = 0;
  for (let m = KB_LOW; m <= KB_HIGH; m++) {
    const el = document.createElement("div");
    if (isWhite(m)) {
      el.className = "key white";
      el.style.left = wi * ww + "%";
      el.style.width = ww + "%";
      wi++;
    } else {
      el.className = "key black";
      el.style.left = (wi - 0.3) * ww + "%";
      el.style.width = ww * 0.6 + "%";
    }
    el.addEventListener("pointerdown", (e) => { e.preventDefault(); onNoteInput(m, "mouse"); });
    kb.appendChild(el);
    keyEls[m] = el;
  }
}

function flashKey(midi, cls, ms = 350) {
  const el = keyEls[midi];
  if (!el) return;
  el.classList.add(cls);
  setTimeout(() => el.classList.remove(cls), ms);
}

function showTargetKeys(midis) {
  const set = new Set(midis);
  for (const [m, el] of Object.entries(keyEls)) {
    const isT = set.has(Number(m));
    el.classList.toggle("target", isT);
    if (el.classList.contains("white")) el.textContent = isT ? label(Number(m)) : "";
  }
}

// ---------- Phần 4: khuông nhạc (VexFlow) ----------
const COLORS = { done: "#22a05a", off: "#f08c00", current: "#19c9c9", todo: "#111111", wrong: "#e5484d" };
const TOP = VF.AnnotationVerticalJustify ? VF.AnnotationVerticalJustify.TOP : 1;
const BOTTOM = VF.AnnotationVerticalJustify ? VF.AnnotationVerticalJustify.BOTTOM : 3;

function vfKey(name) {
  const m = NOTE_RE.exec(name);
  return { key: `${m[1].toLowerCase()}${m[2]}/${m[3]}`, acc: m[2] };
}

function makeNote(e, clef, wrong) {
  const restKey = clef === "bass" ? "d/3" : "b/4";
  const keys = e.rest ? [restKey] : e.keys.map((k) => vfKey(k).key);
  const sn = new VF.StaveNote({ keys, duration: e.dur + (e.rest ? "r" : ""), clef, auto_stem: !e.rest });
  if (!e.rest) e.keys.forEach((k, i) => { const a = vfKey(k).acc; if (a) sn.addModifier(new VF.Accidental(a), i); });
  if (e.dur.endsWith("d")) VF.Dot.buildAndAttach([sn], { all: true });

  const up = e.hand === "R";
  if (e.fingers) {
    // số ngón xếp chồng theo cao độ: ngón của nốt cao nhất ở trên cùng
    const list = up ? e.fingers : [...e.fingers].reverse();
    list.forEach((f) => {
      if (f) sn.addModifier(new VF.Annotation(f).setFont("Arial", 12, "bold").setVerticalJustification(up ? TOP : BOTTOM), 0);
    });
  }
  if (e.sym) sn.addModifier(new VF.Annotation(e.sym).setFont("Arial", 15, "bold").setVerticalJustification(TOP), 0);
  if (e.dyn) sn.addModifier(new VF.Annotation(e.dyn).setFont("Times New Roman", 17, "bold italic").setVerticalJustification(BOTTOM), 0);

  let c = COLORS.todo;
  if (e.rest) c = COLORS.todo; // dấu lặng luôn giữ màu đen
  else if (e.step < state.idx) c = state.marks[e.step] && state.marks[e.step] !== "ok" ? COLORS.off : COLORS.done;
  else if (e.step === state.idx && !e.rest && !e.tiedFrom) c = wrong ? COLORS.wrong : COLORS.current;
  sn.setStyle({ fillStyle: c, strokeStyle: c });
  e.vf = sn;
  return sn;
}

function currentLine(prep) {
  const step = prep.steps[Math.min(state.idx, prep.steps.length - 1)];
  const m = prep.measureOf(step.onset);
  return Math.max(0, prep.lines.findIndex(([a, b]) => m >= a && m <= b));
}

function drawStaff(wrong = false) {
  const box = $("staff");
  box.innerHTML = "";
  const lesson = state.lesson;
  const prep = prepare(lesson);

  if (lesson.mode === "find") {
    const step = prep.steps[Math.min(state.idx, prep.steps.length - 1)];
    const midi = step.midis[0];
    const other = useSolfege ? LETTERS_BY_PC[midi % 12] : VI_NAMES[LETTERS_BY_PC[midi % 12]];
    box.innerHTML = `<div class="find ${wrong ? "bad" : ""}">Tìm phím<b>${label(midi)}</b><span>(${other})</span></div>`;
    return;
  }

  const li = currentLine(prep);
  const [m0, m1] = prep.lines[li];
  const inLine = (e) => { const m = prep.measureOf(e.onset); return m >= m0 && m <= m1; };
  const grand = prep.voices.R && prep.voices.L;
  const onsets = new Set();
  Object.values(prep.voices).forEach((v) => v.filter(inLine).forEach((e) => onsets.add(e.onset)));

  const H = grand ? 330 : 200;
  const L = Math.max(520, (li === 0 ? 150 : 110) + onsets.size * 58 + (m1 - m0) * 14);
  const scale = Math.min((box.clientWidth - 24) / L, (box.clientHeight - 8) / H, 2.4);

  const renderer = new VF.Renderer(box, VF.Renderer.Backends.SVG);
  renderer.resize(L * scale, H * scale);
  const ctx = renderer.getContext();
  ctx.scale(scale, scale);
  const svg = box.querySelector("svg");

  const staves = {};
  const yFor = { R: 45, L: grand ? 175 : (prep.voices.L ? 35 : 45) };
  for (const hand of Object.keys(prep.voices)) {
    const s = new VF.Stave(10, yFor[hand], L - 20);
    s.addClef(hand === "R" ? "treble" : "bass");
    if (li === 0) s.addTimeSignature(`${prep.time}/4`);
    if (li === prep.lines.length - 1) s.setEndBarType(VF.Barline.type.END);
    staves[hand] = s;
  }
  const startX = Math.max(...Object.values(staves).map((s) => s.getNoteStartX()));
  Object.values(staves).forEach((s) => {
    s.setNoteStartX(startX);
    const bg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    const y0 = s.getYForLine(0);
    bg.setAttribute("x", 10); bg.setAttribute("y", y0);
    bg.setAttribute("width", L - 20); bg.setAttribute("height", s.getYForLine(4) - y0);
    bg.setAttribute("fill", "#ffffff");
    svg.appendChild(bg);
    s.setContext(ctx).draw();
  });
  if (grand) {
    new VF.StaveConnector(staves.R, staves.L).setType("brace").setContext(ctx).draw();
    new VF.StaveConnector(staves.R, staves.L).setType("singleLeft").setContext(ctx).draw();
    new VF.StaveConnector(staves.R, staves.L)
      .setType(li === prep.lines.length - 1 ? "boldDoubleRight" : "singleRight").setContext(ctx).draw();
  }

  const voices = [];
  const lineBeats = prep.measureOf(0) === 0 ? 100 : 100; // chế độ SOFT không kiểm tra tổng phách
  for (const [hand, evs] of Object.entries(prep.voices)) {
    const clef = hand === "R" ? "treble" : "bass";
    const tick = [];
    let prevM = m0;
    evs.filter(inLine).forEach((e) => {
      const m = prep.measureOf(e.onset);
      if (m !== prevM) { tick.push(new VF.BarNote()); prevM = m; }
      tick.push(makeNote(e, clef, wrong));
    });
    tick.forEach((t) => t.setStave(staves[hand]).setContext(ctx));
    const v = new VF.Voice({ num_beats: lineBeats, beat_value: 4 }).setMode(VF.Voice.Mode.SOFT);
    v.addTickables(tick);
    voices.push({ v, stave: staves[hand], evs: evs.filter(inLine), all: evs });
  }
  const fmt = new VF.Formatter();
  voices.forEach(({ v }) => fmt.joinVoices([v]));
  fmt.format(voices.map((x) => x.v), L - 20 - (startX - 10) - 20);
  voices.forEach(({ v, stave }) => v.draw(ctx, stave));

  // dấu nối và dấu luyến
  voices.forEach(({ evs, all }) => {
    let slurFrom = null;
    evs.forEach((e) => {
      if (e.tie) {
        const next = all[all.indexOf(e) + 1];
        const idx = e.keys.map((_, i) => i);
        new VF.StaveTie({
          first_note: e.vf, last_note: next && evs.includes(next) ? next.vf : null,
          first_indices: idx, last_indices: idx,
        }).setContext(ctx).draw();
      }
      if (e.slurStart) slurFrom = e;
      if (e.slurEnd && slurFrom && slurFrom !== e) {
        new VF.Curve(slurFrom.vf, e.vf, {}).setContext(ctx).draw();
        slurFrom = null;
      }
    });
  });

  if (prep.lines.length > 1) {
    const tag = document.createElement("div");
    tag.className = "line-tag";
    tag.textContent = `Dòng ${li + 1}/${prep.lines.length}`;
    box.appendChild(tag);
  }
}

// ---------- Phần 5: logic bài tập ----------
const state = {
  lesson: null, idx: 0, mistakes: 0, paused: false, done: false,
  marks: [],          // kết quả nhịp từng bước: "ok" | "early" | "late"
  got: new Set(),     // các phím đã bấm đúng của bước hiện tại (hợp âm)
  firstAt: 0,         // lúc bấm phím đầu tiên của bước
  hint: false,        // trò chơi tìm phím: hiện gợi ý sau khi bấm sai
  nextExpected: null, // thời điểm bước hiện tại nên được chơi (khi bật máy đếm nhịp)
};

const curTime = () => (state.lesson && state.lesson.time) || 4;
function allLessons() { return UNITS.flatMap((u) => u.lessons); }
function lessonNumber(lesson) { return allLessons().indexOf(lesson) + 1; }
function lessonId(l) { return l.id || `p${l.page}`; }
function nextPlayable(lesson) {
  const list = allLessons();
  return list.slice(list.indexOf(lesson) + 1).find((l) => !l.soon && !l.error);
}
function kindOf(l) {
  if (l.soon) return "soon";
  if (!l.rh && !l.lh) return "theory";
  if (l.rh && l.lh) return "both";
  return l.lh ? "L" : "R";
}
const KIND_LABEL = { soon: "Sắp có", theory: "Lý thuyết", both: "Hai tay", R: "Tay phải", L: "Tay trái" };

function openLesson(lesson) {
  if (lesson.soon || lesson.error) return;
  saveLast(lessonId(lesson));
  if (kindOf(lesson) === "theory") { showTheory(lesson, true); return; }
  startLesson(lesson);
  if (lesson.read) showTheory(lesson, false);
}

function startLesson(lesson, keepBpm = false) {
  metroStop();
  prepare(lesson);
  Object.assign(state, {
    lesson, idx: 0, mistakes: 0, paused: false, done: false, marks: [],
    got: new Set(), hint: false, nextExpected: null,
  });
  $("home").classList.add("hidden");
  $("play").classList.remove("hidden");
  ["result", "pauseMenu", "theory"].forEach((id) => $(id).classList.add("hidden"));
  const k = kindOf(lesson);
  const how = lesson.mode === "find" ? "Tìm phím theo tên" : k === "both" ? "Chơi hai tay" : k === "L" ? "Chơi bằng tay trái" : "Chơi bằng tay phải";
  $("instrText").textContent = `Bài ${lessonNumber(lesson)} (tr. ${lesson.page}): ${lesson.title}`;
  $("tipText").textContent = how;
  $("reviewBtn").classList.toggle("hidden", !lesson.read);
  setFeedback("");
  if (lesson.tempo && !keepBpm) setBpm(lesson.tempo);
  updateMetroUI();
  refresh();
  if (metro.on && lesson.mode !== "find") beginRhythm(true);
}

// Đếm vào 1 ô nhịp rồi bắt đầu tính giờ.
function beginRhythm(fromStart) {
  const prep = prepare(state.lesson);
  setFeedback("Nghe đếm vào, rồi bắt đầu chơi");
  metroStart(prep.time, (countInEnd) => {
    // bài có ô nhịp lấy đà: nốt đầu rơi vào giữa ô nhịp
    const offset = fromStart ? (prep.time - prep.firstLen) + prep.steps[0].onset : 0;
    state.nextExpected = countInEnd + offset * spb();
    setTimeout(() => { if (metro.running && !state.done) setFeedback(""); }, (countInEnd - ac().currentTime) * 1000);
  });
}

function currentStep() {
  const prep = prepare(state.lesson);
  return prep.steps[state.idx] || null;
}

function refresh(wrong = false) {
  const prep = prepare(state.lesson);
  const total = prep.steps.length;
  $("progText").textContent = `${state.idx}/${total}`;
  $("progFill").style.width = (100 * state.idx) / total + "%";
  const step = currentStep();
  const remaining = step ? step.midis.filter((m) => !state.got.has(m)) : [];
  if (state.lesson.mode === "find") showTargetKeys(state.hint ? remaining : []);
  else showTargetKeys(remaining);
  drawStaff(wrong);
}

function setFeedback(text, color = "#fff") {
  const f = $("feedback");
  f.textContent = text;
  f.style.color = color;
}

// Chấm nhịp: so thời điểm bấm với thời điểm lẽ ra phải bấm.
function judgeTiming(at) {
  if (!metro.running || state.nextExpected == null) return null;
  const prep = prepare(state.lesson);
  const dev = (at - state.nextExpected) / spb(); // lệch bao nhiêu phách
  const next = prep.steps[state.idx + 1];
  // bước kế tiếp tính từ lúc thực sự bấm, để một lần trễ không kéo theo cả bài
  if (next) state.nextExpected = at + (next.onset - prep.steps[state.idx].onset) * spb();
  if (Math.abs(dev) <= 0.25) { setFeedback("Đúng nhịp!", "#b7ffcf"); return "ok"; }
  if (dev < 0) { setFeedback("Hơi sớm", "#ffd84d"); return "early"; }
  setFeedback("Hơi muộn", "#ffd84d");
  return "late";
}

// Mọi nguồn nhập (chuột, bàn phím máy tính, đàn MIDI) đều đi qua hàm này.
function onNoteInput(midi, source) {
  if (source !== "midi") playTone(midi); // đàn thật đã tự phát tiếng
  if (!state.lesson || state.paused || state.done || $("play").classList.contains("hidden")) {
    flashKey(midi, "down", 150);
    return;
  }
  const step = currentStep();
  if (!step) return;
  const find = state.lesson.mode === "find";
  const hit = step.midis.find((n) => (find ? n % 12 === midi % 12 : n === midi));
  if (hit !== undefined) {
    flashKey(midi, "ok");
    const now = audio ? audio.currentTime : 0;
    if (!state.got.size) state.firstAt = now;
    state.got.add(hit);
    if (state.got.size >= step.midis.length) {
      const mark = judgeTiming(state.firstAt);
      if (mark) state.marks[state.idx] = mark;
      state.idx++;
      state.got = new Set();
      state.hint = false;
      refresh();
      if (state.idx >= prepare(state.lesson).steps.length) finishLesson();
    } else refresh();
  } else {
    state.mistakes++;
    state.hint = true;
    flashKey(midi, "bad");
    refresh(true);
    const s = $("staff");
    s.classList.remove("shake"); void s.offsetWidth; s.classList.add("shake");
  }
}

function finishLesson() {
  state.done = true;
  const prep = prepare(state.lesson);
  const total = prep.steps.length;
  const pitchAcc = Math.round((100 * total) / (total + state.mistakes));
  let score = pitchAcc;
  let text = `Đúng nốt ${pitchAcc}% · ${state.mistakes} lần bấm sai`;
  const timed = state.marks.filter(Boolean).length;
  if (timed) {
    const rhythmAcc = Math.round((100 * state.marks.filter((m) => m === "ok").length) / timed);
    score = Math.round((pitchAcc + rhythmAcc) / 2);
    text += ` · Đúng nhịp ${rhythmAcc}% (tốc độ ${metro.bpm})`;
  }
  setTimeout(metroStop, metro.running ? 2 * spb() * 1000 : 0);
  const stars = score >= 95 ? 3 : score >= 80 ? 2 : 1;
  saveStars(lessonId(state.lesson), stars);
  $("resStars").textContent = "★".repeat(stars) + "☆".repeat(3 - stars);
  $("resText").textContent = text;
  $("nextBtn").classList.toggle("hidden", !nextPlayable(state.lesson));
  const lesson = state.lesson;
  setTimeout(() => { if (state.lesson === lesson && state.done) $("result").classList.remove("hidden"); }, 500);
}

// Thẻ lý thuyết
let theoryLesson = null;
function showTheory(lesson, standalone) {
  theoryLesson = lesson;
  state.paused = !standalone;
  if (!standalone) metroStop();
  $("thTitle").textContent = `Bài ${lessonNumber(lesson)} (tr. ${lesson.page}): ${lesson.title}`;
  $("thBody").innerHTML = (lesson.read || []).map((p) => `<p>${p}</p>`).join("");
  $("thStart").textContent = standalone ? "Đã hiểu · Bài tiếp theo" : "Bắt đầu luyện tập";
  $("thStart").dataset.standalone = standalone ? "1" : "";
  $("thStart").classList.toggle("hidden", standalone && !nextPlayable(lesson));
  $("thDone").classList.toggle("hidden", !standalone);
  $("theory").classList.remove("hidden");
}
$("thStart").onclick = () => {
  $("theory").classList.add("hidden");
  if ($("thStart").dataset.standalone) {
    saveStars(lessonId(theoryLesson), 3);
    openLesson(nextPlayable(theoryLesson));
  } else {
    state.paused = false;
    if (metro.on && state.lesson.mode !== "find" && !state.done) beginRhythm(state.idx === 0);
  }
};
$("thDone").onclick = () => { saveStars(lessonId(theoryLesson), 3); $("theory").classList.add("hidden"); goHome(); };
$("thHome").onclick = () => { $("theory").classList.add("hidden"); goHome(); };

function goHome() {
  metroStop();
  state.lesson = null;
  ["play", "result", "pauseMenu", "theory"].forEach((id) => $(id).classList.add("hidden"));
  $("home").classList.remove("hidden");
  renderHome();
}

$("pauseBtn").onclick = () => { state.paused = true; metroStop(); $("pauseMenu").classList.remove("hidden"); };
$("resumeBtn").onclick = () => {
  state.paused = false;
  $("pauseMenu").classList.add("hidden");
  if (metro.on && !state.done && state.lesson.mode !== "find") beginRhythm(state.idx === 0);
};
$("reviewBtn").onclick = () => { $("pauseMenu").classList.add("hidden"); showTheory(state.lesson, false); };
$("restartBtn").onclick = () => startLesson(state.lesson, true);
$("homeBtn").onclick = goHome;
$("resHomeBtn").onclick = goHome;
$("againBtn").onclick = () => startLesson(state.lesson, true);
$("nextBtn").onclick = () => openLesson(nextPlayable(state.lesson));

// Máy đếm nhịp: bật/tắt và chỉnh tốc độ
function updateMetroUI() {
  $("metroBtn").textContent = `Máy đếm nhịp: ${metro.on ? "Bật" : "Tắt"}`;
  $("metroBtn").classList.toggle("on", metro.on);
  $("bpmText").textContent = metro.bpm;
  renderDots(curTime(), -1);
}
function setBpm(v) {
  metro.bpm = Math.max(40, Math.min(160, v));
  updateMetroUI();
}
$("metroBtn").onclick = () => {
  metro.on = !metro.on;
  saveSettings({ metroOn: metro.on });
  updateMetroUI();
  startLesson(state.lesson, true); // bắt đầu lại bài để đếm vào cho chuẩn
};
$("bpmDown").onclick = () => { setBpm(metro.bpm - 5); if (metro.running) startLesson(state.lesson, true); };
$("bpmUp").onclick = () => { setBpm(metro.bpm + 5); if (metro.running) startLesson(state.lesson, true); };

// Bàn phím máy tính:
//   hàng giữa A W S E D F T G Y H U J K = Đô giữa đến Đô cao (tay phải)
//   hàng dưới Z X C V B N M = Đô thấp đến Si (tay trái)
const PC_KEYS = {
  a: 60, w: 61, s: 62, e: 63, d: 64, f: 65, t: 66, g: 67, y: 68, h: 69, u: 70, j: 71, k: 72,
  z: 48, x: 50, c: 52, v: 53, b: 55, n: 57, m: 59,
};
window.addEventListener("keydown", (e) => {
  if (e.repeat || e.target.tagName === "INPUT") return;
  if (e.key === "Escape" && !$("play").classList.contains("hidden")) { $("pauseBtn").click(); return; }
  const m = PC_KEYS[e.key.toLowerCase()];
  if (m) onNoteInput(m, "keyboard");
});

// ---------- Phần 6: kết nối đàn Yamaha P-45 (Web MIDI) ----------
function setMidiStatus(text, ok) {
  $("midiStatus").textContent = text;
  $("midiBtn").classList.toggle("on", !!ok);
  $("midiBtn").textContent = ok ? "Đã kết nối đàn" : "Kết nối đàn";
}

function onMidiMessage(e) {
  const [status, note, velocity] = e.data;
  const cmd = status & 0xf0;
  if (cmd === 0x90 && velocity > 0) onNoteInput(note, "midi"); // Note On
}

function bindInputs(access) {
  const names = [];
  access.inputs.forEach((input) => { input.onmidimessage = onMidiMessage; names.push(input.name); });
  if (names.length) setMidiStatus(`Đã nhận đàn: ${names.join(", ")}. Hãy bấm một phím trên đàn để thử.`, true);
  else setMidiStatus('Chưa thấy đàn. Kiểm tra cáp USB cắm vào cổng "USB TO HOST" và đàn đã bật.', false);
}

async function connectMidi() {
  if (!navigator.requestMIDIAccess) {
    setMidiStatus("Trình duyệt này không hỗ trợ Web MIDI. Hãy mở app bằng Chrome hoặc Edge trên máy tính.", false);
    return;
  }
  try {
    const access = await navigator.requestMIDIAccess();
    bindInputs(access);
    access.onstatechange = () => bindInputs(access);
  } catch (err) {
    setMidiStatus("Trình duyệt chưa được cấp quyền MIDI. Bấm lại và chọn Cho phép (Allow).", false);
  }
}
$("midiBtn").onclick = connectMidi;

// ---------- Phần 7: mục lục & lưu tiến độ ----------
function readStore(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) || fallback; } catch { return fallback; }
}
function writeStore(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}
const loadProgress = () => readStore("pianoProgress", {});
function saveStars(id, stars) {
  const p = loadProgress();
  p[id] = Math.max(p[id] || 0, stars);
  writeStore("pianoProgress", p);
}
const loadSettings = () => readStore("pianoSettings", {});
const saveSettings = (patch) => writeStore("pianoSettings", { ...loadSettings(), ...patch });
const saveLast = (id) => saveSettings({ lastLesson: id });

let filter = "all";
const norm = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d");

function renderHome() {
  const p = loadProgress();
  const q = norm($("search").value.trim());
  const toc = $("toc");
  toc.innerHTML = "";
  let shown = 0;
  const list = allLessons();
  const ready = list.filter((l) => !l.soon);
  const doneCount = ready.filter((l) => p[lessonId(l)]).length;
  $("tocSummary").textContent = `${list.length} bài trong mục lục · ${ready.length} bài đã soạn · anh đã hoàn thành ${doneCount}`;

  UNITS.forEach((u, ui) => {
    const matches = u.lessons.filter((l) => {
      const k = kindOf(l);
      if (filter === "todo" && (l.soon || p[lessonId(l)])) return false;
      if (["R", "L", "both", "theory"].includes(filter) && k !== filter) return false;
      return !q || norm(l.title).includes(q) || String(lessonNumber(l)) === q || String(l.page) === q || norm(u.title).includes(q);
    });
    if (!matches.length) return;
    shown += matches.length;

    const det = document.createElement("details");
    det.className = "unit";
    const unitReady = u.lessons.filter((l) => !l.soon);
    det.open = unitReady.length > 0 || !!q || filter !== "all";
    const unitDone = unitReady.filter((l) => p[lessonId(l)]).length;
    const cnt = unitReady.length ? `${unitDone}/${unitReady.length} bài` : "Sắp có";
    det.innerHTML = `<summary><span class="name">Chương ${ui + 1} · ${u.title}</span><span class="cnt">${cnt}</span></summary>`;
    matches.forEach((l) => {
      const b = document.createElement("button");
      const k = kindOf(l);
      b.className = "row" + (l.soon ? " soon" : "") + (l.error ? " err" : "");
      const s = p[lessonId(l)] || 0;
      const stars = l.soon ? "" : "★".repeat(s) + "☆".repeat(3 - s);
      const tag = l.error ? "Lỗi trong bài" : KIND_LABEL[k];
      b.innerHTML = `<span class="num">Bài ${lessonNumber(l)}<small>tr. ${l.page}</small></span><span class="t">${l.title}` +
        (l.error ? `<small class="errmsg">${l.error}</small>` : "") +
        `</span><span class="tag ${k}">${tag}</span><span class="st">${stars}</span>`;
      if (!l.soon && !l.error) b.onclick = () => openLesson(l);
      det.appendChild(b);
    });
    toc.appendChild(det);
  });
  if (!shown) toc.innerHTML = `<div class="empty">Không tìm thấy bài nào phù hợp.</div>`;

  // nút "Tiếp tục bài đang học"
  const last = list.find((l) => lessonId(l) === loadSettings().lastLesson && !l.soon && !l.error);
  const cb = $("continueBtn");
  if (last) {
    cb.innerHTML = `<small>Tiếp tục luyện tập</small>Bài ${lessonNumber(last)}: ${last.title}`;
    cb.onclick = () => openLesson(last);
    cb.classList.remove("hidden");
  } else cb.classList.add("hidden");
}

$("search").addEventListener("input", renderHome);
document.querySelectorAll("#filters .chip").forEach((btn) => {
  btn.onclick = () => {
    filter = btn.dataset.f;
    document.querySelectorAll("#filters .chip").forEach((b) => b.classList.toggle("on", b === btn));
    renderHome();
  };
});

$("namesBtn").onclick = () => {
  useSolfege = !useSolfege;
  saveSettings({ solfege: useSolfege });
  $("namesBtn").textContent = useSolfege ? "Tên nốt: Đô Rê Mi" : "Tên nốt: C D E";
};

window.addEventListener("resize", () => { if (state.lesson && !$("play").classList.contains("hidden")) drawStaff(); });

// ---------- Khởi động ----------
(function init() {
  const st = loadSettings();
  if (st.solfege === false) { useSolfege = false; $("namesBtn").textContent = "Tên nốt: C D E"; }
  metro.on = !!st.metroOn;
  // kiểm tra trước mọi bài, bài viết sai sẽ hiện "Lỗi trong bài" trong mục lục
  allLessons().forEach((l) => {
    try { prepare(l); } catch (err) { l.error = String(err.message || err); console.warn(l.title, err); }
  });
  buildKeyboard();
  updateMetroUI();
  renderHome();
  if (navigator.requestMIDIAccess && navigator.permissions) {
    navigator.permissions.query({ name: "midi" }).then((r) => { if (r.state === "granted") connectMidi(); }).catch(() => {});
  }
})();
