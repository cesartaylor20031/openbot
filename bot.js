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
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });

    await page.waitForSelector("input[placeholder='Ask a medical question...']", { timeout: 60000 });
    await page.type("input[placeholder='Ask a medical question...']", pregunta);
    await page.click("button[type='submit']");

    await page.waitForSelector(".markdown", { timeout: 30000 });
    const respuesta = await page.$eval(".markdown", (el) => el.innerText);

    if (!respuesta) {
      throw new Error("No se pudo extraer la respuesta de OpenEvidence.");
    }

    console.log("✅ Respuesta obtenida:", respuesta.slice(0, 200));
    await page.close(); // No cerramos el browser, solo la pestaña
    res.json({ respuesta });

  } catch (error) {
    console.error("❌ Error rascándole a OpenEvidence:", error);
    if (browser) await browser.close(); // Cierra si algo truena
    res.status(500).json({ error: "Algo salió mal, compa", detalle: error.message });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`🚀 OpenBot corriendo en el puerto ${PORT}`);
});
