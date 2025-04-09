// ✅ Guardar preguntas personalizadas por ID (filtrado) - VERSIÓN CORREGIDA
app.post("/guardar-preguntas", (req, res) => {
  // Validación más robusta del body
  if (!req.body) {
    return res.status(400).json({ error: "Cuerpo de solicitud vacío" });
  }

  let { idPaciente, preguntas } = req.body;

  // Validación de campos requeridos
  if (!idPaciente) {
    return res.status(400).json({ error: "Se requiere idPaciente" });
  }

  if (!preguntas) {
    return res.status(400).json({ error: "Se requiere el campo preguntas" });
  }

  // Normalización de datos
  idPaciente = idPaciente.toString().trim();

  // Manejo de preguntas tanto para array como string
  let preguntasArray = [];
  
  if (Array.isArray(preguntas)) {
    preguntasArray = preguntas.map(p => p.toString().trim());
  } else if (typeof preguntas === 'string') {
    // Soporte para formato string separado por comas
    preguntasArray = preguntas
      .split(',')
      .map(p => p.trim())
      .filter(p => p);
  }

  // Filtramos solo preguntas válidas (que terminen en ?)
  preguntasArray = preguntasArray.filter(p => p.endsWith('?'));

  console.log("🔥 LO QUE RECIBO EN GUARDAR-PREGUNTAS (FILTRADO):", { 
    idPaciente, 
    preguntas: preguntasArray 
  });

  // Guardado seguro
  try {
    preguntasPorPaciente[idPaciente] = preguntasArray;
    res.json({ 
      status: "OK", 
      mensaje: "Preguntas guardadas correctamente",
      totalPreguntas: preguntasArray.length
    });
  } catch (error) {
    console.error("Error al guardar preguntas:", error);
    res.status(500).json({ error: "Error interno al guardar preguntas" });
  }
});
