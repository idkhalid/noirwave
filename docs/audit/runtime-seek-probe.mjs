import { chromium } from 'playwright';

const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const warnings = [];
const mediaResponses = [];
page.on('console', (message) => {
    if (message.text().includes('Invalid config')) warnings.push(message.text());
});
page.on('response', (response) => {
    const url = new URL(response.url());
    if (url.hostname !== 'tracks.monochrome.st' || !url.pathname.startsWith('/track/')) return;
    mediaResponses.push({
        status: response.status(),
        range: response.request().headers()['range'] ?? null,
        contentRange: response.headers()['content-range'] ?? null,
        contentType: response.headers()['content-type'] ?? null,
    });
});
const state = () => page.evaluate(() => {
    const audio = document.querySelector('#audio-player');
    const repeat = document.getElementById('repeat-btn');
    const queue = JSON.parse(localStorage.getItem('monochrome-queue') || 'null');
    const buffered = [];
    for (let i = 0; i < audio.buffered.length; i++) buffered.push([audio.buffered.start(i), audio.buffered.end(i)]);
    return {
        time: audio.currentTime,
        duration: audio.duration,
        paused: audio.paused,
        seeking: audio.seeking,
        readyState: audio.readyState,
        error: audio.error?.code ?? null,
        buffered,
        mode: queue?.repeatMode,
        repeat: { title: repeat.title, active: repeat.classList.contains('active'), one: repeat.classList.contains('repeat-one') },
    };
});
const seek = async (fraction) => {
    const box = await page.locator('#progress-bar').boundingBox();
    await page.locator('#progress-bar').click({ position: { x: box.width * fraction, y: box.height / 2 } });
};
try {
    await page.goto('http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForFunction(() => document.title !== 'Monochrome', null, { timeout: 45000 });
    await page.locator('#search-input').fill('Daft Punk');
    await page.locator('#search-input').press('Enter');
    await page.locator('#page-search .track-item').first().waitFor({ timeout: 30000 });
    await page.locator('#page-search .track-item').first().click();
    await page.waitForFunction(() => document.querySelector('#audio-player')?.readyState >= 3, null, { timeout: 30000 });
    await page.evaluate(() => {
        window.__seekEvents = [];
        const audio = document.querySelector('#audio-player');
        for (const name of ['playing', 'waiting', 'stalled', 'seeking', 'seeked', 'canplay', 'ended', 'error']) {
            audio.addEventListener(name, () => window.__seekEvents.push({ name, time: audio.currentTime, readyState: audio.readyState, at: Date.now() }));
        }
    });
    console.log('START', JSON.stringify(await state()));
    await seek(0.5);
    await page.waitForTimeout(3000);
    console.log('MID_3S', JSON.stringify(await state()));
    await page.waitForTimeout(7000);
    console.log('MID_10S', JSON.stringify(await state()));
    await seek(0.99);
    await page.waitForTimeout(3000);
    console.log('END_3S', JSON.stringify(await state()));
    await page.waitForTimeout(12000);
    console.log('END_15S', JSON.stringify(await state()));
    console.log('EVENTS', JSON.stringify(await page.evaluate(() => window.__seekEvents)));
    console.log('MEDIA_RESPONSES', JSON.stringify(mediaResponses));
    console.log('SHAKA_WARNINGS', JSON.stringify(warnings));
    await page.locator('#repeat-btn').click();
    await page.locator('#repeat-btn').click();
    console.log('REPEAT_ONE_BEFORE_RELOAD', JSON.stringify(await state()));
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => document.title !== 'Monochrome', null, { timeout: 45000 });
    await page.waitForFunction(() => document.getElementById('repeat-btn')?.title === 'Repeat One', null, { timeout: 30000 });
    console.log('REPEAT_ONE_AFTER_RELOAD', JSON.stringify(await state()));
} finally {
    await browser.close();
}
