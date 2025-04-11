const express = require("express");
const cors = require("cors");
const puppeteer = require("puppeteer-core");
const axios = require("axios");

const app = express();
app.use(cors());
app.use(express.json());

const preguntasPorPaciente = {};
const respuestasPorPaciente = {};

app.get("/test", (req, res) => {
  res.json({ mensaje: "Servidor funcionando bien" });
});

app.post("/pregunta", async (req, res) => {
  const { pregunta } = req.body;

  if (!pregunta) {
    return res.status(400).json({ error: "Falta el campo 'pregunta'" });
  }

  try {
    const browser = await puppeteer.connect({
      browserWSEndpoint: `wss://chrome.browserless.io?token=S6lhR1nl9d2KZU5350378ac84676c05d9beb9cfda8`,
    });

    const page = await browser.newPage();
    await page.goto("https://openevidence.ai", {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });

    await page.waitForSelector("input[placeholder='Ask a medical question...']", { timeout: 60000 });
    await page.type("input[placeholder='Ask a medical question...']", pregunta);
    await page.click("button[type='submit']");

    await page.waitForSelector(".markdown", { timeout: 30000 });
    const respuesta = await page.$eval(".markdown", (el) => el.innerText);

    await browser.close();
    res.json({ respuesta });

  } catch (error) {
    console.error("Error rascándole a OpenEvidence con Browserless:", error);
    res.status(500).json({ error: "Algo salió mal, compa", detalle: error.message });
  }
});
