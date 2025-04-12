const express = require('express');
const bodyParser = require('body-parser');
const { Configuration, OpenAIApi } = require('openai');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());

app.post('/interrogatorio', async (req, res) => {
  const patientData = req.body.patientData;

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

    const output = response.data.choices[0].message.content;
    res.status(200).json({ resultado: output });

  } catch (err) {
    console.error('Error al generar interrogatorio:', err);
    res.status(500).json({ error: 'Error generando el interrogatorio clínico' });
  }
});

app.listen(port, () => {
  console.log(`OpenBot Interrogatorio escuchando en puerto ${port}`);
});
