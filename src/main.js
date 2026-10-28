import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { works } from './works.js';

gsap.registerPlugin(ScrollTrigger);

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = window.matchMedia('(pointer: fine)').matches;

/* ---------- Карточки работ ---------- */
const escape = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const workCards = works.map((w) => `
  <li class="w">
    <a href="${escape(w.url)}" target="_blank" rel="noopener">
      <span class="w__img"><img src="${escape(w.image)}" width="1200" height="750" loading="lazy" alt="${escape(w.alt)}" /></span>
      <span class="w__meta">
        <b class="w__title">${escape(w.title)}</b>
        <span class="w__kind">${escape(w.kind)}, ${w.year}</span>
        <span class="w__go">Открыть сайт</span>
      </span>
    </a>
  </li>`);
// при нечётном числе работ пустая клетка становится приглашением
if (works.length % 2 === 1) {
  workCards.push(`
  <li class="w w--cta">
    <a href="https://t.me/sapqqe" target="_blank" rel="noopener">
      <span class="w__img">Тут может быть ваш сайт</span>
      <span class="w__meta">
        <b class="w__title">Ваш проект</b>
        <span class="w__kind">Обсудим в Telegram</span>
        <span class="w__go">Написать</span>
      </span>
    </a>
  </li>`);
}
document.querySelector('.works').innerHTML = workCards.join('');
document.querySelector('.work__count').textContent = works.length;

// Плавная прокрутка, синхронно с ScrollTrigger
let lenis = null;
if (!reduceMotion) {
  lenis = new Lenis({ lerp: 0.11 });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const target = document.querySelector(a.getAttribute('href'));
      if (!target) return;
      e.preventDefault();
      lenis.scrollTo(target, { offset: a.getAttribute('href') === '#top' ? 0 : -8 });
    });
  });
}

/* ---------- Панель после первого экрана ---------- */
const dock = document.querySelector('.dock');
ScrollTrigger.create({
  trigger: '.hero',
  start: 'bottom 80px',
  endTrigger: 'html',
  end: 'max',
  onToggle: ({ isActive }) => {
    dock.classList.toggle('is-on', isActive);
    dock.setAttribute('aria-hidden', String(!isActive));
    dock.querySelectorAll('a').forEach((a) => (a.tabIndex = isActive ? 0 : -1));
  },
  onUpdate: ({ direction }) => dock.classList.toggle('is-away', direction === 1),
});

/* ---------- Почта: тема письма по выбранной кнопке ---------- */
const mail = document.querySelector('.mail');
document.querySelectorAll('.chip').forEach((chip, _, all) => {
  chip.addEventListener('click', () => {
    all.forEach((c) => {
      c.classList.toggle('is-on', c === chip);
      c.setAttribute('aria-checked', String(c === chip));
    });
    mail.href = `mailto:s3368406@gmail.com?subject=${encodeURIComponent(chip.dataset.subject)}`;
  });
});

/* ---------- Буквы @sapqqe подпрыгивают под курсором ---------- */
const tg = document.querySelector('.contact__tg span');
tg.innerHTML = [...tg.textContent].map((c) => `<span class="ch">${c}</span>`).join('');

// @sapqqe ровно во всю ширину листа
const tgLink = tg.parentElement;
const fitTg = () => {
  tgLink.style.fontSize = '100px';
  const room = tgLink.parentElement.clientWidth - parseFloat(getComputedStyle(tgLink.parentElement).paddingLeft) * 2;
  tgLink.style.fontSize = `${(100 * room) / tg.getBoundingClientRect().width}px`;
};
fitTg();
document.fonts.ready.then(fitTg);
window.addEventListener('resize', fitTg);
if (finePointer && !reduceMotion) {
  tg.querySelectorAll('.ch').forEach((ch) => {
    ch.addEventListener('pointerenter', () => {
      ch.style.transform = `translateY(-0.12em) rotate(${gsap.utils.random(-9, 9)}deg)`;
    });
    ch.addEventListener('pointerleave', () => (ch.style.transform = ''));
  });
}

/* ---------- Лента в телефоне: листается и останавливается на ярком ---------- */
const feed = document.querySelector('.feed');
const stopLabel = document.querySelector('.phone__stop');
const PER = 7; // серых карточек на одну яркую
const greyItem = '<div class="feed__item"><span class="b t1"></span><span class="b t2"></span><span class="cards"><span></span><span></span><span></span></span><span class="btn-ph"></span></div>';
const hotItem = '<div class="feed__item feed__item--hot"><b>Ваш<br>лендинг</b><small>дочитали до кнопки <i></i></small></div>';
feed.innerHTML = Array.from({ length: 4 }, () => greyItem.repeat(PER - 1) + hotItem).join('');
const feedItems = [...feed.children];
const feedTarget = (i) => feedItems[i].offsetTop - 60; // яркая карточка у верха экрана телефона
const feedCycle = () => feedItems[PER].offsetTop - feedItems[0].offsetTop;
let feedY = 0;
const setFeed = () => (feed.style.transform = `translateY(${-feedY}px)`);

// лента крутится, только пока первый экран виден
let heroVisible = true;
new IntersectionObserver(([e]) => (heroVisible = e.isIntersecting)).observe(document.querySelector('.hero'));
const whenVisible = (fn) => (heroVisible ? fn() : setTimeout(() => whenVisible(fn), 400));

function feedRun() {
  feed.classList.add('feed--fast');
  stopLabel.classList.remove('is-on');
  const startY = feedY;
  let t0 = null;
  requestAnimationFrame(function run(t) {
    t0 ??= t;
    const dt = Math.min(t - t0, 1400);
    feedY = startY + 1.5 * dt;
    setFeed();
    if (dt < 1400) return requestAnimationFrame(run);
    feedBrake();
  });
}
function feedBrake() {
  let i = PER - 1;
  while (feedTarget(i) < feedY + 260) i += PER;
  const from = feedY, to = feedTarget(i);
  let t0 = null;
  feed.classList.remove('feed--fast');
  requestAnimationFrame(function brake(t) {
    t0 ??= t;
    const p = Math.min((t - t0) / 900, 1);
    feedY = from + (to - from) * (1 - Math.pow(1 - p, 3) + Math.sin(p * Math.PI) * 0.04);
    setFeed();
    if (p < 1) return requestAnimationFrame(brake);
    stopLabel.classList.add('is-on');
    setTimeout(() => {
      while (feedY > feedCycle() * 1.5) feedY -= feedCycle(); // незаметный перескок на цикл назад
      setFeed();
      whenVisible(feedRun);
    }, 2400);
  });
}

/* ---------- Наклейки в финале: хватать и бросать ---------- */
const board = document.querySelector('.contact');
const zone = document.querySelector('.stickers');
const stickers = [...document.querySelectorAll('.st')].map((el) => ({ el, x: 0, y: 0, vx: 0, vy: 0, r: +el.dataset.r, vr: 0, drag: false }));
const drawSticker = (s) => (s.el.style.transform = `translate(${s.x}px, ${s.y}px) rotate(${s.r}deg)`);
function placeStickers() {
  const narrow = window.innerWidth <= 900;
  stickers.forEach((s) => {
    const fx = +(narrow ? s.el.dataset.mx : s.el.dataset.x);
    const fy = +(narrow ? s.el.dataset.my : s.el.dataset.y);
    s.x = Math.min(zone.offsetLeft + fx * zone.clientWidth, board.clientWidth - s.el.offsetWidth - 8);
    s.y = Math.min(zone.offsetTop + fy * zone.clientHeight, board.clientHeight - s.el.offsetHeight - 8);
    s.vx = s.vy = s.vr = 0;
    drawSticker(s);
    s.el.classList.add('is-placed');
  });
}
document.fonts.ready.then(placeStickers);
window.addEventListener('resize', placeStickers);

let stickerZ = 10;
let physicsOn = false;
function physics() {
  const W = board.clientWidth, H = board.clientHeight;
  let moving = false;
  stickers.forEach((s) => {
    if (s.drag) { moving = true; return; }
    if (Math.abs(s.vx) < 0.05 && Math.abs(s.vy) < 0.05 && Math.abs(s.vr) < 0.05) return;
    moving = true;
    s.x += s.vx; s.y += s.vy; s.r += s.vr;
    s.vx *= 0.94; s.vy *= 0.94; s.vr *= 0.9;
    const w = s.el.offsetWidth, h = s.el.offsetHeight;
    if (s.x < 0) { s.x = 0; s.vx *= -0.6; }
    if (s.x > W - w) { s.x = W - w; s.vx *= -0.6; }
    if (s.y < 0) { s.y = 0; s.vy *= -0.6; }
    if (s.y > H - h) { s.y = H - h; s.vy *= -0.6; }
    drawSticker(s);
  });
  physicsOn = moving;
  if (moving) requestAnimationFrame(physics);
}
const wakePhysics = () => { if (!physicsOn) { physicsOn = true; requestAnimationFrame(physics); } };

stickers.forEach((s) => {
  let lx, ly, lt;
  s.el.addEventListener('pointerdown', (e) => {
    s.drag = true;
    s.el.setPointerCapture(e.pointerId);
    s.el.style.zIndex = ++stickerZ;
    lx = e.clientX; ly = e.clientY; lt = performance.now();
    s.vx = s.vy = 0;
    s.el.animate([{ scale: 1 }, { scale: 1.08 }], { duration: 120, fill: 'forwards' });
    wakePhysics();
  });
  s.el.addEventListener('pointermove', (e) => {
    if (!s.drag) return;
    const now = performance.now(), dt = Math.max(now - lt, 1);
    const dx = e.clientX - lx, dy = e.clientY - ly;
    s.x += dx; s.y += dy; s.r += dx * 0.06;
    s.vx = (dx / dt) * 16; s.vy = (dy / dt) * 16;
    lx = e.clientX; ly = e.clientY; lt = now;
    drawSticker(s);
  });
  const release = () => {
    if (!s.drag) return;
    s.drag = false;
    s.vr = s.vx * 0.15;
    s.el.animate([{ scale: 1.08 }, { scale: 1 }], { duration: 200, fill: 'forwards', easing: 'cubic-bezier(.3,1.8,.5,1)' });
    wakePhysics();
  };
  s.el.addEventListener('pointerup', release);
  s.el.addEventListener('pointercancel', release);
});

if (reduceMotion) {
  // без движения лента сразу стоит на яркой карточке
  feedY = feedTarget(PER - 1);
  setFeed();
  stopLabel.classList.add('is-on');
} else {
  /* ---------- Первый экран: строки въезжают, телефон поднимается снизу ---------- */
  const intro = gsap.timeline({ defaults: { ease: 'expo.out', duration: 1.3 }, onComplete: () => whenVisible(feedRun) });
  document.querySelectorAll('.hero__title .line > span').forEach((span, i) => {
    intro.from(span, { xPercent: span.parentElement.classList.contains('line--r') ? 110 : -110 }, i * 0.09);
  });
  intro
    .from('.phone-wrap', { y: 320, rotation: 8, duration: 1.1 }, 0.4)
    .from(['.hero__bar', '.hero__about'], { opacity: 0, duration: 0.8, ease: 'power2.out' }, 0.6);

  // после загрузки шрифта и картинок пересчитать размеры
  document.fonts.ready.then(() => ScrollTrigger.refresh());
  window.addEventListener('load', () => ScrollTrigger.refresh());
}
