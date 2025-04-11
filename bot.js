const express = require("express");
const cors = require("cors");
const puppeteer = require("puppeteer-core");

const app = express();
app.use(cors());
app.use(express.json());

app.get("/test", (req, res) => {
  res.json({ mensaje: "Servidor funcionando bien" });
});

app.post("/pregunta", async (req, res) => {
  const { pregunta } = req.body;

  if (!pregunta) {
    return res.status(400).json({ error: "Falta el campo 'pregunta'" });
  }

  let browser;
  try {
    const BROWSERLESS_TOKEN = process.env.BROWSERLESS_TOKEN || "S6lhR1nl9d2KZU5350378ac84676c05d9beb9cfda8";
    const wsUrl = `wss://chrome.browserless.io?token=${BROWSERLESS_TOKEN}`;

    console.log("🧠 Pregunta recibida:", pregunta);

    browser = await puppeteer.connect({ browserWSEndpoint: wsUrl });
    const page = await browser.newPage();
    await page.goto("https://openevidence.ai", {
      waitUntil: "networkidle2",
      timeout: 60000,
    });

    // Espera a que cargue bien el input
    const inputSelector = "input[placeholder='Ask a medical question...']";
    await page.waitForSelector(inputSelector, { timeout: 60000 });
    await page.type(inputSelector, pregunta);

    // Espera a que el botón de submit esté disponible
    const submitSelector = "button[type='submit']";
    await page.waitForSelector(submitSelector, { timeout: 10000 });
    await page.click(submitSelector);

    // Espera a que salga la respuesta completa
    await page.waitForSelector(".markdown", { timeout: 60000 });
    await page.waitForFunction(() => {
      const el = document.querySelector(".markdown");
      return el && el.innerText.length > 100;
    }, { timeout: 60000 });

    const respuesta = await page.$eval(".markdown", (el) => el.innerText);

    if (!respuesta) {
      throw new Error("No se pudo extraer la respuesta de OpenEvidence.");
    }

    console.log("✅ Respuesta obtenida:", respuesta.slice(0, 200));
    await page.close();
    res.json({ respuesta });

  } catch (error) {
    console.error("❌ Error rascándole a OpenEvidence:", error);
    if (browser) await browser.close();
    res.status(500).json({ error: "Algo salió mal, compa", detalle: error.message });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`🚀 OpenBot corriendo en el puerto ${PORT}`);
});
