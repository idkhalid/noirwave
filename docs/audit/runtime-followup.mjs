import { chromium } from 'playwright';

const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const notes = [];
page.on('console', (message) => {
    if (message.type() === 'warning' || message.type() === 'error') notes.push(message.text().replace(/https?:\/\/\S+/g, '[URL]'));
});
page.on('response', (response) => {
    const url = new URL(response.url());
    if (url.hostname === 'tracks.monochrome.st' && url.pathname.startsWith('/track/')) {
        notes.push(`media HTTP ${response.status()}`);
    }
});
const state = () => page.evaluate(() => {
    const audio = document.querySelector('#audio-player');
    const queue = JSON.parse(localStorage.getItem('monochrome-queue') || 'null');
    const repeat = document.getElementById('repeat-btn');
    const ranges = [];
    for (let i = 0; i < audio.buffered.length; i++) ranges.push([audio.buffered.start(i), audio.buffered.end(i)]);
    return {
        title: document.querySelector('.now-playing-bar .title')?.textContent?.trim(),
        queue: queue?.queue?.map((track) => ({ title: track.title, duration: track.duration })),
        index: queue?.currentQueueIndex,
        repeatMode: queue?.repeatMode,
        autoplay: localStorage.getItem('monochrome-autoplay'),
        repeatButton: { title: repeat.title, active: repeat.classList.contains('active'), one: repeat.classList.contains('repeat-one') },
        audio: { time: audio.currentTime, duration: audio.duration, paused: audio.paused, seeking: audio.seeking, ended: audio.ended, readyState: audio.readyState, error: audio.error?.code ?? null, buffered: ranges },
    };
});
try {
    await page.goto('http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForFunction(() => document.title !== 'Monochrome', null, { timeout: 45000 });
    await page.locator('#search-input').fill('Her Majesty Beatles');
    await page.locator('#search-input').press('Enter');
    await page.locator('#page-search .track-item').first().waitFor({ timeout: 30000 });
    const rows = await page.locator('#page-search .track-item').evaluateAll((elements) => elements.map((element, i) => ({ i, text: element.innerText.slice(0, 130) })));
    console.log('ROWS', JSON.stringify(rows));
    await page.evaluate(() => {
        window.__mediaEvents = [];
        const audio = document.querySelector('#audio-player');
        for (const name of ['playing', 'waiting', 'stalled', 'seeking', 'seeked', 'canplay', 'ended', 'error']) {
            audio.addEventListener(name, () => window.__mediaEvents.push({ name, time: audio.currentTime, readyState: audio.readyState, at: Date.now() }));
        }
    });
    await page.locator('#page-search .track-item').nth(1).click();
    await page.waitForFunction(() => document.querySelector('#audio-player')?.readyState >= 2, null, { timeout: 30000 });
    console.log('FIRST_PLAY', JSON.stringify(await state()));
    await page.locator('#page-search .track-item').nth(3).click({ button: 'right' });
    await page.locator('#context-menu [data-action="add-to-queue"]').click();
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('monochrome-queue') || 'null')?.queue?.length === 2, null, { timeout: 10000 });
    await page.locator('#repeat-btn').click();
    console.log('REPEAT_ALL_SET', JSON.stringify(await state()));
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => document.title !== 'Monochrome', null, { timeout: 45000 });
    console.log('REPEAT_ALL_RELOAD', JSON.stringify(await state()));
    await page.evaluate(() => {
        window.__mediaEvents = [];
        const audio = document.querySelector('#audio-player');
        for (const name of ['playing', 'waiting', 'stalled', 'seeking', 'seeked', 'canplay', 'ended', 'error']) {
            audio.addEventListener(name, () => window.__mediaEvents.push({ name, time: audio.currentTime, readyState: audio.readyState, at: Date.now() }));
        }
    });
    await page.locator('#next-btn').click();
    await page.waitForFunction(() => document.querySelector('#audio-player')?.readyState >= 2 && !document.querySelector('#audio-player')?.paused, null, { timeout: 30000 });
    console.log('LAST_PLAY', JSON.stringify(await state()));
    const duration = (await state()).audio.duration;
    const waitMs = Math.min(180000, Math.max(45000, Math.ceil((duration + 25) * 1000)));
    try {
        await page.waitForFunction(() => window.__mediaEvents?.some((event) => event.name === 'ended'), null, { timeout: waitMs });
        await page.waitForTimeout(2500);
        console.log('NATURAL_END', JSON.stringify(await state()));
    } catch {
        console.log('NATURAL_END_TIMEOUT', JSON.stringify(await state()));
    }
    console.log('MEDIA_EVENTS', JSON.stringify(await page.evaluate(() => window.__mediaEvents)));
    console.log('NOTES', JSON.stringify(notes.slice(-20)));
} finally {
    await browser.close();
}
