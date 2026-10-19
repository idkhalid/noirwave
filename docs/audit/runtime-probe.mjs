import { chromium } from 'playwright';

const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'],
});
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
const errors = [];
const providerResponses = [];
page.on('pageerror', (error) => errors.push(error.message));
page.on('response', (response) => {
    if (response.url().startsWith('https://tracks.monochrome.st/')) {
        providerResponses.push({ path: new URL(response.url()).pathname.split('/').slice(0, 3).join('/'), status: response.status() });
    }
});
const snapshot = () => page.evaluate(() => {
    const audio = document.querySelector('#audio-player');
    const queue = JSON.parse(localStorage.getItem('monochrome-queue') || 'null');
    return {
        path: location.pathname,
        audio: audio && { paused: audio.paused, currentTime: audio.currentTime, duration: audio.duration, readyState: audio.readyState, error: audio.error?.code ?? null },
        queue: queue && { length: queue.queue?.length, index: queue.currentQueueIndex, shuffled: queue.shuffleActive, repeatMode: queue.repeatMode },
        buttons: Object.fromEntries(['shuffle-btn', 'repeat-btn', 'queue-btn'].map((id) => [id, { className: document.getElementById(id)?.className, title: document.getElementById(id)?.title }])),
        nowPlaying: document.querySelector('.now-playing-bar')?.innerText.slice(0, 150),
    };
});
try {
    const response = await page.goto('http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForFunction(() => document.title !== 'Monochrome', null, { timeout: 45000 });
    console.log('LOAD', JSON.stringify({ status: response?.status(), title: await page.title() }));
    await page.locator('#search-input').fill('Daft Punk');
    await page.locator('#search-input').press('Enter');
    try {
        await page.locator('#page-search .track-item').first().waitFor({ timeout: 20000 });
    } catch {
        console.log('SEARCH_RETRY', JSON.stringify({ pageText: (await page.locator('#page-search').innerText()).slice(0, 400), providerResponses: providerResponses.slice(-15), errors: errors.slice(-10) }));
        await page.reload({ waitUntil: 'domcontentloaded' });
        await page.locator('#page-search .track-item').first().waitFor({ timeout: 25000 });
    }
    console.log('SEARCH', JSON.stringify({ count: await page.locator('#page-search .track-item').count(), first: await page.locator('#page-search .track-item .title').first().innerText() }));
    await page.locator('#page-search .track-item').first().click();
    await page.waitForTimeout(8000);
    console.log('PLAY', JSON.stringify(await snapshot()));
    console.log('PROVIDER', JSON.stringify(providerResponses.slice(-20)));
    console.log('ERRORS', JSON.stringify(errors.slice(-15)));
    await page.locator('.now-playing-bar .play-pause-btn').click();
    await page.waitForTimeout(1000);
    console.log('PAUSE', JSON.stringify(await snapshot()));
    await page.locator('.now-playing-bar .play-pause-btn').click();
    await page.waitForTimeout(1200);
    console.log('RESUME', JSON.stringify(await snapshot()));
    const progressBox = await page.locator('#progress-bar').boundingBox();
    await page.locator('#progress-bar').click({ position: { x: progressBox.width / 2, y: progressBox.height / 2 } });
    await page.waitForTimeout(4000);
    console.log('SEEK', JSON.stringify(await snapshot()));
    await page.locator('#repeat-btn').click();
    console.log('REPEAT1', JSON.stringify(await snapshot()));
    await page.locator('#repeat-btn').click();
    console.log('REPEAT2', JSON.stringify(await snapshot()));
    await page.locator('#queue-btn').click();
    console.log('QUEUE_PANEL', JSON.stringify(await page.evaluate(() => ({
        visiblePanelText: [...document.querySelectorAll('#side-panel, .queue-panel, #queue-content')].filter((element) => element.getClientRects().length).map((element) => element.innerText.slice(0, 300)),
    }))));
    await page.locator('#page-search .track-item').nth(1).click({ button: 'right' });
    console.log('CONTEXT_MENU', JSON.stringify(await page.evaluate(() => [...document.querySelectorAll('#context-menu, .context-menu')].filter((element) => element.getClientRects().length).map((element) => element.innerText.slice(0, 600)))));
    await page.locator('#context-menu [data-action="add-to-queue"]').click();
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('monochrome-queue') || 'null')?.queue?.length >= 2, null, { timeout: 10000 });
    console.log('ADD_QUEUE', JSON.stringify(await snapshot()));
    await page.locator('#queue-btn').click();
    console.log('QUEUE_2', JSON.stringify(await page.locator('#side-panel').innerText()));
    await page.locator('#shuffle-btn').click();
    console.log('SHUFFLE', JSON.stringify(await snapshot()));
    await page.locator('#shuffle-btn').click();
    await page.locator('#repeat-btn').click();
    console.log('MODES_OFF', JSON.stringify(await snapshot()));
    await page.locator('#next-btn').click();
    await page.waitForTimeout(8000);
    console.log('NEXT', JSON.stringify(await snapshot()));
    await page.locator('#prev-btn').click();
    await page.waitForTimeout(1000);
    console.log('PREVIOUS', JSON.stringify(await snapshot()));
    await page.locator('#prev-btn').click();
    await page.waitForTimeout(7000);
    console.log('PREVIOUS_TO_PRIOR', JSON.stringify(await snapshot()));
    await page.locator('#repeat-btn').click();
    await page.locator('#repeat-btn').click();
    const repeatBox = await page.locator('#progress-bar').boundingBox();
    await page.locator('#progress-bar').click({ position: { x: repeatBox.width * 0.99, y: repeatBox.height / 2 } });
    await page.waitForTimeout(12000);
    console.log('REPEAT_ONE_ENDED', JSON.stringify(await snapshot()));
    await page.locator('#repeat-btn').click();
    await page.locator('#repeat-btn').click();
    await page.locator('#next-btn').click();
    await page.waitForTimeout(6000);
    console.log('REPEAT_ALL_LAST', JSON.stringify(await snapshot()));
    const wrapBox = await page.locator('#progress-bar').boundingBox();
    await page.locator('#progress-bar').click({ position: { x: wrapBox.width * 0.99, y: wrapBox.height / 2 } });
    await page.waitForTimeout(14000);
    console.log('REPEAT_ALL_ENDED', JSON.stringify(await snapshot()));
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(5000);
    console.log('RELOAD', JSON.stringify(await snapshot()));
    console.log('FINAL_ERRORS', JSON.stringify(errors.slice(-15)));
} finally {
    await browser.close();
}
