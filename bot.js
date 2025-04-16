 const express = require("express");
const cors = require("cors");
const puppeteer = require("puppeteer-core");
const { Configuration, OpenAIApi } = require("openai"); // 🧠 PATCH REAL

const app = express();
app.use(cors());
app.use(express.json());

// 🧠 MAPA EN MEMORIA VOLÁTIL
const preguntasPorPaciente = {}; // 🔁 RAM temporal

// 🔍 Verificación rápida
app.get("/test", (req, res) => {
  res.json({ mensaje: "Servidor funcionando bien" });
});

// 🔽 GUARDAR PREGUNTAS EN RAM
app.post("/guardar-preguntas", (req, res) => {
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

// 🔽 CONSULTAR PREGUNTAS DESDE RAM
app.get("/preguntas/:id", (req, res) => {
  const preguntas = preguntasPorPaciente[req.params.id];
  if (!preguntas) {
    return res.status(404).json({ error: "No se encontraron preguntas para este ID" });
  }
  res.json({ preguntas });
});

// 🧪 CONSULTA A OPENEVIDENCE (NO TOCAR)
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

    await page.waitForSelector("textarea", { timeout: 60000 });
    await page.type("textarea", pregunta);
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
    res.status(500).json({ error: "Error al consultar OpenEvidence", detalle: error.message });
  }
});

// 📥 GUARDAR RESPUESTAS (NO TOCAR)
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
  res.json({ mensaje: "Respuestas guardadas correctamente (RAM mode)" });
});

// 🧠 GPT ANÁLISIS CLÍNICO DE TEXTO
const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});

const openai = new OpenAIApi(configuration);

app.post("/analizar", async (req, res) => {
  const { prompt } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: "Falta el campo 'prompt'" });
  }

  try {
    const respuesta = await openai.createChatCompletion({
      model: "gpt-4",
      messages: [
        {
          role: "user",
          content: `Analiza este texto clínico, identifica parámetros alterados y sus posibles causas:\n\n${prompt}`,
        },
      ],
    });

    res.json({ respuesta: respuesta.data.choices[0].message.content });
  } catch (error) {
    console.error("❌ Error al analizar con GPT:", error.message);
    res.status(500).json({ error: "Error al procesar el análisis clínico", detalle: error.message });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`🚀 OpenBot corriendo en RAM en el puerto ${PORT}`);
});
