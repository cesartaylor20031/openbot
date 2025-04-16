const express = require("express");
const cors = require("cors");
const puppeteer = require("puppeteer-core");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

// 🚀 TEST
app.get("/test", (req, res) => {
  res.json({ mensaje: "Bot listo para DeepSeek Vision sin API" });
});

// 🧠 RUTA PRINCIPAL: SCRAPING DeepSeek
app.post("/vision-deepseek", async (req, res) => {
  const { image_url } = req.body;

  if (!image_url) {
    return res.status(400).json({ error: "Falta image_url" });
  }

  const browserWSEndpoint = `wss://chrome.browserless.io?token=${process.env.BROWSERLESS_TOKEN}`;

  try {
    const browser = await puppeteer.connect({ browserWSEndpoint });
    const page = await browser.newPage();

    await page.goto("https://deepseek.com/vision", { waitUntil: "domcontentloaded" });

    // Esperar carga y llenar los campos
    await page.waitForSelector("textarea");
    await page.type("textarea", "Describe esta imagen médica como un radiólogo experto.");

    const input = await page.$('input[type="text"]');
    await input.click({ clickCount: 3 });
    await input.type(image_url);

    const button = await page.$("button");
    await button.click();

    // Esperar respuesta del modelo
    await page.waitForSelector(".prose", { timeout: 30000 });
    const resultado = await page.$eval(".prose", el => el.innerText);

    await browser.close();

    res.json({ resultado });
  } catch (error) {
    console.error("❌ Error durante el scraping:", error.message);
    res.status(500).json({ error: "No se pudo obtener análisis desde DeepSeek" });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`🧠 OpenBot scrapeando DeepSeek en puerto ${PORT}`);
});
