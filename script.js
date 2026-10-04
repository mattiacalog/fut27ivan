(() => {
  "use strict";

  // ====== CAMBIA QUI ======
  const CONFIG = {
    code: "RJFG-XHNF-XMEQ", // il codice che compare alla fine
    points: 5000,            // i FC Points mostrati nel contatore
  };
  // ========================

  const $ = (s) => document.querySelector(s);
  const intro = $("#intro");
  const video = $("#video");
  const playBtn = $("#play");
  const soundBtn = $("#sound");
  const stage = $("#reveal");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  let revealed = false;

  /* ---------- 1. Video ---------- */

  // Prova con l'audio; se il browser lo blocca, parte muto con "tocca per l'audio";
  // se blocca anche quello (es. iPhone in risparmio energetico), mostra il tasto play.
  async function startVideo() {
    if (video.error) return reveal(); // fallito prima che lo script partisse
    video.muted = false;
    try { await video.play(); return; } catch (e) { if (broken(e)) return reveal(); }
    video.muted = true;
    try {
      await video.play();
      soundBtn.hidden = false;
    } catch (e) {
      if (broken(e)) return reveal();
      playBtn.hidden = false;
    }
  }

  // Il video non c'è o non si legge: niente tasto play, si va al reveal.
  const broken = (e) => revealed || video.error || e?.name === "NotSupportedError";

  function unmute() {
    video.muted = false;
    soundBtn.hidden = true;
    primeMusic();
  }

  playBtn.addEventListener("click", () => {
    playBtn.hidden = true;
    video.muted = false;
    video.play().catch(reveal);
    primeMusic();
  });
  soundBtn.addEventListener("click", unmute);
  video.addEventListener("click", unmute);
  video.addEventListener("ended", reveal);
  video.addEventListener("error", reveal); // video mancante o rotto: si va dritti al reveal

  /* ---------- Musica ---------- */

  const music = $("#music");
  const musicBtn = $("#music-btn");
  let primed = false;

  // I telefoni fanno partire l'audio solo dopo un tocco: un tocco durante il video
  // fa partire e fermare subito la canzone (muta), così al reveal può suonare da sola.
  function primeMusic() {
    if (primed || revealed) return;
    primed = true;
    music.muted = true;
    music.play().then(() => {
      if (revealed) return;
      music.pause();
      music.currentTime = 0;
    }).catch(() => { primed = false; }).finally(() => { music.muted = false; });
  }

  function playMusic() {
    music.muted = false;
    music.volume = 1;
    return music.play().then(() => { musicBtn.hidden = true; });
  }

  function startMusic() {
    playMusic().catch(() => {
      musicBtn.hidden = false;
      stage.addEventListener("pointerdown", () => playMusic().catch(() => {}), { once: true });
    });
  }

  musicBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    playMusic().catch(() => {});
  });

  startVideo();

  /* ---------- 2. Reveal ---------- */

  async function reveal() {
    if (revealed) return;
    revealed = true;
    playBtn.hidden = soundBtn.hidden = true;
    startMusic(); // subito, prima di ogni attesa
    await Promise.race([document.fonts.ready, wait(500)]);

    intro.classList.add("out");
    stage.classList.add("on");
    stage.removeAttribute("aria-hidden");
    setTimeout(() => { video.pause(); intro.remove(); }, 800);

    fx.start();
    setTimeout(burst, 700);
    setTimeout(countUp, 950);
    setTimeout(revealCode, 2350);
  }

  function burst() {
    const r = $(".coin").getBoundingClientRect();
    fx.burst(r.left + r.width / 2, r.top + r.height / 2, reduced ? 18 : 85);
    navigator.vibrate?.([40, 30, 70]);
    if (reduced) return;
    fx.rain(26);
    setTimeout(() => fx.rain(2.5), 3800);
  }

  function countUp() {
    const el = $("#count");
    const fmt = new Intl.NumberFormat("de-DE"); // 5.000 con il punto
    const dur = 1400;
    const t0 = performance.now();
    const step = (t) => {
      const p = Math.min((t - t0) / dur, 1);
      const eased = p === 1 ? 1 : 1 - Math.pow(2, -10 * p);
      el.textContent = fmt.format(Math.round(CONFIG.points * eased));
      if (p < 1) return requestAnimationFrame(step);
      $(".amount").classList.add("done");
      const r = el.getBoundingClientRect();
      fx.sparkle(r.left + r.width / 2, r.top + r.height / 2, 40);
    };
    requestAnimationFrame(step);
  }

  function revealCode() {
    const box = $("#code");
    const chars = [...CONFIG.code];
    const pool = "ABCDEFGHJKLMNPQRSTUVWXYZ0123456789";
    const random = () => pool[(Math.random() * pool.length) | 0];
    const fixed = (ch) => /[\s-]/.test(ch);

    box.setAttribute("aria-label", CONFIG.code);
    const spans = chars.map((ch) => {
      const s = document.createElement("span");
      s.textContent = fixed(ch) ? ch : random();
      if (fixed(ch)) s.className = "sep";
      box.append(s);
      return s;
    });

    const t0 = performance.now();
    let lastSwap = 0;
    const step = (t) => {
      const swap = t - lastSwap > 45;
      if (swap) lastSwap = t;
      let done = true;
      spans.forEach((s, i) => {
        if (s.classList.contains("ok") || fixed(chars[i])) return;
        if (t - t0 < 300 + i * 70) {
          done = false;
          if (swap) s.textContent = random();
          return;
        }
        s.textContent = chars[i];
        s.classList.add("ok");
      });
      if (!done) return requestAnimationFrame(step);
      stage.classList.add("code-ready");
      const r = box.getBoundingClientRect();
      fx.sparkle(r.left + r.width / 2, r.top + r.height / 2, 30);
    };
    requestAnimationFrame(step);
  }

  /* ---------- Copia ---------- */

  const copyBtn = $("#copy");
  let copyTimer;

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(CONFIG.code);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = CONFIG.code;
      ta.setAttribute("readonly", "");
      ta.style.cssText = "position:fixed;top:0;opacity:0";
      document.body.append(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    navigator.vibrate?.(30);
    copyBtn.textContent = "Copiato ✓";
    copyBtn.classList.add("ok");
    clearTimeout(copyTimer);
    copyTimer = setTimeout(() => {
      copyBtn.textContent = "Copia codice";
      copyBtn.classList.remove("ok");
    }, 2200);
  }

  copyBtn.addEventListener("click", copyCode);
  $("#code").addEventListener("click", copyCode);
  $("#code").addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); copyCode(); }
  });

  /* ---------- Monete e scintille (canvas) ---------- */

  const fx = (() => {
    const cv = $("#fx");
    const ctx = cv.getContext("2d");
    const coins = [];
    const sparks = [];
    let w = 0, h = 0, last = 0, running = false;
    let rainRate = 0, rainAcc = 0;
    let face, edge;

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = innerWidth; h = innerHeight;
      cv.width = w * dpr; cv.height = h * dpr;
      cv.style.width = w + "px"; cv.style.height = h + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function disk(g, r, rad, fill) {
      g.beginPath();
      g.arc(r, r, rad, 0, Math.PI * 2);
      g.fillStyle = fill;
      g.fill();
    }

    function linear(g, x0, y0, x1, y1, stops) {
      const gr = g.createLinearGradient(x0, y0, x1, y1);
      stops.forEach(([o, c]) => gr.addColorStop(o, c));
      return gr;
    }

    function makeFace(S) {
      const c = document.createElement("canvas");
      c.width = c.height = S;
      const g = c.getContext("2d");
      const r = S / 2;
      disk(g, r, r * 0.98, linear(g, 0, 0, S, S,
        [[0, "#c8ffe4"], [0.35, "#2cf59e"], [0.7, "#00a85c"], [1, "#003d22"]]));
      disk(g, r, r * 0.8, linear(g, S, S, 0, 0,
        [[0, "#00f08a"], [0.5, "#00c46e"], [1, "#00813f"]]));
      g.lineWidth = S * 0.025;
      g.strokeStyle = "#004d2a";
      g.stroke();
      g.font = `italic 900 ${S * 0.42}px "Barlow Condensed", Impact, sans-serif`;
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.fillStyle = "#003a1f";
      g.fillText("FC", r + S * 0.015, r + S * 0.035);
      g.fillStyle = "#eafff4";
      g.fillText("FC", r, r + S * 0.015);
      const sh = g.createRadialGradient(S * 0.3, S * 0.22, 0, S * 0.3, S * 0.22, S * 0.65);
      sh.addColorStop(0, "rgba(255,255,255,.55)");
      sh.addColorStop(1, "rgba(255,255,255,0)");
      disk(g, r, r * 0.98, sh);
      return c;
    }

    function makeEdge(S) {
      const c = document.createElement("canvas");
      c.width = c.height = S;
      const g = c.getContext("2d");
      disk(g, S / 2, S / 2 * 0.98, "#007a42");
      return c;
    }

    function coin(o) {
      coins.push(Object.assign({
        a: Math.random() * Math.PI * 2,
        va: (5 + Math.random() * 7) * (Math.random() < 0.5 ? -1 : 1),
        rot: (Math.random() - 0.5) * 0.6,
        g: 1500,
      }, o));
    }

    function spark(x, y, vx, vy, life = 1) {
      sparks.push({ x, y, vx, vy, life, max: life, s: 1 + Math.random() * 2.4 });
    }

    function drawCoin(c) {
      const r = c.s / 2;
      const k = Math.cos(c.a);
      const sx = Math.max(Math.abs(k), 0.05);
      const th = Math.sin(c.a) * c.s * 0.07;
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.rotate(c.rot);
      for (let j = -1; j <= 1; j += 0.5) {
        ctx.drawImage(edge, j * th - sx * r, -r, 2 * sx * r, 2 * r);
      }
      ctx.translate(k >= 0 ? th : -th, 0);
      ctx.scale(sx, 1); // stessa faccia su entrambi i lati, mai a specchio
      ctx.drawImage(face, -r, -r, 2 * r, 2 * r);
      ctx.restore();
    }

    function tick(t) {
      const dt = Math.min((t - last) / 1000, 0.05);
      last = t;

      rainAcc += rainRate * dt;
      while (rainAcc >= 1) {
        rainAcc -= 1;
        coin({
          x: Math.random() * w, y: -40,
          vx: (Math.random() - 0.5) * 60, vy: 90 + Math.random() * 170,
          s: 14 + Math.random() * 22, g: 140,
        });
      }
      if (!reduced && Math.random() < 0.25) {
        spark(Math.random() * w, h * (0.3 + Math.random() * 0.7), 0, -20 - Math.random() * 40, 2);
      }

      ctx.clearRect(0, 0, w, h);

      for (let i = coins.length - 1; i >= 0; i--) {
        const c = coins[i];
        c.vy += c.g * dt;
        c.x += c.vx * dt;
        c.y += c.vy * dt;
        c.a += c.va * dt;
        if (c.y > h + 60) { coins.splice(i, 1); continue; }
        drawCoin(c);
      }

      ctx.globalCompositeOperation = "lighter";
      for (let i = sparks.length - 1; i >= 0; i--) {
        const p = sparks[i];
        p.life -= dt;
        if (p.life <= 0) { sparks.splice(i, 1); continue; }
        p.vx *= 0.97; p.vy *= 0.97;
        p.x += p.vx * dt; p.y += p.vy * dt;
        const a = p.life / p.max;
        ctx.fillStyle = `rgba(140,255,200,${a})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.s * (0.5 + a), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalCompositeOperation = "source-over";

      requestAnimationFrame(tick);
    }

    return {
      start() {
        if (running) return;
        running = true;
        face = makeFace(128);
        edge = makeEdge(128);
        resize();
        addEventListener("resize", resize);
        last = performance.now();
        requestAnimationFrame(tick);
      },
      burst(x, y, n) {
        for (let i = 0; i < n; i++) {
          const ang = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.7;
          const sp = 380 + Math.random() * 800;
          coin({ x, y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, s: 20 + Math.random() * 28 });
        }
        this.sparkle(x, y, n * 1.5);
      },
      sparkle(x, y, n) {
        for (let i = 0; i < n; i++) {
          const ang = Math.random() * Math.PI * 2;
          const sp = 80 + Math.random() * 420;
          spark(x, y, Math.cos(ang) * sp, Math.sin(ang) * sp, 0.6 + Math.random() * 0.8);
        }
      },
      rain(rate) { rainRate = rate; },
    };
  })();
})();
