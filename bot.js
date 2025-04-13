const express = require("express");
const cors = require("cors");
const puppeteer = require("puppeteer-core");

const app = express();
app.use(cors());
app.use(express.json());

// 🧠 Almacenamiento volátil en RAM
const preguntasPorPaciente = {};

// 🔍 Prueba de vida
app.get("/test", (req, res) => {
  res.json({ mensaje: "Servidor funcionando bien" });
});

// 🧠 Guardar preguntas en RAM
app.post("/guardar-preguntas", (req, res) => {
  console.log("📩 POST /guardar-preguntas recibido:", req.body);

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

  preguntasPorPaciente[uniqueId] = preguntas;
  console.log(`📦 Preguntas guardadas en RAM para ID: ${uniqueId}`);
  res.json({ mensaje: "Preguntas guardadas correctamente" });
});

// 🔎 Consultar preguntas por ID
app.get("/preguntas/:id", (req, res) => {
  const preguntas = preguntasPorPaciente[req.params.id];
  if (!preguntas) {
    return res.status(404).json({ error: "No se encontraron preguntas para este ID" });
  }
  res.json({ preguntas });
});

// 🧪 Consultar en OpenEvidence con Browserless
app.post("/pregunta", async (req, res) => {
  const { pregunta } = req.body;
  if (!pregunta) {
    return res.status(400).json({ error: "Falta el campo 'pregunta'" });
  }

  let browser;
  try {
    const BROWSERLESS_TOKEN = process.env.BROWSERLESS_TOKEN || "S6lhR1nl9d2KZU5350378ac84676c05d9beb9cfda8";
    const wsUrl = `wss://chrome.browserless.io?token=${BROWSERLESS_TOKEN}`;

    browser = await puppeteer.connect({ browserWSEndpoint: wsUrl });
    const page = await browser.newPage();
    await page.goto("https://openevidence.ai", {
      waitUntil: "networkidle2",
      timeout: 60000,
    });

    await page.type("textarea", pregunta);
    await page.keyboard.press("Enter");

    await page.waitForSelector(".markdown", { timeout: 60000 });
    await page.waitForFunction(() => {
      const el = document.querySelector(".markdown");
      return el && el.innerText.length > 50;
    }, { timeout: 60000 });

    const respuesta = await page.$eval(".markdown", el => el.innerText);
    if (!respuesta) throw new Error("No se pudo extraer la respuesta");

    await page.close();
    res.json({ respuesta });
  } catch (err) {
    if (browser) await browser.close();
    res.status(500).json({ error: "Fallo al rascar OpenEvidence", detalle: err.message });
  }
});

// 📥 Guardar respuestas del formulario 2
app.post("/guardar-respuestas", (req, res) => {
  const { idPaciente, respuestas } = req.body;
  if (!idPaciente || !Array.isArray(respuestas)) {
    return res.status(400).json({
      errorMessage: "Faltan datos",
      errorDescription: "Se requiere idPaciente y arreglo de respuestas",
    });
  }

  console.log("📥 Respuestas del paciente:", idPaciente);
  console.log(respuestas);

  res.json({ mensaje: "Respuestas guardadas correctamente" });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`🚀 OpenBot corriendo en el puerto ${PORT}`);
});
