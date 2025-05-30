const express = require("express");
const cors = require("cors");
const fs = require("fs");
const forge = require("node-forge");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

app.post("/firmar", async (req, res) => {
  const { texto } = req.body;
  if (!texto) return res.status(400).json({ error: "Falta el campo 'texto'" });

  try {
    const clavePem = fs.readFileSync("/fiel/clave.key.pem", "utf8");

    const privateKey = forge.pki.privateKeyFromPem(clavePem);
    const md = forge.md.sha256.create();
    md.update(texto, "utf8");

    const firma = forge.util.encode64(privateKey.sign(md));

    // 👇 Agrega fechas de emisión y vigencia
    const fechaEmision = new Date();
    const fechaVigencia = new Date(fechaEmision);
    fechaVigencia.setDate(fechaEmision.getDate() + 30);

    const formato = { year: "numeric", month: "long", day: "numeric" };
    const emisionStr = fechaEmision.toLocaleDateString("es-MX", formato);
    const vigenciaStr = fechaVigencia.toLocaleDateString("es-MX", formato);

    res.json({ firma, fecha_emision: emisionStr, vigencia: vigenciaStr });
  } catch (err) {
    console.error("💥 Error al firmar:", err.message);
    res.status(500).json({ error: "Error al firmar el texto" });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`✅ Bot firmador escuchando en puerto ${PORT}`));
