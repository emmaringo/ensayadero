
const API_URL = "http://localhost:3000/api";

// Procesar las respuestas del servidor
async function procesarRespuesta(respuesta) {
  const datos =
    respuesta.status === 204
      ? null
      : await respuesta.json();

  if (!respuesta.ok) {
    const error = new Error(
      datos?.error || "Ocurrió un error en la solicitud"
    );

    error.status = respuesta.status;

    throw error;
  }

  return datos;
}

// Obtener instrumentos
export async function listarInstrumentos() {
  const respuesta = await fetch(
    `${API_URL}/instrumentos`
  );

  return procesarRespuesta(respuesta);
}

// Obtener reservas, opcionalmente filtradas por instrumento
export async function listarReservas(instrumentoId) {
  const parametros = instrumentoId
    ? `?instrumentoId=${instrumentoId}`
    : "";

  const respuesta = await fetch(
    `${API_URL}/reservas${parametros}`
  );

  return procesarRespuesta(respuesta);
}

// Crear una reserva
export async function crearReserva(datosReserva) {
  const respuesta = await fetch(
    `${API_URL}/reservas`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(datosReserva),
    }
  );

  return procesarRespuesta(respuesta);
}

// Eliminar una reserva
export async function eliminarReserva(id) {
  const respuesta = await fetch(
    `${API_URL}/reservas/${id}`,
    {
      method: "DELETE",
    }
  );

  return procesarRespuesta(respuesta);
}
