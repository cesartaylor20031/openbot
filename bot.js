const express = require("express");
const puppeteer = require("puppeteer");
const app = express();
app.use(express.json());

app.post("/pregunta", async (req, res) => {
  const { texto } = req.body;
  if (!texto) {
    return res.status(400).json({ error: "Falta el campo 'texto'" });
  }

  try {
    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });

    const page = await browser.newPage();
    await page.goto("https://openevidence.ai", { waitUntil: "networkidle2" });

    await page.waitForSelector("textarea");
    await page.type("textarea", texto);
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

const PORT = process.env.PORT || 4000;   
app.listen(PORT, () => {
  console.log(`Ya jala el OpenBot en el puerto ${PORT}`);
});
