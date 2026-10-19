export function initVideoGallery() {
  const section = document.querySelector('#highlights');
  const slider = document.querySelector('#video-slider');
  const toggle = document.querySelector('#gallery-toggle');
  const status = document.querySelector('#video-status');
  if (!section || !slider || !toggle || !status) return;
  const cards = Array.from(slider.querySelectorAll('.gallery-card'));
  const videos = cards.map((card) => card.querySelector('video'));
  videos.forEach((video) => {
    video.controls = false;
  });
  const dots = Array.from(section.querySelectorAll('#gallery-dots button'));
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let activeIndex = 0;
  let visible = false;
  let wantsPlayback = !reducedMotion.matches && !navigator.connection?.saveData;
  let playbackRequest = 0;
  let scrollTimer;
  const updateControls = () => {
    const playing = !videos[activeIndex].paused;
    toggle.setAttribute('aria-label', playing ? 'Пауза' : 'Воспроизвести');
    toggle.setAttribute('aria-pressed', String(playing));
    section.querySelector('#icon-pause').classList.toggle('hidden', !playing);
    section.querySelector('#icon-play').classList.toggle('hidden', playing);
    cards.forEach((card, index) => {
      const button = card.querySelector('[data-video-toggle]');
      button.setAttribute('aria-pressed', String(index === activeIndex && playing));
      button.setAttribute(
        'aria-label',
        `${index === activeIndex && playing ? 'Пауза' : 'Воспроизвести'}: ${card.querySelector('h3').textContent.trim()}`,
      );
    });
  };
  const syncPlayback = async () => {
    const request = ++playbackRequest;
    const current = videos[activeIndex];
    videos.forEach((video) => {
      if (video !== current || !visible || document.hidden || !wantsPlayback) video.pause();
    });
    if (visible && !document.hidden && wantsPlayback) {
      try {
        await current.play();
        if (request !== playbackRequest && current !== videos[activeIndex]) current.pause();
      } catch (error) {
        if (request === playbackRequest && error.name !== 'AbortError') {
          wantsPlayback = false;
          if (error.name !== 'NotAllowedError')
            status.textContent = 'Видео недоступно. Откройте оригинал по ссылке под галереей.';
        }
      }
    }
    updateControls();
  };
  const select = (index, scroll = false) => {
    activeIndex = Math.max(0, Math.min(index, cards.length - 1));
    dots.forEach((dot, position) =>
      dot.setAttribute('aria-pressed', String(position === activeIndex)),
    );
    if (scroll) {
      const card = cards[activeIndex].getBoundingClientRect();
      const viewport = slider.getBoundingClientRect();
      slider.scrollTo({
        left: slider.scrollLeft + card.left - viewport.left - (viewport.width - card.width) / 2,
        behavior: reducedMotion.matches ? 'instant' : 'smooth',
      });
    }
    void syncPlayback();
  };
  const settleScroll = () => {
    clearTimeout(scrollTimer);
    const viewport = slider.getBoundingClientRect();
    const center = viewport.left + viewport.width / 2;
    const distances = cards.map((card) => {
      const rect = card.getBoundingClientRect();
      return Math.abs(rect.left + rect.width / 2 - center);
    });
    const nearest = distances.indexOf(Math.min(...distances));
    if (nearest !== activeIndex) select(nearest);
  };
  const togglePlayback = () => {
    wantsPlayback = videos[activeIndex].paused;
    void syncPlayback();
  };
  dots.forEach((dot, index) => dot.addEventListener('click', () => select(index, true)));
  cards.forEach((card, index) => {
    card.querySelector('[data-video-toggle]').addEventListener('click', () => {
      if (index === activeIndex) togglePlayback();
      else select(index, true);
    });
  });
  for (const video of videos) {
    for (const event of ['play', 'pause', 'ended']) video.addEventListener(event, updateControls);
    video.addEventListener('error', () => {
      if (video === videos[activeIndex]) {
        wantsPlayback = false;
        status.textContent = 'Видео недоступно. Откройте оригинал по ссылке под галереей.';
        updateControls();
      }
    });
  }
  toggle.addEventListener('click', togglePlayback);
  slider.addEventListener('keydown', (event) => {
    const destinations = {
      ArrowLeft: activeIndex - 1,
      ArrowRight: activeIndex + 1,
      Home: 0,
      End: cards.length - 1,
    };
    if (event.key in destinations) {
      event.preventDefault();
      select(destinations[event.key], true);
    }
  });
  slider.addEventListener(
    'scroll',
    () => {
      clearTimeout(scrollTimer);
      scrollTimer = setTimeout(settleScroll, 150);
    },
    { passive: true },
  );
  slider.addEventListener('scrollend', settleScroll);
  new ResizeObserver(() => select(activeIndex, true)).observe(slider);
  new IntersectionObserver(
    ([entry]) => {
      visible = entry.isIntersecting;
      void syncPlayback();
    },
    { threshold: 0.15 },
  ).observe(section);
  document.addEventListener('visibilitychange', () => {
    void syncPlayback();
  });
  reducedMotion.addEventListener('change', () => {
    if (reducedMotion.matches) wantsPlayback = false;
    void syncPlayback();
  });
  select(0);
}
