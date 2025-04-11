const express = require("express");
const cors = require("cors");
const puppeteer = require("puppeteer");
const axios = require("axios");

const app = express();
app.use(cors());
app.use(express.json());

const preguntasPorPaciente = {};
const respuestasPorPaciente = {};

// 🧪 Ruta de prueba sencilla
app.get("/test", (req, res) => {
  res.json({ mensaje: "Servidor funcionando bien" });
});

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
    await page.goto("https://openevidence.ai", { waitUntil: "domcontentloaded", timeout: 60000 });

    // Screenshot para debug
    const screenshotBase64 = await page.screenshot({
      fullPage: true,
      encoding: "base64"
    });
    console.log("SCREENSHOT_BASE64:", screenshotBase64);

    // Esperar el textarea con timeout extendido
    try {
      await page.waitForSelector("textarea", { timeout: 60000 });
    } catch (e) {
      throw new Error("No se encontró el textarea. Tal vez cambió el diseño de la página.");
    }

    await page.type("textarea", pregunta);
    await page.keyboard.press("Enter");

    await page.waitForSelector(".markdown", { timeout: 30000 });
    const respuesta = await page.$eval(".markdown", (el) => el.innerText);

    await browser.close();
    res.json({ respuesta });

  } catch (error) {
    console.error("Error rascándole a OpenEvidence:", error);
    res.status(500).json({ error: "Algo salió mal, compa", detalle: error.message });
  }
});

// ✅ Guardar preguntas personalizadas por ID (filtrado)
app.post("/guardar-preguntas", (req, res) => {
  const { idPaciente, preguntas } = req.body;

  if (!idPaciente || !preguntas) {
    return res.status(400).json({ error: "Faltan datos necesarios" });
  }

  const preguntasArray = (Array.isArray(preguntas) ? preguntas : preguntas.split(','))
    .map((p) => p.trim())
    .filter((p) => p.endsWith('?'));

  preguntasPorPaciente[idPaciente] = preguntasArray;

  res.json({ status: "OK", totalPreguntas: preguntasArray.length });
});

// ✅ Guardar respuestas y enviar webhook
app.post("/guardar-respuestas", async (req, res) => {
  const { idPaciente, respuestas } = req.body;

  if (!idPaciente || !respuestas) {
    return res.status(400).json({ error: "Faltan datos" });
  }

  respuestasPorPaciente[idPaciente] = respuestas;

  const combinado = {
    idPaciente,
    preguntas: preguntasPorPaciente[idPaciente] || [],
    respuestas
  };

  try {
    await axios.post(
      "https://n8n-railway-production-adfa.up.railway.app/webhook/generar-pregunta-open-evidence",
      combinado
    );
    res.json({ status: "OK", mensaje: "Enviado correctamente al webhook" });
  } catch (error) {
    console.error("Error webhook:", error);
    res.status(500).json({ error: "Error al webhook", detalle: error.message });
  }
});

// 🧾 Consultar preguntas
app.get("/preguntas/:id", (req, res) => {
  const preguntas = preguntasPorPaciente[req.params.id];
  res.json(preguntas || { error: "Sin preguntas" });
});

// 🧾 Consultar respuestas
app.get("/respuestas/:id", (req, res) => {
  const respuestas = respuestasPorPaciente[req.params.id];
  res.json(respuestas || { error: "Sin respuestas" });
});

// **Puerto corregido para estar en 4000, ajustado para funcionar en Render**
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Servidor activo en puerto ${PORT}`));
