app.post("/vision-deepseek", async (req, res) => {
  const { imageUrl } = req.body;

  if (!imageUrl) {
    return res.status(400).json({ error: "Falta el campo 'imageUrl'" });
  }

  const prompt = `Eres un médico radiólogo experto. Por favor analiza la imagen disponible en este enlace: ${imageUrl} y proporciona un análisis detallado de los posibles hallazgos clínicos.`;

  let browser;
  try {
    const BROWSERLESS_TOKEN = process.env.BROWSERLESS_TOKEN || "AQUÍ_TU_TOKEN";
    const wsUrl = `wss://chrome.browserless.io?token=${BROWSERLESS_TOKEN}`;

    browser = await puppeteer.connect({ browserWSEndpoint: wsUrl });
    const page = await browser.newPage();
    await page.goto("https://chat.deepseek.com", { waitUntil: "networkidle2", timeout: 60000 });

    // Esperar textarea y pegar prompt
    await page.waitForSelector("textarea", { timeout: 60000 });
    await page.type("textarea", prompt);
    await page.keyboard.press("Enter");

    // Esperar respuesta
    await page.waitForSelector(".markdown", { timeout: 60000 });
    await page.waitForFunction(() => {
      const el = document.querySelector(".markdown");
      return el && el.innerText.length > 50;
    }, { timeout: 60000 });

    const respuesta = await page.$eval(".markdown", el => el.innerText);
    await browser.close();

    res.json({ respuesta });

  } catch (error) {
    if (browser) await browser.close();
    res.status(500).json({ error: "Error al consultar DeepSeek", detalle: error.message });
  }
});
