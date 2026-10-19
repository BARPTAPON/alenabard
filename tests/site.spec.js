import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('page loads without errors, eager video downloads or original large images', async ({
  page,
}) => {
  const errors = [];
  const media = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('request', (request) => {
    if (/\.(mp4|png|jpe?g)(?:[?#]|$)/i.test(request.url())) media.push(request.url());
  });
  await page.goto('/');
  await expect(page.locator('h1')).toHaveCount(1);
  await expect(page.getByRole('heading', { name: 'Alenabard', exact: true })).toBeVisible();
  await expect(page.locator('html')).toHaveClass(/js/);
  await expect(page.locator('img[fetchpriority="high"]')).toHaveJSProperty('complete', true);
  expect(
    await page
      .locator('img')
      .evaluateAll((images) =>
        images.every((image) => image.srcset && image.width > 0 && image.height > 0),
      ),
  ).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(media).toEqual([]);
  expect(errors).toEqual([]);
});

test('theme follows system preference, persists and stays accessible', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/');
  await expect(page.locator('html')).toHaveClass(/dark/);
  await page.getByRole('button', { name: 'Светлая тема', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Светлая тема', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.reload();
  await expect(page.locator('html')).not.toHaveClass(/dark/);
  await expect(page.locator('#theme-color-meta')).toHaveAttribute('content', '#f9fafb');
});

test('unavailable localStorage does not break theme or galleries', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', {
      get() {
        throw new DOMException('Blocked', 'SecurityError');
      },
    });
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Тёмная тема', exact: true }).click();
  await expect(page.locator('html')).toHaveClass(/dark/);
  await expect(page.locator('#gallery-track img')).toHaveCount(16);
});

test('video selection works from keyboard and playback reflects real media state', async ({
  page,
}) => {
  await page.goto('/');
  const slider = page.getByRole('group', { name: 'Видеоролики', exact: true });
  await slider.scrollIntoViewIfNeeded();
  await page.getByRole('button', { name: 'Видео 2', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Видео 2', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await slider.focus();
  await slider.press('End');
  await expect(page.getByRole('button', { name: 'Видео 4', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect
    .poll(() => page.locator('#video-slide-4 video').evaluate((video) => video.paused))
    .toBe(false);
  await page.locator('#gallery-toggle').click();
  await expect(page.locator('#gallery-toggle')).toHaveAttribute('aria-label', 'Воспроизвести');
  expect(
    await page.locator('video').evaluateAll((videos) => videos.every((video) => video.paused)),
  ).toBe(true);
});

test('autoplay rejection keeps the player controls truthful', async ({ page }) => {
  await page.addInitScript(() => {
    window.playAttempts = 0;
    HTMLMediaElement.prototype.play = () => {
      window.playAttempts++;
      return Promise.reject(new DOMException('Autoplay blocked', 'NotAllowedError'));
    };
  });
  await page.goto('/');
  await page.locator('#video-slider').scrollIntoViewIfNeeded();
  await expect.poll(() => page.evaluate(() => window.playAttempts)).toBeGreaterThan(0);
  await expect(page.locator('#gallery-toggle')).toHaveAttribute('aria-label', 'Воспроизвести');
  await expect(page.locator('#gallery-toggle')).toHaveAttribute('aria-pressed', 'false');
});

test('unavailable video reports an error and never claims to be playing', async ({ page }) => {
  await page.route('**/video2.mp4', (route) => route.fulfill({ status: 404, body: '' }));
  await page.goto('/');
  await page.locator('#video-slider').scrollIntoViewIfNeeded();
  await page.getByRole('button', { name: 'Видео 2', exact: true }).click();
  await expect(page.locator('#video-status')).toContainText('Видео недоступно');
  await expect(page.locator('#gallery-toggle')).toHaveAttribute('aria-pressed', 'false');
});

test('reduced motion disables animated galleries and automatic playback', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.locator('#video-slider').scrollIntoViewIfNeeded();
  await expect(page.locator('#gallery-toggle')).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('#photo-gallery-toggle')).toBeDisabled();
  expect(
    await page
      .locator('[data-float="1"]')
      .evaluate((element) => getComputedStyle(element).animationName),
  ).toBe('none');
  expect(
    await page
      .locator('#gallery-track')
      .evaluate((element) => getComputedStyle(element).animationName),
  ).toBe('none');
});

test('main content, photos, native videos and contact links work without JavaScript', async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(baseURL);
  await expect(page.locator('#gallery-track img')).toHaveCount(8);
  await expect(page.locator('#gallery-toggle')).toBeHidden();
  await expect(page.locator('video').first()).toHaveAttribute('controls', '');
  await page.getByRole('link', { name: 'Связаться', exact: true }).click();
  await expect(page).toHaveURL(/#contact$/);
  await expect(page.getByRole('link', { name: /Оставить заявку/ })).toBeVisible();
  await context.close();
});

test('WCAG accessibility checks pass in light and dark themes', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  for (const theme of ['Светлая тема', 'Тёмная тема']) {
    await page.getByRole('button', { name: theme, exact: true }).click();
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(
      results.violations.map(({ id, nodes }) => ({
        id,
        elements: nodes.map((node) => node.target),
      })),
    ).toEqual([]);
  }
});
