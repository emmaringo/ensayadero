import express from "express";
import cors from "cors";
import { prisma } from "./db.js";
import { buscarConflicto } from "./reservas.js";

// Crear la aplicación de Express
const app = express();

// Permitir recibir datos en formato JSON
app.use(express.json());
app.use(cors({
    origin: "http://localhost:5173"
}));

// Crear una ruta para comprobar el funcionamiento
app.get("/api/salud", (req, res) => {
    res.json({ estado: "ok" });
});

app.get("/api/instrumentos", async (req, res) => {
  try {
    const instrumentos = await prisma.instrumento.findMany();

    res.json(instrumentos);
  } catch (error) {
    console.error("Error al consultar instrumentos:", error);
    res.status(500).json({ error: "Error al consultar instrumentos" });
  }
});

app.get("/api/reservas", async (req, res) => {
  try {
    const { instrumentoId } = req.query;

    if (
      instrumentoId !== undefined &&
      (!/^\d+$/.test(instrumentoId) || Number(instrumentoId) <= 0)
    ) {
      return res.status(400).json({
        error: "El instrumentoId no es válido"
      });
    }

    const reservas = await prisma.reserva.findMany({
      where: instrumentoId
        ? { instrumentoId: Number(instrumentoId) }
        : {},
      include: {
        instrumento: true
      },
      orderBy: {
        inicio: "asc"
      }
    });

    return res.json(reservas);
  } catch (error) {
    console.error("Error al consultar las reservas:", error);

    return res.status(500).json({
      error: "Error interno al consultar las reservas"
    });
  }
});

app.get("/api/reservas/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        error: "El ID de la reserva no es válido"
      });
    }

    const reserva = await prisma.reserva.findUnique({
      where: { id },
      include: {
        instrumento: true
      }
    });

    if (!reserva) {
      return res.status(404).json({
        error: "La reserva no existe"
      });
    }

    return res.json(reserva);
  } catch (error) {
    console.error("Error al consultar la reserva:", error);

    return res.status(500).json({
      error: "Error interno al consultar la reserva"
    });
  }
});


app.post("/api/reservas", async (req, res) => {
  try {
    const { solicitante, instrumentoId, inicio, fin } = req.body;

    // 1. Validar los datos recibidos
    if (
      typeof solicitante !== "string" ||
      !solicitante.trim() ||
      !Number.isInteger(Number(instrumentoId)) ||
      Number(instrumentoId) <= 0 ||
      !inicio ||
      !fin
    ) {
      return res.status(400).json({
        error: "Todos los campos son obligatorios y deben ser válidos"
      });
    }

    // 2. Validar las fechas
    const fechaInicio = new Date(inicio);
    const fechaFin = new Date(fin);

    if (
      isNaN(fechaInicio.getTime()) ||
      isNaN(fechaFin.getTime()) ||
      fechaInicio >= fechaFin
    ) {
      return res.status(400).json({
        error: "Las fechas no son válidas o el inicio debe ser anterior al fin"
      });
    }

    // 3. Comprobar que el instrumento exista
    const instrumento = await prisma.instrumento.findUnique({
      where: { id: Number(instrumentoId) }
    });

    if (!instrumento) {
      return res.status(400).json({
        error: "El instrumento no existe"
      });
    }

    // 4. Ejecutar la transacción
    const resultado = await prisma.$transaction(async (tx) => {

      const conflicto = await buscarConflicto(
        tx,
        instrumentoId,
        fechaInicio,
        fechaFin
      );

      if (conflicto) {
        return { conflicto };
      }

      const reserva = await tx.reserva.create({
        data: {
          solicitante: solicitante.trim(),
          instrumentoId: Number(instrumentoId),
          inicio: fechaInicio,
          fin: fechaFin
        },
        include: {
          instrumento: true
        }
      });

      return { reserva };
    });

    // 5. Responder según el resultado
    if (resultado.conflicto) {
      return res.status(409).json({
        error: "Horario ocupado",
        conflicto: resultado.conflicto
      });
    }

    return res.status(201).json(resultado.reserva);

  } catch (error) {
    console.error("Error al crear la reserva:", error);

    return res.status(500).json({
      error: "Error interno al crear la reserva"
    });
  }
});


app.delete("/api/reservas/:id", async (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({
      error: "El ID de la reserva no es válido"
    });
  }

  try {
    await prisma.reserva.delete({
      where: { id }
    });

    return res.status(204).send();
  } catch (error) {
    if (error.code === "P2025") {
      return res.status(404).json({
        error: "La reserva no existe"
      });
    }

    console.error("Error al eliminar la reserva:", error);

    return res.status(500).json({
      error: "Error interno al eliminar la reserva"
    });
  }
});


app.put("/api/reservas/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { solicitante, instrumentoId, inicio, fin } = req.body;

    // 1. Validar el ID
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({
        error: "El ID de la reserva no es válido"
      });
    }

    // 2. Comprobar que la reserva exista
    const reservaActual = await prisma.reserva.findUnique({
      where: { id }
    });

    if (!reservaActual) {
      return res.status(404).json({
        error: "La reserva no existe"
      });
    }

    // 3. Validar los datos recibidos
    if (
      typeof solicitante !== "string" ||
      !solicitante.trim() ||
      !Number.isInteger(Number(instrumentoId)) ||
      Number(instrumentoId) <= 0 ||
      !inicio ||
      !fin
    ) {
      return res.status(400).json({
        error: "Todos los campos son obligatorios y deben ser válidos"
      });
    }

    // 4. Validar las fechas
    const fechaInicio = new Date(inicio);
    const fechaFin = new Date(fin);

    if (
      isNaN(fechaInicio.getTime()) ||
      isNaN(fechaFin.getTime()) ||
      fechaInicio >= fechaFin
    ) {
      return res.status(400).json({
        error: "Las fechas no son válidas o el inicio debe ser anterior al fin"
      });
    }

    // 5. Comprobar que el instrumento exista
    const instrumento = await prisma.instrumento.findUnique({
      where: { id: Number(instrumentoId) }
    });

    if (!instrumento) {
      return res.status(400).json({
        error: "El instrumento no existe"
      });
    }

    // 6. Ejecutar la transacción
    const resultado = await prisma.$transaction(async (tx) => {

      const conflicto = await buscarConflicto(
        tx,
        instrumentoId,
        fechaInicio,
        fechaFin,
        id
      );

      if (conflicto) {
        return { conflicto };
      }

      const reserva = await tx.reserva.update({
        where: { id },
        data: {
          solicitante: solicitante.trim(),
          instrumentoId: Number(instrumentoId),
          inicio: fechaInicio,
          fin: fechaFin
        },
        include: {
          instrumento: true
        }
      });

      return { reserva };
    });

    // 7. Responder según el resultado
    if (resultado.conflicto) {
      return res.status(409).json({
        error: "Horario ocupado",
        conflicto: resultado.conflicto
      });
    }

    return res.json(resultado.reserva);

  } catch (error) {
    console.error("Error al actualizar la reserva:", error);

    return res.status(500).json({
      error: "Error interno al actualizar la reserva"
    });
  }
});


// Definir el puerto del servidor
const PORT = 3000;

// Encender el servidor
app.listen(PORT, () => {
    console.log(`API en http://localhost:${PORT}`);
});
