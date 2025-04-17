const express = require("express");
const cors = require("cors");
const forge = require("node-forge");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

app.post("/firmar", async (req, res) => {
  const { texto } = req.body;
  if (!texto) return res.status(400).json({ error: "Falta el campo 'texto'" });

  try {
    // Leer desde las variables de entorno en base64
    const keyBase64 = process.env.FIEL_KEY_BASE64;
    const cerBase64 = process.env.FIEL_CER_BASE64;
    const password = process.env.FIEL_PASS;

    if (!keyBase64 || !cerBase64 || !password) {
      return res.status(500).json({ error: "Variables de entorno faltantes" });
    }

    // Decodificar base64
    const keyPem = Buffer.from(keyBase64, "base64").toString("utf8");

    const privateKey = forge.pki.decryptRsaPrivateKey(keyPem, password);
    if (!privateKey) return res.status(403).json({ error: "Clave privada inválida" });

    const md = forge.md.sha256.create();
    md.update(texto, "utf8");
    const firma = forge.util.encode64(privateKey.sign(md));

    res.json({ firma });
  } catch (err) {
    console.error("Error al firmar:", err.message);
    res.status(500).json({ error: "Error al firmar el texto" });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log("✅ Bot firmador escuchando en puerto", PORT));
