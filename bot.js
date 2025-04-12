const express = require("express");
const cors = require("cors");
const puppeteer = require("puppeteer-core");

const app = express();
app.use(cors());
app.use(express.json());

// 🧠 MAPA EN MEMORIA
const preguntasPorPaciente = {}; // 🔁 Volátil (RAM)

// 🔍 Verificación rápida
app.get("/test", (req, res) => {
  res.json({ mensaje: "Servidor funcionando bien" });
});

// 🔽 GUARDAR PREGUNTAS CON PARCHE DE TIPO
app.post("/guardar-preguntas", (req, res) => {
  console.log("🧠 POST /guardar-preguntas - Body recibido:", req.body);

  const uniqueId = req.body.uniqueId || req.body.idPaciente;
  let preguntas = req.body.preguntas;

  // 💉 Parche: convertir string a array si es necesario
  if (typeof preguntas === "string") {
    preguntas = preguntas.split(",").map(p => p.trim());
  }

  console.log("🔎 uniqueId (o idPaciente):", uniqueId);
  console.log("🧾 preguntas:", preguntas);

  if (!uniqueId || !Array.isArray(preguntas)) {
    return res.status(400).json({
      errorMessage: "Faltan datos",
      errorDescription: "Se requiere uniqueId y arreglo de preguntas",
    });
  }

  preguntasPorPaciente[uniqueId] = preguntas;
  console.log(`📦 Preguntas guardadas para ID: ${uniqueId}`);
  res.json({ mensaje: "Preguntas guardadas correctamente" });
});

// 🔽 CONSULTAR PREGUNTAS
app.get("/preguntas/:id", (req, res) => {
  const id = req.params.id;
  const preguntas = preguntasPorPaciente[id];

  if (!preguntas) {
    return res.status(404).json({ error: "No se encontraron preguntas para este ID" });
  }

  res.json({ preguntas });
});

// 🧪 CONSULTA EN OPENEVIDENCE VIA BROWSERLESS
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
    await page.waitForSelector(inputSelector, { timeout: 60000 });

    await page.type(inputSelector, pregunta);
    await page.keyboard.press("Enter");

    await page.waitForSelector(".markdown", { timeout: 60000 });
    await page.waitForFunction(() => {
      const el = document.querySelector(".markdown");
      return el && el.innerText.length > 50;
    }, { timeout: 60000 });

    const respuesta = await page.$eval(".markdown", (el) => el.innerText);

    if (!respuesta) {
      throw new Error("No se pudo extraer la respuesta de OpenEvidence.");
    }

    await page.close();
    console.log("✅ Respuesta obtenida:", respuesta.slice(0, 200));
    res.json({ respuesta });

  } catch (error) {
    console.error("❌ Error rascándole a OpenEvidence:", error);
    if (browser) await browser.close();
    res.status(500).json({ error: "Algo salió mal, compa", detalle: error.message });
  }
});

// 📥 GUARDAR RESPUESTAS DEL FORMULARIO 2
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
