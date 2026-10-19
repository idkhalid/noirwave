import { chromium } from 'playwright';

const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const readQueue = () => page.evaluate(() => {
    const state = JSON.parse(localStorage.getItem('monochrome-queue') || 'null');
    const audio = document.querySelector('#audio-player');
    return {
        original: state?.queue?.map((track) => track.title),
        shuffled: state?.shuffledQueue?.map((track) => track.title),
        originalBeforeShuffle: state?.originalQueueBeforeShuffle?.map((track) => track.title),
        index: state?.currentQueueIndex,
        shuffleActive: state?.shuffleActive,
        currentTitle: document.querySelector('.now-playing-bar .title')?.textContent?.trim(),
        audio: audio && { paused: audio.paused, time: audio.currentTime, error: audio.error?.code ?? null },
    };
});
try {
    await page.goto('http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => document.title !== 'Monochrome', null, { timeout: 45000 });
    await page.locator('#search-input').fill('Daft Punk');
    await page.locator('#search-input').press('Enter');
    await page.locator('#page-search .track-item').nth(2).waitFor({ timeout: 30000 });
    await page.locator('#page-search .track-item').first().click();
    await page.waitForTimeout(3000);
    for (const [index, length] of [[1, 2], [2, 3]]) {
        await page.locator('#page-search .track-item').nth(index).click({ button: 'right' });
        await page.locator('#context-menu [data-action="add-to-queue"]').click();
        await page.waitForFunction((expected) => JSON.parse(localStorage.getItem('monochrome-queue') || 'null')?.queue?.length >= expected, length, { timeout: 10000 });
    }
    console.log('QUEUE_3', JSON.stringify(await readQueue()));
    await page.locator('#shuffle-btn').click();
    const shuffled = await readQueue();
    console.log('SHUFFLED', JSON.stringify(shuffled));
    await page.locator('#next-btn').click();
    await page.waitForTimeout(7000);
    console.log('SHUFFLED_NEXT', JSON.stringify(await readQueue()));
    await page.locator('#queue-btn').click();
    await page.locator('.queue-track-item[data-queue-index="2"] .queue-remove-btn').click();
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('monochrome-queue') || 'null')?.shuffledQueue?.length === 2, null, { timeout: 10000 });
    console.log('REMOVED_THIRD_SHUFFLED', JSON.stringify(await readQueue()));
    await page.locator('#shuffle-btn').click();
    console.log('REMOVED_THIRD_UNSHUFFLED', JSON.stringify(await readQueue()));
} finally {
    await browser.close();
}
