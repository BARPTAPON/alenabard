const themeButtons = document.querySelectorAll('[data-theme-btn]');
const metaThemeColor = document.getElementById('theme-color-meta');

const activeClasses = [
  'bg-white',
  'text-gray-950',
  'shadow-sm',
  'dark:bg-gray-600'
];

function applyTheme(theme) {
  const root = document.documentElement;

  if (theme === 'dark') {
    root.classList.add('dark');
    if (metaThemeColor) metaThemeColor.setAttribute('content', '#030712');
  } else {
    root.classList.remove('dark');
    if (metaThemeColor) metaThemeColor.setAttribute('content', '#f9fafb');
  }

  localStorage.setItem('theme', theme);

  themeButtons.forEach(btn => {
    btn.classList.remove(...activeClasses);
    if (btn.getAttribute('data-theme-btn') === theme) {
      btn.classList.add(...activeClasses);
    }
  });
}

const savedTheme = localStorage.getItem('theme') || 'light';
applyTheme(savedTheme);

themeButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    const selectedTheme = btn.getAttribute('data-theme-btn');
    applyTheme(selectedTheme);
  });
});


// Scroll 
const contactBtn = document.getElementById('contact-btn');
const contactSection = document.getElementById('contact');

if (contactBtn && contactSection) {
  contactBtn.addEventListener('click', (e) => {
    e.preventDefault();

    const startPosition = window.scrollY;
    const targetPosition = contactSection.getBoundingClientRect().top + window.scrollY;
    const distance = targetPosition - startPosition;
    const duration = 800;
    let startTime = null;

    function easeInOutCubic(t) {
      return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    function animation(currentTime) {
      if (startTime === null) startTime = currentTime;
      const timeElapsed = currentTime - startTime;
      const progress = Math.min(timeElapsed / duration, 1);

      window.scrollTo(0, startPosition + distance * easeInOutCubic(progress));

      if (timeElapsed < duration) {
        requestAnimationFrame(animation);
      }
    }

    requestAnimationFrame(animation);
  });
}


// Gallery
const galleryTrack = document.getElementById('gallery-track');

if (galleryTrack) {
  const myImages = [
    '/13.webp', '/2.webp', '/14.webp', '/10.webp',
    '/1.webp', '/3.webp', '/11.webp', '/8.webp'
  ];

  const createCard = (src, isDuplicate = false) => `
    <div 
      class="mr-4 sm:mr-5 md:mr-6 w-64 sm:w-72 md:w-88 h-88 sm:h-96 md:h-120 rounded-4xl overflow-hidden shrink-0 select-none bg-gray-200 dark:bg-gray-800 shadow-md outline -outline-offset-1 outline-black/5 dark:outline-white/10"
      ${isDuplicate ? 'aria-hidden="true"' : ''}
    >
      <img 
        src="${src}" 
        class="w-full h-full object-cover pointer-events-none opacity-0 transition-opacity duration-500" 
        onload="this.classList.remove('opacity-0')"
        alt="${isDuplicate ? '' : 'Работа из галереи Алёны Бард'}"
        draggable="false"
      >
    </div>
  `;
  
  const firstHalf = myImages.map((src) => createCard(src, false)).join('');
  const secondHalf = myImages.map((src) => createCard(src, true)).join('');

  galleryTrack.innerHTML = firstHalf + secondHalf;
}


// Slider
(() => {
  const section = document.getElementById('highlights');
  const slider = document.getElementById('video-slider');
  if (!section || !slider) return;

  const cards = Array.from(slider.querySelectorAll('.gallery-card'));
  const dots = Array.from(document.querySelectorAll('#gallery-dots button'));
  const toggleBtn = document.getElementById('gallery-toggle');
  const iconPause = document.getElementById('icon-pause');
  const iconPlay = document.getElementById('icon-play');

  let isManuallyPaused = false;
  let activeIndex = 0;
  let isSectionVisible = false;
  let isClickScrolling = false;
  let clickScrollTimer;

  slider.scrollLeft = 0;

  const setControls = (isPlaying) => {
    iconPause.classList.toggle('hidden', !isPlaying);
    iconPlay.classList.toggle('hidden', isPlaying);
    toggleBtn.setAttribute('aria-label', isPlaying ? 'Пауза' : 'Воспроизвести');
  };

  const scrollToCard = (index) => {
    const card = cards[index];
    if (!card) return;
    const targetLeft = card.offsetLeft - (slider.clientWidth - card.clientWidth) / 2;
    slider.scrollTo({ left: targetLeft, behavior: 'smooth' });
  };

  const activateCard = (index) => {
    activeIndex = index;

    dots.forEach((dot, idx) => {
      if (idx === index) {
        dot.className = 'w-6 h-2.5 rounded-full bg-gray-600 dark:bg-gray-100 transition-all duration-300';
      } else {
        dot.className = 'w-2.5 h-2.5 rounded-full bg-gray-400 dark:bg-gray-100/30 hover:bg-gray-500 dark:hover:bg-gray-100/60 cursor-pointer transition-all duration-300';
      }
    });

    cards.forEach((card, idx) => {
      const vid = card.querySelector('video');
      if (!vid) return;

      if (idx === index) {
        if (!isManuallyPaused && isSectionVisible) {
          vid.play().catch(() => { });
          setControls(true);
        }
      } else {
        vid.pause();
      }
    });
  };

  const togglePlayPause = () => {
    const activeVideo = cards[activeIndex]?.querySelector('video');
    if (!activeVideo) return;

    if (activeVideo.paused) {
      isManuallyPaused = false;
      activeVideo.play().catch(() => { });
      setControls(true);
    } else {
      isManuallyPaused = true;
      activeVideo.pause();
      setControls(false);
    }
  };

  const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      isSectionVisible = entry.isIntersecting;
      const currentVid = cards[activeIndex]?.querySelector('video');
      if (!currentVid) return;

      if (isSectionVisible && !isManuallyPaused) {
        currentVid.play().catch(() => { });
        setControls(true);
      } else {
        currentVid.pause();
        setControls(false);
      }
    });
  }, { threshold: 0.25 });

  sectionObserver.observe(section);

  let scrollTimeout;
  slider.addEventListener('scroll', () => {
    if (isClickScrolling) return;

    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
      const sliderCenter = slider.scrollLeft + slider.clientWidth / 2;
      let closestIndex = 0;
      let minDiff = Infinity;

      cards.forEach((card, idx) => {
        const cardCenter = card.offsetLeft + card.clientWidth / 2;
        const diff = Math.abs(cardCenter - sliderCenter);
        if (diff < minDiff) {
          minDiff = diff;
          closestIndex = idx;
        }
      });

      if (closestIndex !== activeIndex) {
        activateCard(closestIndex);
      }
    }, 60);
  }, { passive: true });

  dots.forEach((dot, idx) => {
    dot.addEventListener('click', () => {
      isClickScrolling = true;
      clearTimeout(clickScrollTimer);

      activateCard(idx);
      scrollToCard(idx);

      clickScrollTimer = setTimeout(() => {
        isClickScrolling = false;
      }, 600);
    });
  });

  toggleBtn.addEventListener('click', togglePlayPause);

  cards.forEach((card, idx) => {
    card.addEventListener('click', () => {
      if (idx !== activeIndex) {
        dots[idx]?.click();
      } else {
        togglePlayPause();
      }
    });
  });

  activateCard(0);
})();