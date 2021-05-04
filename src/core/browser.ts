import puppeteer, { Browser } from "puppeteer"
import graceful from "node-graceful"

let browser: Browser | null = null

export async function getBrowserInstance() {
    if (browser) return browser
    browser = await puppeteer.launch()
    return browser
}

graceful.on("exit", async () => {
    if (browser) await browser.close()
})
