const express = require("express");
const puppeteer = require("puppeteer");

const app = express();
app.use(express.json());

// 🧠 Almacenamiento en memoria para preguntas personalizadas
const preguntasPorPaciente = {};

// 🔌 Endpoint para rascarle a OpenEvidence
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

// ✅ Guardar preguntas personalizadas por ID
app.post("/guardar-preguntas", (req, res) => {
  const { idPaciente, preguntas } = req.body;

  if (!idPaciente || !preguntas) {
    return res.status(400).json({ error: "Faltan datos" });
  }

  preguntasPorPaciente[idPaciente] = preguntas;
  res.json({ status: "OK", mensaje: "Preguntas guardadas correctamente" });
});

// ✅ Consultar preguntas por ID (para formulario HTML)
app.get("/preguntas/:id", (req, res) => {
  const preguntas = preguntasPorPaciente[req.params.id];

  if (!preguntas) {
    return res.status(404).json({ error: "No se encontraron preguntas para este ID" });
  }

  res.json({ preguntas });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Servidor Taylenio activo en el puerto ${PORT}`);
});

