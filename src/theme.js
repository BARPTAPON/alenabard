export function initTheme() {
  const preference = window.matchMedia('(prefers-color-scheme: dark)');
  const buttons = document.querySelectorAll('[data-theme-btn]');
  let savedTheme;
  try {
    savedTheme = localStorage.getItem('theme');
  } catch {
    // Storage may be disabled; controls must still work in this tab.
  }
  const applyTheme = () => {
    const dark = ['light', 'dark'].includes(savedTheme)
      ? savedTheme === 'dark'
      : preference.matches;
    document.documentElement.classList.toggle('dark', dark);
    document
      .querySelector('#theme-color-meta')
      ?.setAttribute('content', dark ? '#030712' : '#f9fafb');
    for (const button of buttons) {
      button.setAttribute(
        'aria-pressed',
        String(button.dataset.themeBtn === (dark ? 'dark' : 'light')),
      );
    }
  };
  for (const button of buttons) {
    button.addEventListener('click', () => {
      savedTheme = button.dataset.themeBtn;
      try {
        localStorage.setItem('theme', savedTheme);
      } catch {
        // Retain the selection in memory if persistence is unavailable.
      }
      applyTheme();
    });
  }
  preference.addEventListener('change', applyTheme);
  window.addEventListener('storage', (event) => {
    if (event.key === 'theme' || event.key === null) {
      savedTheme = event.newValue;
      applyTheme();
    }
  });
  applyTheme();
}
