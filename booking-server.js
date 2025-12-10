import express from 'express';
import { chromium } from 'playwright';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

app.post('/api/book', async (req, res) => {
  const { prompt } = req.body;
  let browser = null;

  console.log(`[Backend] Received request: "${prompt}"`);

  // 1. CLEAN SEARCH TERM
  let cleanPrompt = prompt
    .replace(/book\s+a\s+table\s+at/i, '')
    .replace(/book\s+appointment\s+at/i, '')
    .replace(/book/i, '')
    .trim();

  // Search specifically for "reservation" to find booking widgets
  const searchQuery = `${cleanPrompt} Singapore reservation booking`;
  console.log(`[Backend] Searching for: "${searchQuery}"`);

  try {
    browser = await chromium.launch({ headless: false });
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' 
    });
    const page = await context.newPage();

    // 2. SEARCH ON DUCKDUCKGO
    await page.goto('https://duckduckgo.com', { waitUntil: 'domcontentloaded' });
    await page.fill('input[name="q"]', searchQuery);
    await page.keyboard.press('Enter');
    
    // Wait for results
    await page.waitForSelector('[data-testid="result-title-a"]', { timeout: 5000 });

    // 3. SMART LINK SELECTION
    // We scan the top 5 results. If we find a known booking platform, we click that.
    // Otherwise, we default to the first result.
    const results = page.locator('[data-testid="result-title-a"]');
    const count = await results.count();
    let targetIndex = 0; 

    console.log(`[Backend] Analyzing top results for booking platforms...`);

    for (let i = 0; i < Math.min(count, 5); i++) {
      const href = await results.nth(i).getAttribute('href');
      const url = href ? href.toLowerCase() : "";

      // LIST OF PREFERRED BOOKING PLATFORMS
      if (url.includes('oddle.me') || 
          url.includes('chope.co') || 
          url.includes('sevenrooms') || 
          url.includes('tablecheck') || 
          url.includes('opentable')) {
         console.log(`[Backend] ✅ Found preferred booking engine: ${url}`);
         targetIndex = i;
         break; // Stop looking, we found a good one
      }
    }

    const finalUrl = await results.nth(targetIndex).getAttribute('href');
    console.log(`[Backend] Navigating to: ${finalUrl}`);

    // Click and wait
    await Promise.all([
       page.waitForLoadState('domcontentloaded'),
       results.nth(targetIndex).click(),
    ]);

    // Extra wait for the page to render fully
    await page.waitForTimeout(3500);

    // 4. CAPTURE PAGE
    const screenshotBuffer = await page.screenshot({ fullPage: false });
    const screenshotBase64 = screenshotBuffer.toString('base64');
    const currentUrl = page.url();

    res.json({
      success: true,
      text: `I've opened the booking page for "${cleanPrompt}".`,
      image: `data:image/png;base64,${screenshotBase64}`,
      link: currentUrl
    });

  } catch (error) {
    console.error("[Backend] Error:", error);
    res.status(500).json({ success: false, text: "Failed to navigate to the website." });
  } finally {
    if (browser) await browser.close();
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`✅ Deep-Link Booking Agent running at http://localhost:${PORT}`);
});