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

    // Espera a que el <textarea> esté visible
    const inputSelector = "textarea";
    await page.waitForSelector(inputSelector, { visible: true, timeout: 60000 });
    await page.type(inputSelector, pregunta);

    // Forzamos el Enter como trigger de envío
    await page.keyboard.press("Enter");

    // Espera a que cargue algo real en el contenedor de respuesta
    const outputSelector = ".markdown";
    await page.waitForSelector(outputSelector, { timeout: 60000 });

    // Espera a que el texto tenga contenido (más robusto)
    await page.waitForFunction(
      (sel) => {
        const el = document.querySelector(sel);
        return el && el.innerText && el.innerText.length > 50;
      },
      { timeout: 60000 },
      outputSelector
    );

    const respuesta = await page.$eval(outputSelector, (el) => el.innerText);

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
