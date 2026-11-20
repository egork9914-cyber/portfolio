const slideDuration = 4100;
const section = document.querySelector("#show");
const heading = document.querySelector("#show-heading");
const frameNodes = [...document.querySelectorAll("[data-frame]")];
const frames = frameNodes.map(link => ({
  id: link.dataset.frame,
  file: "assets/photos/" + link.dataset.frame + ".webp",
  name: link.querySelector(".contact-name").textContent,
  alt: link.querySelector("img").alt,
  preview: link.querySelector("img").getAttribute("src"),
  date: link.dataset.city,
  description: link.dataset.description,
  source: link.dataset.source,
  credit: link.dataset.credit
}));

const picture = document.querySelector("#show-image");
const unavailable = document.querySelector("#projection-fallback");
const date = document.querySelector("#show-date");
const name = document.querySelector("#show-name");
const description = document.querySelector("#show-description");
const source = document.querySelector("#show-source");
const counter = document.querySelector("#show-counter");
const film = document.querySelector("#film-index");
const back = document.querySelector("#show-back");
const next = document.querySelector("#show-next");
const toggle = document.querySelector("#show-toggle");
const toggleLabel = document.querySelector("#toggle-label");
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
const prefetched = new Set();
const filmButtons = frames.map((frame, index) => {
  const button = document.createElement("button");
  button.className = "film-frame";
  button.type = "button";
  button.setAttribute("aria-label", frame.name);

  const thumbnail = document.createElement("img");
  thumbnail.alt = "";
  thumbnail.loading = "lazy";
  thumbnail.decoding = "async";
  thumbnail.src = frame.preview;
  button.append(thumbnail);
  button.addEventListener("click", () => chooseFrame(index));
  film.append(button);

  return button;
});

let frameIndex = 0;
let playing = false;
let elapsed = 0;
let previousTime = null;
let animationFrame = 0;

function positionLabel() {
  return "Кадр " + (frameIndex + 1) + " из " + frames.length;
}

function drawProgress() {
  film.style.setProperty("--frame-progress", Math.min(1, elapsed / slideDuration));
}

function drawControls() {
  const first = frameIndex === 0;
  const last = frameIndex === frames.length - 1;

  counter.setAttribute("aria-live", playing ? "off" : "polite");
  counter.textContent = positionLabel();
  back.disabled = first;
  next.disabled = last;
  toggle.classList.toggle("is-playing", playing);
  toggleLabel.textContent = playing ? "Пауза" : last ? "Сначала" : elapsed > 0 ? "Продолжить" : "Автопоказ";
  film.classList.toggle("is-playing", playing);
  drawProgress();
}

function prefetch(index) {
  const frame = frames[index];
  if (!frame || prefetched.has(frame.id)) return;

  prefetched.add(frame.id);
  const image = new Image();
  image.src = frame.file;
}

function showFrame(index, animate = true) {
  frameIndex = Math.max(0, Math.min(index, frames.length - 1));
  elapsed = 0;
  const frame = frames[frameIndex];

  if (picture.getAttribute("src") !== frame.file) {
    unavailable.hidden = true;
    picture.hidden = false;
    picture.src = frame.file;
  }
  picture.alt = frame.alt;
  date.textContent = frame.date;
  name.textContent = frame.name;
  description.textContent = frame.description;
  source.textContent = frame.credit;
  source.href = frame.source;
  frameNodes.forEach((link, itemIndex) => {
    const selected = itemIndex === frameIndex;
    [link, filmButtons[itemIndex]].forEach(control => {
      if (selected) control.setAttribute("aria-current", "true");
      else control.removeAttribute("aria-current");
    });
  });

  if (animate && !reducedMotion.matches) {
    picture.getAnimations().forEach(animation => animation.cancel());
    picture.animate([
      { opacity: .53, transform: "translateY(6px)" },
      { opacity: 1, transform: "translateY(0)" }
    ], { duration: 460, easing: "cubic-bezier(.2,.75,.25,1)" });
  }
  const bounds = film.getBoundingClientRect();
  const selected = filmButtons[frameIndex].getBoundingClientRect();
  if (selected.right > bounds.right - 3) film.scrollLeft += selected.right - bounds.right + 3;
  else if (selected.left < bounds.left + 3) film.scrollLeft -= bounds.left - selected.left + 3;

  prefetch(frameIndex + 1);
  prefetch(frameIndex - 1);
  drawControls();
}

function stopPlayback() {
  playing = false;
  previousTime = null;
  cancelAnimationFrame(animationFrame);
  drawControls();
}

function tick(now) {
  if (!playing) return;

  if (previousTime !== null) elapsed += Math.min(now - previousTime, 110);
  previousTime = now;

  if (elapsed >= slideDuration) {
    if (frameIndex === frames.length - 1) {
      elapsed = slideDuration;
      stopPlayback();
      return;
    }
    showFrame(frameIndex + 1);
  } else {
    drawProgress();
  }
  animationFrame = requestAnimationFrame(tick);
}

function startPlayback() {
  if (playing) return;

  playing = true;
  previousTime = null;
  if (frameIndex === frames.length - 1) showFrame(0);
  else drawControls();
  animationFrame = requestAnimationFrame(tick);
}

function chooseFrame(index) {
  stopPlayback();
  showFrame(index);
}

function focusShow() {
  requestAnimationFrame(() => heading.focus({ preventScroll: true }));
}

picture.addEventListener("error", () => {
  picture.hidden = true;
  unavailable.hidden = false;
});

back.addEventListener("click", () => chooseFrame(frameIndex - 1));
next.addEventListener("click", () => chooseFrame(frameIndex + 1));
toggle.addEventListener("click", () => {
  if (playing) stopPlayback();
  else startPlayback();
});

frameNodes.forEach((link, index) => {
  link.addEventListener("click", () => {
    chooseFrame(index);
    focusShow();
  });
});

section.addEventListener("keydown", event => {
  if (event.altKey || event.ctrlKey || event.metaKey) return;
  const destination = {
    ArrowLeft: frameIndex - 1,
    ArrowRight: frameIndex + 1,
    Home: 0,
    End: frames.length - 1
  }[event.key];
  if (destination === undefined) return;

  event.preventDefault();
  chooseFrame(destination);
});

document.addEventListener("visibilitychange", () => {
  if (document.hidden && playing) stopPlayback();
});

showFrame(0, false);
document.querySelector("#show-controls").hidden = false;
