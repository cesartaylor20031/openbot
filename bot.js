
const express = require("express");
const cors = require("cors");
const fs = require("fs");
const crypto = require("crypto");
const forge = require("node-forge");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

// Ruta para firmar texto
app.post("/firmar", async (req, res) => {
  const { texto } = req.body;
  if (!texto) return res.status(400).json({ error: "Falta el campo 'texto'" });

  try {
    const clavePrivada = fs.readFileSync("./fiel/clave.key", "binary");
    const cert = fs.readFileSync("./fiel/cert.cer", "binary");

    const password = process.env.FIEL_PASS;
    const privateKey = forge.pki.decryptRsaPrivateKey(clavePrivada, password);
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
