const express = require("express");
const cors = require("cors");
const puppeteer = require("puppeteer");
const axios = require("axios");

// Inicialización de la app Express (FALTABA ESTO)
const app = express();
app.use(cors());
app.use(express.json());

const preguntasPorPaciente = {};
const respuestasPorPaciente = {};

// 🧠 Scrapeo a OpenEvidence
app.post("/pregunta", async (req, res) => {
  const { pregunta } = req.body;

  if (!pregunta) {
    return res.status(400).json({ error: "Falta el campo 'pregunta'" });
  }

  try {
    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });

    const page = await browser.newPage();
    await page.goto("https://openevidence.ai", { waitUntil: "networkidle2" });

    await page.waitForSelector("textarea");
    await page.type("textarea", pregunta);
    await page.keyboard.press("Enter");

    await page.waitForSelector(".markdown", { timeout: 30000 });
    const respuesta = await page.$eval(".markdown", el => el.innerText);

    await browser.close();
    res.json({ respuesta });

  } catch (error) {
    console.error("Error rascándole a OpenEvidence:", error);
    res.status(500).json({ error: "Algo salió mal, compa" });
  }
});

// ✅ Guardar preguntas personalizadas por ID (filtrado)
app.post("/guardar-preguntas", (req, res) => {
  if (!req.body) {
    return res.status(400).json({ error: "Cuerpo de solicitud vacío" });
  }

  let { idPaciente, preguntas } = req.body;

  if (!idPaciente) {
    return res.status(400).json({ error: "Se requiere idPaciente" });
  }

  if (!preguntas) {
    return res.status(400).json({ error: "Se requiere el campo preguntas" });
  }

  idPaciente = idPaciente.toString().trim();
  
  let preguntasArray = [];
  
  if (Array.isArray(preguntas)) {
    preguntasArray = preguntas.map(p => p.toString().trim());
  } else if (typeof preguntas === 'string') {
    preguntasArray = preguntas
      .split(',')
      .map(p => p.trim())
      .filter(p => p);
  }

  preguntasArray = preguntasArray.filter(p => p.endsWith('?'));

  console.log("🔥 LO QUE RECIBO EN GUARDAR-PREGUNTAS (FILTRADO):", { 
    idPaciente, 
    preguntas: preguntasArray 
  });

  try {
    preguntasPorPaciente[idPaciente] = preguntasArray;
    res.json({ 
      status: "OK", 
      mensaje: "Preguntas guardadas correctamente",
      totalPreguntas: preguntasArray.length
    });
  } catch (error) {
    console.error("Error al guardar preguntas:", error);
    res.status(500).json({ error: "Error interno al guardar preguntas" });
  }
});

// ✅ Guardar respuestas de seguimiento por ID y enviar al webhook
app.post("/guardar-respuestas", async (req, res) => {
  const { idPaciente, respuestas } = req.body;

  if (!idPaciente || !respuestas) {
    return res.status(400).json({ error: "Faltan datos" });
  }

  respuestasPorPaciente[idPaciente] = respuestas;

  const preguntas = preguntasPorPaciente[idPaciente] || [];

  const combinado = {
    idPaciente,
    preguntas,
    respuestas
  };

  console.log("🚀 LO QUE SE ENVÍA AL WEBHOOK:", combinado);

  try {
    await axios.post("https://n8n-railway-production-adfa.up.railway.app/webhook/generar-pregunta-open-evidence", combinado);
    res.json({ status: "OK", mensaje: "Respuestas guardadas y datos enviados al webhook" });
  } catch (error) {
    res.status(500).json({ error: "Error al enviar al webhook", detalle: error.message });
  }
});

// 🧾 Consultar preguntas por ID
app.get("/preguntas/:id", (req, res) => {
  const preguntas = preguntasPorPaciente[req.params.id];

  if (!preguntas) {
    return res.status(404).json({ error: "No se encontraron preguntas para este ID" });
  }

  res.json({ preguntas });
});

// 🧾 Consultar respuestas por ID
app.get("/respuestas/:id", (req, res) => {
  const respuestas = respuestasPorPaciente[req.params.id];

  if (!respuestas) {
    return res.status(404).json({ error: "No se encontraron respuestas para este ID" });
  }

  res.json({ respuestas });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Servidor Taylenio activo en el puerto ${PORT}`);
});
