export function initPhotoGallery() {
  const track = document.querySelector('#gallery-track');
  const toggle = document.querySelector('#photo-gallery-toggle');
  if (!track || !toggle) return;
  for (const original of Array.from(track.children)) {
    const clone = original.cloneNode(true);
    clone.setAttribute('aria-hidden', 'true');
    clone.setAttribute('inert', '');
    clone.querySelector('img').alt = '';
    track.append(clone);
  }
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let paused = false;
  const update = () => {
    const stopped = paused || reducedMotion.matches || document.hidden;
    track.classList.toggle('is-paused', stopped);
    toggle.disabled = reducedMotion.matches;
    toggle.setAttribute('aria-pressed', String(stopped));
    toggle.textContent = reducedMotion.matches
      ? 'Анимация отключена в настройках устройства'
      : stopped
        ? 'Продолжить анимацию'
        : 'Приостановить анимацию';
  };
  toggle.hidden = false;
  toggle.addEventListener('click', () => {
    paused = !paused;
    update();
  });
  document.addEventListener('visibilitychange', update);
  reducedMotion.addEventListener('change', update);
  track.classList.add('is-enhanced');
  update();
}
