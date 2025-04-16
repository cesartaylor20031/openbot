const express = require("express");
const cors = require("cors");
const OpenAI = require("openai");
require("dotenv").config();

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

// ✅ CONFIGURACIÓN CORRECTA DE OPENAI (sin Configuration)
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// 💉 NUEVO ENDPOINT PARA ANALIZAR TEXTO CLÍNICO
app.post("/analizar", async (req, res) => {
  const { prompt } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: "Falta el campo 'prompt'" });
  }

  try {
    const respuesta = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "user",
          content: `Analiza este texto clínico, identifica parámetros alterados y sus posibles causas:\n\n${prompt}`,
        },
      ],
    });

    const resultado = respuesta.choices[0].message.content;
    res.json({ resultado });
  } catch (error) {
    console.error("❌ Error al llamar a OpenAI:", error.message);
    res.status(500).json({ error: "Error interno al analizar el texto clínico" });
  }
});

// 🔬 ENDPOINT OPCIONAL PARA ANALIZAR IMAGEN POR URL (si se activa visión)
app.post("/analizar-imagen", async (req, res) => {
  const { imageUrl, instruccion } = req.body;

  if (!imageUrl) {
    return res.status(400).json({ error: "Falta la URL de la imagen" });
  }

  try {
    const respuesta = await openai.chat.completions.create({
      model: "gpt-4-vision-preview", // cambiar a deepseek si no tienes acceso
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: instruccion || "Analiza esta imagen médica como radiólogo experto." },
            { type: "image_url", image_url: { url: imageUrl } }
          ]
        }
      ]
    });

    const resultado = respuesta.choices[0].message.content;
    res.json({ resultado });
  } catch (error) {
    console.error("❌ Error al analizar imagen:", error.message);
    res.status(500).json({ error: "Error al analizar imagen desde la URL" });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`🚀 OpenBot corriendo en RAM en el puerto ${PORT}`);
});
