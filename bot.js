const express = require("express");
const cors = require("cors");
const puppeteer = require("puppeteer-core");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());

const PREGUNTAS_DIR = path.join(__dirname, "preguntas");

if (!fs.existsSync(PREGUNTAS_DIR)) {
  fs.mkdirSync(PREGUNTAS_DIR);
  console.log("📂 Carpeta 'preguntas' creada.");
}

app.get("/test", (req, res) => {
  res.json({ mensaje: "Servidor funcionando bien" });
});

app.post("/guardar-preguntas", (req, res) => {
  console.log("🧠 POST /guardar-preguntas - Body recibido:", req.body);

  const uniqueId = req.body.uniqueId || req.body.idPaciente;
  let preguntas = req.body.preguntas;

  if (typeof preguntas === "string") {
    preguntas = preguntas.split(",").map(p => p.trim());
  }

  if (!uniqueId || !Array.isArray(preguntas)) {
    return res.status(400).json({
      errorMessage: "Faltan datos",
      errorDescription: "Se requiere uniqueId y arreglo de preguntas",
    });
  }

  const filePath = path.join(PREGUNTAS_DIR, `${uniqueId}.json`);
  fs.writeFileSync(filePath, JSON.stringify({ preguntas }, null, 2));
  console.log(`📦 Preguntas guardadas en archivo: ${filePath}`);

  res.json({ mensaje: "Preguntas guardadas correctamente" });
});

app.get("/preguntas/:id", (req, res) => {
  const filePath = path.join(PREGUNTAS_DIR, `${req.params.id}.json`);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: "No se encontraron preguntas para este ID" });
  }

  const preguntas = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  res.json(preguntas);
});

app.post("/pregunta", async (req, res) => {
  const { pregunta } = req.body;

  if (!pregunta) {
    return res.status(400).json({ error: "Falta el campo 'pregunta'" });
  }

  let browser;
  try {
    const BROWSERLESS_TOKEN = process.env.BROWSERLESS_TOKEN || "TU_TOKEN";
    const wsUrl = `wss://chrome.browserless.io?token=${BROWSERLESS_TOKEN}`;

    browser = await puppeteer.connect({ browserWSEndpoint: wsUrl });
    const page = await browser.newPage();

    await page.goto("https://openevidence.ai", {
      waitUntil: "networkidle2",
      timeout: 60000,
    });

    const inputSelector = "textarea";
    await page.waitForSelector(inputSelector, { timeout: 60000 });
    await page.type(inputSelector, pregunta);
    await page.keyboard.press("Enter");

    await page.waitForSelector(".markdown", { timeout: 60000 });
    await page.waitForFunction(() => {
      const el = document.querySelector(".markdown");
      return el && el.innerText.length > 50;
    }, { timeout: 60000 });

    const respuesta = await page.$eval(".markdown", el => el.innerText);

    await page.close();
    res.json({ respuesta });

  } catch (error) {
    if (browser) await browser.close();
    res.status(500).json({ error: "Algo salió mal", detalle: error.message });
  }
});

app.post("/guardar-respuestas", async (req, res) => {
  const { idPaciente, respuestas } = req.body;

  if (!idPaciente || !Array.isArray(respuestas)) {
    return res.status(400).json({
      errorMessage: "Faltan datos",
      errorDescription: "Se requiere idPaciente y arreglo de respuestas",
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
