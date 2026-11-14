import { expect, test, type Page } from '@playwright/test';

interface Hook {
  mode: string;
  gameNumber: number;
  overlay: string | null;
  snapshot: () => {
    status: string;
    scores: number[];
    cannons: unknown[];
    projectiles: { owner: number }[];
    variation: { gameNumber: number; movingShields: boolean; zigzagBombs: boolean; fastBombs: boolean; invisibleInvaders: boolean };
  } | null;
  selectGame: (n: number) => void;
}

type FakePad = { index: number; id: string; connected: boolean; mapping: string; axes: number[]; buttons: { pressed: boolean; value: number }[] };
type TestWindow = Window & { __fakePads?: FakePad[] };

const hook = <T>(page: Page, read: (h: Hook) => T) =>
  page.evaluate(fn => {
    const h = window.__spaceInvaders as unknown as Hook | undefined;
    if (!h) throw new Error('hook absent');
    return new Function('h', `return (${fn})(h)`)(h) as unknown;
  }, read.toString()) as Promise<T>;

function trackErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error') errors.push(message.text());
  });
  return errors;
}

test('partie 1 au clavier : pause, reprise, matrice et partie 16', async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto('/');
  await page.keyboard.press('Enter');
  await expect.poll(() => hook(page, h => h.mode)).toBe('selection');

  await page.keyboard.press('Enter');
  await expect.poll(() => hook(page, h => h.mode)).toBe('game');
  await expect.poll(() => hook(page, h => h.snapshot()?.status)).toBe('playing');

  await page.keyboard.press('p');
  await expect.poll(() => hook(page, h => h.overlay)).toBe('paused');
  await expect.poll(() => hook(page, h => h.snapshot()?.status)).toBe('paused');
  await page.keyboard.press('p');
  await expect.poll(() => hook(page, h => h.overlay)).toBeNull();

  // Retour au menu avec confirmation.
  await page.keyboard.press('Tab');
  await expect.poll(() => hook(page, h => h.overlay)).toBe('quit-confirm');
  await page.keyboard.press('Enter');
  await expect.poll(() => hook(page, h => h.mode)).toBe('selection');

  await page.keyboard.press('m');
  await expect.poll(() => hook(page, h => h.mode)).toBe('matrix');
  for (let i = 0; i < 15; i++) {
    await page.keyboard.press('Tab');
    await page.waitForTimeout(60);
  }
  await expect.poll(() => hook(page, h => h.gameNumber)).toBe(16);
  await page.keyboard.press('Escape');
  await expect.poll(() => hook(page, h => h.mode)).toBe('selection');
  await page.keyboard.press('Enter');
  await expect.poll(() => hook(page, h => h.snapshot()?.variation)).toMatchObject({
    gameNumber: 16,
    movingShields: true,
    zigzagBombs: true,
    fastBombs: true,
    invisibleInvaders: true,
  });
  expect(errors).toEqual([]);
});

test('deux manettes simulées : partie 33 en compétition', async ({ page }) => {
  const errors = trackErrors(page);
  await page.addInitScript(() => {
    const makePad = (index: number) => ({
      index,
      id: `Manette simulée ${index + 1}`,
      connected: true,
      mapping: 'standard',
      axes: [0, 0, 0, 0],
      buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })),
      timestamp: 0,
      vibrationActuator: null,
    });
    const w = window as TestWindow;
    w.__fakePads = [makePad(0), makePad(1)];
    Object.defineProperty(navigator, 'getGamepads', { value: () => w.__fakePads });
  });
  const button = (pad: number, index: number, down: boolean) =>
    page.evaluate(([p, i, d]) => {
      const target = (window as TestWindow).__fakePads?.[p as number]?.buttons[i as number];
      if (target) {
        target.pressed = d as boolean;
        target.value = d ? 1 : 0;
      }
    }, [pad, index, down]);
  const tap = async (pad: number, index: number) => {
    await button(pad, index, true);
    await page.waitForTimeout(80);
    await button(pad, index, false);
    await page.waitForTimeout(80);
  };

  await page.goto('/');
  await tap(0, 9);
  await expect.poll(() => hook(page, h => h.mode)).toBe('selection');
  await page.evaluate(() => window.__spaceInvaders?.selectGame(33));
  await tap(0, 9);
  await expect.poll(() => hook(page, h => h.mode)).toBe('game');

  const snap = await hook(page, h => h.snapshot());
  expect(snap?.scores).toHaveLength(2);
  expect(snap?.cannons).toHaveLength(2);

  // Le joueur droit tire avec sa propre manette.
  await button(1, 0, true);
  await expect.poll(() => hook(page, h => h.snapshot()?.projectiles.some(p => p.owner === 1))).toBe(true);
  await button(1, 0, false);

  // Déconnexion de la manette 2 : pause et consigne.
  await page.evaluate(() => {
    const pad = (window as TestWindow).__fakePads?.[1];
    if (pad) pad.connected = false;
  });
  await expect.poll(() => hook(page, h => h.overlay)).toBe('pad-lost');
  await page.evaluate(() => {
    const pad = (window as TestWindow).__fakePads?.[1];
    if (pad) pad.connected = true;
  });
  await tap(0, 9);
  await expect.poll(() => hook(page, h => h.overlay)).toBeNull();
  expect(errors).toEqual([]);
});

test('conserve le 4:3 sans défilement de 1280 × 720 à 3840 × 2160', async ({ page }) => {
  for (const [width, height, expected] of [
    [1280, 720, null],
    [1920, 1080, [1280, 960]],
    [3840, 2160, [2560, 1920]],
  ] as const) {
    await page.setViewportSize({ width, height });
    await page.goto('/');
    const box = await page.locator('#screen').boundingBox();
    if (!box) throw new Error('canvas absent');
    expect(box.width / box.height).toBeCloseTo(4 / 3, 2);
    expect(box.height).toBeLessThanOrEqual(height);
    expect(box.width).toBeLessThanOrEqual(width);
    if (expected) expect([box.width, box.height]).toEqual(expected);
    const scroll = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.scrollHeight]);
    expect(scroll[0]).toBeLessThanOrEqual(width);
    expect(scroll[1]).toBeLessThanOrEqual(height);
  }
});
