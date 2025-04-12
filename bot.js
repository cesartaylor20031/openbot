const express = require('express');
const bodyParser = require('body-parser');
const { Configuration, OpenAIApi } = require('openai');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// 🧠 Mapa volátil en RAM para almacenar preguntas
const preguntasPorPaciente = {};

app.use(bodyParser.json());

app.post('/interrogatorio', async (req, res) => {
  const patientData = req.body.patientData || req.body;

  if (!patientData || !patientData.personalInformation) {
    return res.status(400).json({ error: 'Datos del paciente incompletos o ausentes' });
  }

  const { personalInformation, medicalHistory, currentCondition } = patientData;
  const nombre = personalInformation.nombre;
  const correo = personalInformation.correo;
  const whatsapp = personalInformation.whatsapp;
  const edadSexoOcupacion = personalInformation.edad_sexo_ocupacion;

  const padecimiento = currentCondition.padecimiento;
  const extra = currentCondition.extra;
  const heredofamiliares = medicalHistory.heredofamiliares;
  const patologicos = medicalHistory.patologicos;
  const estilo_vida = medicalHistory.estilo_vida;

  const prompt = `
Eres un médico clínico experto. Con base en los siguientes datos, elabora un conjunto de preguntas clínicas personalizadas y detalladas que permitan obtener información semiológica clave para el diagnóstico. Solo responde en formato JSON:

{
  "nombre": "${nombre}",
  "correo": "${correo}",
  "whatsapp": "${whatsapp}",
  "edad_sexo_ocupacion": "${edadSexoOcupacion}",
  "preguntas": ["Pregunta 1", "Pregunta 2", ...]
}

### Datos del paciente:
Nombre: ${nombre}
Edad/Sexo/Ocupación: ${edadSexoOcupacion}
Padecimiento actual: ${padecimiento}
Detalles adicionales: ${extra}
Historial familiar: ${heredofamiliares}
Historial patológico: ${patologicos}
Estilo de vida: ${estilo_vida}
  `;

  try {
    const configuration = new Configuration({ apiKey: process.env.OPENAI_API_KEY });
    const openai = new OpenAIApi(configuration);

    const response = await openai.createChatCompletion({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: 'Eres un médico experto en interrogatorio clínico.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7
    });

    const outputRaw = response.data.choices[0].message.content;

    // 🔍 Convertimos texto a objeto real de JS
    let output;
    try {
      output = JSON.parse(outputRaw);
    } catch (err) {
      console.error("❌ Error al parsear JSON generado por GPT:", err);
      return res.status(500).json({ error: 'Respuesta de IA mal formada' });
    }

    // 🧠 Obtener el ID único del paciente para guardar preguntas
    const uniqueId = req.body.uniqueId || req.body.idPaciente || 'desconocido';

    // ✅ Guardar preguntas en memoria
    preguntasPorPaciente[uniqueId] = output.preguntas;

    // 📦 Confirmar guardado y enviar respuesta al cliente
    res.status(200).json({
      mensaje: 'Preguntas generadas y guardadas correctamente',
      id: uniqueId,
      preguntas: output.preguntas
    });

  } catch (err) {
    console.error('Error al generar interrogatorio:', err);
    res.status(500).json({ error: 'Error generando el interrogatorio clínico' });
  }
});

// 🧪 Para pruebas: ver preguntas por ID
app.get('/preguntas/:id', (req, res) => {
  const id = req.params.id;
  const preguntas = preguntasPorPaciente[id];
  if (!preguntas) {
    return res.status(404).json({ error: 'No se encontraron preguntas para este ID' });
  }
  res.status(200).json({ id, preguntas });
});

app.listen(port, () => {
  console.log(`OpenBot Interrogatorio escuchando en puerto ${port}`);
});
