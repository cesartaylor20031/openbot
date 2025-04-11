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
    console.log("🧩 Conectando a Browserless...");

    browser = await puppeteer.connect({ browserWSEndpoint: wsUrl });
    const page = await browser.newPage();

    console.log("🌐 Abriendo OpenEvidence...");
    await page.goto("https://openevidence.ai", {
      waitUntil: "networkidle2",
      timeout: 60000,
    });

    const inputSelector = "textarea";
    console.log("⌛ Esperando el textarea...");
    await page.waitForSelector(inputSelector, { timeout: 60000 });

    console.log("⌨️ Escribiendo la pregunta...");
    await page.type(inputSelector, pregunta);
    await page.keyboard.press("Enter");

    console.log("📡 Esperando respuesta...");
    await page.waitForSelector(".markdown", { timeout: 60000 });

    console.log("🧪 Esperando contenido significativo...");
    await page.waitForFunction(() => {
      const el = document.querySelector(".markdown");
      return el && el.innerText.length > 50;
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

// NUEVO ENDPOINT PARA GUARDAR RESPUESTAS DEL FORMULARIO 2
app.post("/guardar-respuestas", async (req, res) => {
  const { idPaciente, respuestas } = req.body;

  if (!idPaciente || !respuestas) {
    return res.status(400).json({
      errorMessage: "Faltan datos",
      errorDescription: "Se requiere idPaciente y respuestas",
    });
  }

  console.log("📥 Respuestas recibidas del paciente:", idPaciente);
  console.log(respuestas);

  res.json({ mensaje: "Respuestas guardadas correctamente" });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`🚀 OpenBot corriendo en el puerto ${PORT}`);
});
