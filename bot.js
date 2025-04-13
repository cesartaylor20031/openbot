const express = require("express");
const cors = require("cors");
const puppeteer = require("puppeteer-core");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());

const PREGUNTAS_DIR = path.join(__dirname, "preguntas");
if (!fs.existsSync(PREGUNTAS_DIR)) fs.mkdirSync(PREGUNTAS_DIR);

// 🔁 RAM temporal
const cacheRAM = {};

app.get("/test", (req, res) => {
  res.json({ mensaje: "Servidor funcionando bien" });
});

// Guardar preguntas
app.post("/guardar-preguntas", (req, res) => {
  const uniqueId = req.body.uniqueId || req.body.idPaciente;
  let preguntas = req.body.preguntas;

  if (!uniqueId || !preguntas) {
    return res.status(400).json({ error: "Faltan datos" });
  }

  if (typeof preguntas === "string") {
    preguntas = preguntas.split(",").map(p => p.trim());
  }

  // RAM
  cacheRAM[uniqueId] = preguntas;

  // Disco
  const filePath = path.join(PREGUNTAS_DIR, `${uniqueId}.json`);
  try {
    fs.writeFileSync(filePath, JSON.stringify({ preguntas }, null, 2));
    console.log(`📦 Preguntas guardadas en archivo: ${filePath}`);
  } catch (err) {
    console.error("❌ Error guardando archivo:", err.message);
  }

  res.json({ mensaje: "Preguntas guardadas correctamente" });
});

// Consultar preguntas
app.get("/preguntas/:id", (req, res) => {
  const id = req.params.id;
  const filePath = path.join(PREGUNTAS_DIR, `${id}.json`);

  // Intenta leer del disco
  if (fs.existsSync(filePath)) {
    try {
      const preguntas = JSON.parse(fs.readFileSync(filePath, "utf-8"));
      return res.json(preguntas);
    } catch (err) {
      console.error("❌ Error leyendo JSON:", err.message);
    }
  }

  // Si no, usa RAM
  if (cacheRAM[id]) {
    return res.json({ preguntas: cacheRAM[id] });
  }

  res.status(404).json({ error: "No se encontraron preguntas para este ID" });
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

    const respuesta = await page.$eval(".markdown", (el) => el.innerText);
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
