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
  // độ dài thật khi phát (gộp các nốt nối) cho chế độ nghe mẫu và waterfall
  Object.values(voices).forEach((v) => v.forEach((e, i) => {
    let b = e.beats;
    for (let j = i; v[j] && v[j].tie && v[j + 1] && v[j + 1].tiedFrom; j++) b += v[j + 1].beats;
    e.playBeats = b;
  }));
  lesson.prep = { voices, steps, measureOf, lines, time, firstLen, total };
  return lesson.prep;
}

// ---------- Phần 2: âm thanh & máy đếm nhịp ----------
let audio = null;
function ac() {
  audio = audio || new (window.AudioContext || window.webkitAudioContext)();
  if (audio.state === "suspended") audio.resume();
  return audio;
}

function playTone(midi, when, dur, dest) {
  const a = ac();
  const t = when || a.currentTime;
  const len = dur ? Math.min(dur + 0.25, 3) : 1.6;
  mic.toneAt[midi] = t; // để micro không tưởng tiếng của app là tiếng đàn
  const freq = 440 * Math.pow(2, (midi - 69) / 12);
  const out = a.createGain();
  out.gain.setValueAtTime(0, t);
  out.gain.linearRampToValueAtTime(0.3, t + 0.008);
  if (dur) {
    out.gain.exponentialRampToValueAtTime(0.12, t + Math.max(0.05, dur * 0.9));
    out.gain.exponentialRampToValueAtTime(0.001, t + len);
  } else out.gain.exponentialRampToValueAtTime(0.001, t + len);
  out.connect(dest || a.destination);
  [[1, 1, "triangle"], [2, 0.35, "sine"], [3, 0.12, "sine"]].forEach(([mult, g, type]) => {
    const o = a.createOscillator();
    const og = a.createGain();
    o.type = type;
    o.frequency.value = freq * mult;
    og.gain.value = g;
    o.connect(og).connect(out);
    o.start(t);
    o.stop(t + len + 0.1);
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
  mic.clickTimes.push(time);
  if (mic.clickTimes.length > 8) mic.clickTimes.shift();
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
// Gợi ý cách nghe cho từng bài: "midi" (nên cắm cáp) hoặc "mic" (micro cũng được).
// Có thể ghi thẳng trong lessons.js bằng  input: "midi"  hoặc  input: "mic".
function inputOf(l) {
  if (l.soon || (!l.rh && !l.lh)) return null;
  if (l.input) return l.input;
  const prep = l.prep;
  if (!prep) return null;
  return prep.steps.some((st) => st.midis.length > 1) ? "midi" : "mic";
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
  stopDemo(false);
  metroStop();
  wf.beat = -3;
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
  $("tipText").innerHTML = "";
  $("tipText").append(how + " ");
  const rec = inputOf(lesson);
  if (rec) {
    const b = document.createElement("span");
    b.className = "badge " + rec;
    b.textContent = rec === "midi" ? "Nên dùng cáp MIDI" : "Dùng micro cũng được";
    b.title = rec === "midi" ? "Bài có hợp âm hoặc hai tay cùng lúc: micro chỉ chấm gần đúng" : "Bài chơi từng nốt một: micro nghe tốt";
    $("tipText").append(b);
  }
  $("reviewBtn").classList.toggle("hidden", !lesson.read);
  setFeedback(mic.on && rec === "midi" ? "Bài này có hợp âm: micro chỉ chấm gần đúng, nên cắm cáp MIDI" : "", "#ffe08a");
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
  const wfOn = view === "waterfall" && state.lesson.mode !== "find";
  $("staff").classList.toggle("hidden", wfOn);
  $("wf").classList.toggle("hidden", !wfOn);
  if (wfOn) {
    // tô phím cần bấm theo màu tay
    const hands = {};
    Object.values(prep.voices).forEach((v) => v.forEach((e) => {
      if (e.step === state.idx && !e.rest && !e.tiedFrom) e.midis.forEach((m) => (hands[m] = e.hand));
    }));
    for (const [m, el] of Object.entries(keyEls)) {
      const h = el.classList.contains("target") ? hands[m] : null;
      el.classList.toggle("hand-R", h === "R");
      el.classList.toggle("hand-L", h === "L");
    }
    if (wrong) wf.flash = performance.now();
  } else {
    Object.values(keyEls).forEach((el) => el.classList.remove("hand-R", "hand-L"));
    drawStaff(wrong);
  }
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

// Mọi nguồn nhập (chuột, bàn phím máy tính, đàn MIDI, micro) đều đi qua hàm này.
function onNoteInput(midi, source) {
  if (source === "midi") mic.lastMidiAt = performance.now();
  if (source !== "midi" && source !== "mic") playTone(midi); // đàn thật đã tự phát tiếng
  if (!state.lesson || state.paused || state.done || demo.on || $("play").classList.contains("hidden")) {
    flashKey(midi, "down", 150);
    return;
  }
  const step = currentStep();
  if (!step) return;
  const find = state.lesson.mode === "find";
  // micro hay nhầm quãng tám với nốt trầm, nên chấp nhận lệch đúng một quãng tám
  const fromMic = source === "mic";
  const hit = step.midis.find((n) =>
    find ? n % 12 === midi % 12 : n === midi || (fromMic && Math.abs(n - midi) === 12));
  if (hit !== undefined) {
    flashKey(midi, "ok");
    const now = audio ? audio.currentTime : 0;
    if (!state.got.size) state.firstAt = now;
    state.got.add(hit);
    // micro chỉ nghe được một nốt: với hợp âm, đúng một nốt là qua bước (chấm gần đúng)
    const need = fromMic ? 1 : step.midis.length;
    if (state.got.size >= need) {
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
  stopDemo(false);
  metroStop();
  state.lesson = null;
  ["play", "result", "pauseMenu", "theory", "metroHelp", "micHelp"].forEach((id) => $(id).classList.add("hidden"));
  $("home").classList.remove("hidden");
  renderHome();
}

$("pauseBtn").onclick = () => { stopDemo(false); state.paused = true; metroStop(); $("pauseMenu").classList.remove("hidden"); };
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
  // lần đầu bật: tự mở hướng dẫn
  if (metro.on && !loadSettings().metroHelpSeen) openMetroHelp();
};

// Hướng dẫn dùng máy đếm nhịp (nút "?")
let helpResume = false;
function openMetroHelp() {
  const playing = state.lesson && !$("play").classList.contains("hidden") && !state.paused && !state.done;
  helpResume = playing;
  if (playing) { state.paused = true; metroStop(); }
  saveSettings({ metroHelpSeen: true });
  $("metroHelp").classList.remove("hidden");
  $("metroHelp").querySelector(".th-body").scrollTop = 0;
}
$("metroHelpBtn").onclick = openMetroHelp;
$("homeMetroHelp").onclick = openMetroHelp;
$("metroHelpClose").onclick = () => {
  $("metroHelp").classList.add("hidden");
  if (helpResume) {
    state.paused = false;
    if (metro.on && state.lesson.mode !== "find" && !state.done) beginRhythm(state.idx === 0);
  }
  helpResume = false;
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

// ---------- Phần 5b: nghe app chơi mẫu ----------
const demo = { on: false, t0: 0, bus: null, timers: [] };

function startDemo() {
  const lesson = state.lesson;
  if (!lesson || lesson.mode === "find") return;
  stopDemo(false);
  metroStop();
  const prep = prepare(lesson);
  const a = ac();
  Object.assign(state, { idx: 0, mistakes: 0, done: false, paused: false, marks: [], got: new Set(), hint: false, nextExpected: null });
  demo.on = true;
  demo.bus = a.createGain();
  demo.bus.connect(a.destination);
  let t0;
  if (metro.on) {
    // máy đếm nhịp bật: đếm vào một ô nhịp rồi mới phát, tiếng tíc chạy suốt bài
    metroStart(prep.time, (countInEnd) => { t0 = countInEnd + (prep.time - prep.firstLen) * spb(); });
  } else t0 = a.currentTime + 0.6;
  demo.t0 = t0;
  wf.beat = (a.currentTime - t0) / spb();
  const at = (time, fn) => demo.timers.push(setTimeout(fn, Math.max(0, (time - a.currentTime) * 1000)));

  Object.values(prep.voices).forEach((v) => v.forEach((e) => {
    if (e.rest || e.tiedFrom) return;
    const start = t0 + e.onset * spb();
    const dur = e.playBeats * spb();
    e.midis.forEach((m) => {
      playTone(m, start, dur * 0.95, demo.bus);
      at(start, () => keyEls[m] && keyEls[m].classList.add("sound-" + e.hand));
      at(start + dur * 0.95, () => keyEls[m] && keyEls[m].classList.remove("sound-" + e.hand));
    });
  }));
  prep.steps.forEach((st, i) => at(t0 + st.onset * spb(), () => { state.idx = i; refresh(); }));
  at(t0 + prep.total * spb() + 0.3, () => stopDemo(true));
  setFeedback("App đang chơi mẫu, anh nghe và xem nhé", "#ffffff");
  updateDemoUI();
  refresh();
}

function stopDemo(finished) {
  if (!demo.on) return;
  demo.on = false;
  demo.timers.forEach(clearTimeout);
  demo.timers = [];
  if (demo.bus) {
    const a = ac();
    demo.bus.gain.setTargetAtTime(0, a.currentTime, 0.03);
    const bus = demo.bus;
    setTimeout(() => bus.disconnect(), 300);
    demo.bus = null;
  }
  Object.values(keyEls).forEach((el) => el.classList.remove("sound-R", "sound-L"));
  metroStop();
  updateDemoUI();
  if (finished && state.lesson) {
    startLesson(state.lesson, true);
    setFeedback(metro.on ? "Đến lượt anh chơi! Nghe đếm vào rồi bắt đầu" : "Đến lượt anh chơi!", "#ffffff");
  }
}

function updateDemoUI() {
  $("demoBtn").textContent = demo.on ? "■ Dừng nghe mẫu" : "▶ Nghe app chơi mẫu";
  $("demoBtn").classList.toggle("on", demo.on);
}
$("demoBtn").onclick = () => {
  if (demo.on) { stopDemo(false); startLesson(state.lesson, true); } else startDemo();
};

// ---------- Phần 5c: giao diện Waterfall (nốt rơi) ----------
let view = "staff"; // "staff" = khuông nhạc, "waterfall" = nốt rơi
const wf = { beat: -3, flash: 0 };
const WF_COLORS = { R: [120, 214, 92], L: [124, 170, 230] }; // tay phải xanh lá, tay trái xanh dương

function setView(v) {
  view = v;
  saveSettings({ view: v });
  $("viewBtn").textContent = v === "waterfall" ? "Giao diện: Waterfall" : "Giao diện: Khuông nhạc";
  if (state.lesson) refresh();
}
$("viewBtn").onclick = () => setView(view === "waterfall" ? "staff" : "waterfall");

function wfBeat() {
  const prep = prepare(state.lesson);
  const a = audio;
  if (demo.on && a) return (a.currentTime - demo.t0) / spb();
  const step = prep.steps[state.idx];
  const target = step ? step.onset : prep.total;
  let b;
  if (metro.running && state.nextExpected != null && step && a) {
    // nốt rơi đều theo nhịp, chạm phím đúng lúc cần bấm; nếu chơi chậm thì nốt chờ ở vạch
    b = target + Math.min(0, (a.currentTime - state.nextExpected) / spb());
  } else {
    b = wf.beat + (target - wf.beat) * 0.12; // không bật nhịp: nốt trôi xuống rồi chờ anh bấm
  }
  wf.beat = b;
  return b;
}

function roundRect(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawWaterfall() {
  requestAnimationFrame(drawWaterfall);
  const cv = $("wf");
  if (!state.lesson || cv.classList.contains("hidden") || $("play").classList.contains("hidden")) return;
  const dpr = window.devicePixelRatio || 1;
  const W = cv.clientWidth, H = cv.clientHeight;
  if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) {
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
  }
  const ctx = cv.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = "#1f2422";
  ctx.fillRect(0, 0, W, H);

  // đường dọc tại phím Đô và Fa (giống ảnh mẫu)
  ctx.fillStyle = "rgba(255,255,255,0.07)";
  for (let m = KB_LOW; m <= KB_HIGH; m++) if (m % 12 === 0 || m % 12 === 5) ctx.fillRect(keyEls[m].offsetLeft, 0, 1, H);

  const prep = prepare(state.lesson);
  const now = wfBeat();
  const ppb = Math.max(40, H / 5); // số điểm ảnh cho mỗi phách
  const yOf = (beat) => H - (beat - now) * ppb;

  // vạch nhịp ngang
  for (let b = prep.firstLen, first = true; b <= prep.total + 1e-6; b += prep.time, first = false) {
    const y = yOf(b);
    if (y < 0 || y > H) continue;
    ctx.fillStyle = "rgba(255,255,255,0.10)";
    ctx.fillRect(0, y, W, 1);
  }
  const y0 = yOf(0); // vạch bắt đầu bài
  if (y0 >= 0 && y0 <= H) { ctx.fillStyle = "rgba(255,255,255,0.18)"; ctx.fillRect(0, y0, W, 1); }

  const flashing = performance.now() - wf.flash < 250;
  Object.values(prep.voices).forEach((v) => v.forEach((e) => {
    if (e.rest || e.tiedFrom) return;
    const yBottom = yOf(e.onset);
    const yTop = yOf(e.onset + e.playBeats) + 2;
    if (yTop > H || yBottom < 0) return;
    const [r, g, b] = WF_COLORS[e.hand];
    const current = !demo.on && e.step === state.idx;
    const passed = demo.on ? e.onset + e.playBeats < now : e.step < state.idx;
    e.midis.forEach((m, k) => {
      const el = keyEls[m];
      if (!el) return;
      const black = el.classList.contains("black");
      const x = el.offsetLeft + (black ? 1 : 3);
      const w = el.offsetWidth - (black ? 2 : 6);
      const top = Math.max(yTop, -4), bot = Math.min(yBottom, H);
      if (bot - top < 1) return;
      ctx.save();
      const alpha = passed ? 0.35 : 1;
      ctx.fillStyle = current && flashing ? "rgba(229,72,77,1)" : `rgba(${r},${g},${b},${alpha})`;
      if (current || (demo.on && e.onset <= now && !passed)) { ctx.shadowColor = `rgba(${r},${g},${b},0.9)`; ctx.shadowBlur = 16; }
      roundRect(ctx, x, top, w, bot - top, 4);
      ctx.fill();
      ctx.restore();
      // tên nốt và số ngón ở chân thanh
      const hgt = bot - top;
      if (hgt > 18 && w > 12) {
        ctx.fillStyle = "rgba(20,30,25,0.85)";
        ctx.font = `bold ${Math.min(12, w * 0.45)}px system-ui, sans-serif`;
        ctx.textAlign = "center";
        ctx.fillText(label(m) || "", x + w / 2, bot - 5);
        const f = e.fingers && e.fingers[k];
        if (f && hgt > 34) ctx.fillText(f, x + w / 2, bot - 19);
      }
    });
  }));
  // vạch chạm phím
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.fillRect(0, H - 2, W, 2);
}
requestAnimationFrame(drawWaterfall);

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
    if (window.top !== window) {
      setMidiStatus("Bản xem thử trong Claude không kết nối được đàn. Để chơi bằng đàn P-45, hãy mở file index.html trong bản tải về bằng Chrome.", false);
    } else {
      setMidiStatus("Trình duyệt chưa được cấp quyền MIDI. Bấm lại và chọn Cho phép (Allow).", false);
    }
  }
}
$("midiBtn").onclick = connectMidi;

// ---------- Phần 6b: nghe bằng micro ----------
// App nghe tiếng đàn qua micro, đoán cao độ (chỉ một nốt mỗi lúc) rồi gửi vào onNoteInput.
const mic = {
  on: false, stream: null, analyser: null, buf: null, timer: null,
  last: null,        // nốt vừa gửi đi
  cand: null, candCount: 0, quiet: 0,
  minRms: 1, noise: 0.004,
  toneAt: {},        // lúc app tự phát tiếng (bấm chuột) -> bỏ qua
  clickTimes: [],    // lúc máy đếm nhịp kêu -> bỏ qua
  lastMidiAt: -1e9,  // đang có đàn MIDI thì micro tạm im
};

// Dò cao độ bằng phương pháp McLeod (NSDF), đủ tốt cho tiếng đàn một nốt.
function detectPitch(buf, sr) {
  const N = buf.length;
  let rms = 0;
  for (let i = 0; i < N; i++) rms += buf[i] * buf[i];
  rms = Math.sqrt(rms / N);
  const maxLag = Math.min(Math.floor(sr / 60), N >> 1);
  const minLag = Math.floor(sr / 1200);
  const nsdf = new Float32Array(maxLag + 2);
  for (let tau = 0; tau <= maxLag + 1; tau++) {
    let acf = 0, m = 0;
    for (let i = 0, n = N - tau; i < n; i++) { const a = buf[i], b = buf[i + tau]; acf += a * b; m += a * a + b * b; }
    nsdf[tau] = m > 0 ? (2 * acf) / m : 0;
  }
  const peaks = [];
  let tau = 1;
  while (tau < maxLag && nsdf[tau] > 0) tau++; // bỏ vùng quanh độ trễ 0
  while (tau < maxLag) {
    if (nsdf[tau] > 0) {
      let best = -1, bt = tau;
      while (tau < maxLag && nsdf[tau] > 0) { if (nsdf[tau] > best) { best = nsdf[tau]; bt = tau; } tau++; }
      if (bt >= minLag) peaks.push([bt, best]);
    } else tau++;
  }
  if (!peaks.length) return { freq: 0, clarity: 0, rms };
  const top = Math.max(...peaks.map((p) => p[1]));
  const [t, clarity] = peaks.find((p) => p[1] >= 0.9 * top);
  const a = nsdf[t - 1], b = nsdf[t], c = nsdf[t + 1];
  const d = a - 2 * b + c;
  const shift = d ? (0.5 * (a - c)) / d : 0;
  return { freq: sr / (t + shift), clarity, rms };
}

function micTick() {
  const a = audio;
  mic.analyser.getFloatTimeDomainData(mic.buf);
  const { freq, clarity, rms } = detectPitch(mic.buf, a.sampleRate);
  const now = a.currentTime;
  const gate = Math.max(0.006, mic.noise * 3.5);
  if (rms < gate) {
    mic.noise = mic.noise * 0.98 + rms * 0.02; // học dần độ ồn của phòng
    if (++mic.quiet >= 3) { mic.last = null; showHeard(null); }
    mic.cand = null;
    mic.minRms = Math.min(mic.minRms, rms);
    return;
  }
  mic.quiet = 0;
  mic.minRms = Math.min(mic.minRms, rms);
  if (mic.clickTimes.some((ct) => now >= ct - 0.01 && now - ct < 0.09)) return;   // tiếng máy đếm nhịp
  if (performance.now() - mic.lastMidiAt < 2000) return;                             // đang dùng cáp MIDI
  if (!freq || clarity < 0.85) { mic.cand = null; return; }
  const midi = Math.round(69 + 12 * Math.log2(freq / 440));
  if (midi < 33 || midi > 96) return;
  if (midi === mic.cand) mic.candCount++; else { mic.cand = midi; mic.candCount = 1; }
  if (mic.candCount < 2) return; // phải nghe giống nhau 2 lần liền mới tin
  const reattack = rms > mic.minRms * 2.2 && rms > gate * 2;
  if (mic.last !== null && !reattack) {
    if (midi === mic.last) return;                       // vẫn là nốt đang ngân
    if (Math.abs(midi - mic.last) % 12 === 0) return;    // nhảy quãng tám khi nốt tắt dần
  }
  if (mic.toneAt[midi] !== undefined && now - mic.toneAt[midi] < 1.2) { mic.last = midi; return; } // tiếng của app
  mic.last = midi;
  mic.minRms = rms;
  showHeard(midi);
  onNoteInput(midi, "mic");
}

function showHeard(midi) {
  const el = $("micHear");
  el.textContent = !mic.on ? "" : midi == null ? "Micro đang nghe…" : `Micro nghe: ${label(midi) || "phím đen"}`;
}

function setMicUI(text) {
  ["micBtn", "homeMicBtn"].forEach((id) => {
    $(id).textContent = `Micro: ${mic.on ? "Bật" : "Tắt"}`;
    $(id).classList.toggle("on", mic.on);
  });
  if (text !== undefined) $("micStatus").textContent = text;
  $("micStatus").classList.toggle("hidden", !$("micStatus").textContent);
  showHeard(null);
}

async function startMic() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    setMicUI("Trình duyệt này không cho dùng micro. Hãy mở app bằng Chrome, Edge hoặc Safari mới.");
    return;
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
    });
    const a = ac();
    const src = a.createMediaStreamSource(stream);
    const an = a.createAnalyser();
    an.fftSize = 2048;
    src.connect(an);
    Object.assign(mic, { on: true, stream, analyser: an, buf: new Float32Array(an.fftSize), last: null, cand: null });
    mic.timer = setInterval(micTick, 30);
    setMicUI("Micro đang bật. Đặt máy cách loa đàn khoảng 0,5–1 m, phòng càng yên tĩnh càng tốt. Không cắm tai nghe vào đàn.");
  } catch (err) {
    const inFrame = window.top !== window;
    setMicUI(inFrame
      ? "Bản xem thử trong Claude không được dùng micro. Hãy mở bản tải về bằng Chrome."
      : "Chưa được cấp quyền micro. Bấm lại và chọn Cho phép (Allow), hoặc bật quyền micro cho trình duyệt trong Cài đặt.");
  }
}

function stopMic() {
  clearInterval(mic.timer);
  if (mic.stream) mic.stream.getTracks().forEach((t) => t.stop());
  Object.assign(mic, { on: false, stream: null, analyser: null });
  setMicUI("");
}

const toggleMic = () => (mic.on ? stopMic() : startMic());
$("micBtn").onclick = toggleMic;
$("homeMicBtn").onclick = toggleMic;

// Hướng dẫn "Micro hay cáp MIDI?"
let micHelpResume = false;
function openMicHelp() {
  const playing = state.lesson && !$("play").classList.contains("hidden") && !state.paused && !state.done;
  micHelpResume = playing;
  if (playing) { state.paused = true; metroStop(); }
  $("micHelp").classList.remove("hidden");
  $("micHelp").querySelector(".th-body").scrollTop = 0;
}
$("micHelpBtn").onclick = openMicHelp;
$("homeMicHelp").onclick = openMicHelp;
$("micHelpClose").onclick = () => {
  $("micHelp").classList.add("hidden");
  if (micHelpResume) {
    state.paused = false;
    if (metro.on && state.lesson.mode !== "find" && !state.done) beginRhythm(state.idx === 0);
  }
  micHelpResume = false;
};

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
        `</span><span class="tag ${k}">${tag}</span>` +
        (inputOf(l) === "midi" ? `<span class="inp" title="Bài có hợp âm hoặc hai tay cùng lúc">nên dùng MIDI</span>` : `<span class="inp none"></span>`) +
        `<span class="st">${stars}</span>`;
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
  if (st.view === "waterfall") view = "waterfall";
  $("viewBtn").textContent = view === "waterfall" ? "Giao diện: Waterfall" : "Giao diện: Khuông nhạc";
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
