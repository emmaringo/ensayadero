
import { useState, useEffect } from "react";
import { Calendar, dateFnsLocalizer } from "react-big-calendar";
import {
  format,
  parse,
  startOfWeek,
  getDay,
} from "date-fns";
import { es } from "date-fns/locale";

import {
  listarInstrumentos,
  listarReservas,
  crearReserva,
  eliminarReserva,
} from "./api";

import { haySolapamiento } from "./solapamiento";
import "./App.css";

// Configuración del calendario en español
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: (date) =>
    startOfWeek(date, { weekStartsOn: 1 }),
  getDay,
  locales: { es },
});

// Obtener la fecha actual
function obtenerFechaHoy() {
  const hoy = new Date();
  const anio = hoy.getFullYear();
  const mes = String(hoy.getMonth() + 1).padStart(2, "0");
  const dia = String(hoy.getDate()).padStart(2, "0");

  return `${anio}-${mes}-${dia}`;
}

// Horarios cada 30 minutos
const horarios = [];

for (let hora = 0; hora < 24; hora++) {
  for (const minuto of [0, 30]) {
    const h = String(hora).padStart(2, "0");
    const m = String(minuto).padStart(2, "0");

    horarios.push(`${h}:${m}`);
  }
}

function App() {
  // Estados principales
  const [instrumentos, setInstrumentos] = useState([]);
  const [instrumentoSeleccionado, setInstrumentoSeleccionado] =
    useState("");
  const [reservas, setReservas] = useState([]);
  const [mensaje, setMensaje] = useState(null);

  // Estados del formulario
  const [solicitante, setSolicitante] = useState("");
  const [fecha, setFecha] = useState(obtenerFechaHoy);
  const [horaInicio, setHoraInicio] = useState("");
  const [horaFin, setHoraFin] = useState("");
  const [guardando, setGuardando] = useState(false);

  // Cargar instrumentos al iniciar
  useEffect(() => {
    async function cargarInstrumentos() {
      try {
        const datos = await listarInstrumentos();

        setInstrumentos(datos);

        if (datos.length > 0) {
          setInstrumentoSeleccionado(datos[0].id);
        }
      } catch (error) {
        setMensaje({
          tipo: "error",
          texto: error.message,
        });
      }
    }

    cargarInstrumentos();
  }, []);

  // Cargar reservas del instrumento seleccionado
  useEffect(() => {
    if (!instrumentoSeleccionado) {
      setReservas([]);
      return;
    }

    async function cargarReservas() {
      try {
        const datos = await listarReservas(
          instrumentoSeleccionado
        );

        setReservas(datos);
      } catch (error) {
        setMensaje({
          tipo: "error",
          texto: error.message,
        });
      }
    }

    cargarReservas();
  }, [instrumentoSeleccionado]);

  // Construir fechas completas
  const inicio =
    fecha && horaInicio
      ? `${fecha}T${horaInicio}:00`
      : "";

  const fin =
    fecha && horaFin
      ? `${fecha}T${horaFin}:00`
      : "";

  // Validar fechas y horarios ocupados
  let errorValidacion = "";
  let reservaEnConflicto = null;

  if (inicio && fin) {
    const fechaInicio = new Date(inicio);
    const fechaFin = new Date(fin);

    if (fechaInicio >= fechaFin) {
      errorValidacion =
        "La hora de inicio debe ser menor que la de finalización.";
    } else if (
      haySolapamiento(inicio, fin, reservas)
    ) {
      reservaEnConflicto = reservas.find((reserva) => {
        return (
          fechaInicio < new Date(reserva.fin) &&
          fechaFin > new Date(reserva.inicio)
        );
      });

      if (reservaEnConflicto) {
        errorValidacion = `Horario ocupado por ${
          reservaEnConflicto.solicitante
        }, desde ${format(
          new Date(reservaEnConflicto.inicio),
          "HH:mm"
        )} hasta ${format(
          new Date(reservaEnConflicto.fin),
          "HH:mm"
        )}.`;
      }
    }
  }

  // Limpiar formulario
  function limpiarFormulario() {
    setSolicitante("");
    setFecha(obtenerFechaHoy());
    setHoraInicio("");
    setHoraFin("");
  }

  // Crear reserva
  async function manejarEnvio(evento) {
    evento.preventDefault();

    if (
      !instrumentoSeleccionado ||
      !solicitante.trim() ||
      !fecha ||
      !horaInicio ||
      !horaFin ||
      errorValidacion ||
      guardando
    ) {
      return;
    }

    setGuardando(true);
    setMensaje(null);

    try {
      const datosReserva = {
        solicitante: solicitante.trim(),
        instrumentoId: Number(instrumentoSeleccionado),
        inicio: new Date(inicio).toISOString(),
        fin: new Date(fin).toISOString(),
      };

      await crearReserva(datosReserva);

      const datosActualizados = await listarReservas(
        instrumentoSeleccionado
      );

      setReservas(datosActualizados);
      limpiarFormulario();

      setMensaje({
        tipo: "exito",
        texto: "¡Tu reserva se creó correctamente!",
      });
    } catch (error) {
      setMensaje({
        tipo: "error",
        texto:
          error.status === 409
            ? "Ese horario acaba de ser reservado por otra persona. Elige otro horario."
            : error.message,
      });

      try {
        const datosActualizados = await listarReservas(
          instrumentoSeleccionado
        );

        setReservas(datosActualizados);
      } catch {
        // Se conserva el mensaje original
      }
    } finally {
      setGuardando(false);
    }
  }

  // PASO 38: seleccionar un horario arrastrando en el calendario
  function manejarSeleccionHorario(slot) {
    const mismoDia =
      format(slot.start, "yyyy-MM-dd") ===
      format(slot.end, "yyyy-MM-dd");

    if (!mismoDia) {
      setMensaje({
        tipo: "error",
        texto:
          "Selecciona un horario que esté dentro del mismo día.",
      });
      return;
    }

    setFecha(format(slot.start, "yyyy-MM-dd"));
    setHoraInicio(format(slot.start, "HH:mm"));
    setHoraFin(format(slot.end, "HH:mm"));

    setMensaje({
      tipo: "exito",
      texto:
        "Horario seleccionado. Completa tu nombre para solicitar la reserva.",
    });
  }

  // Cancelar una reserva
  async function manejarSeleccionReserva(evento) {
    const confirmar = window.confirm(
      `¿Deseas cancelar la reserva de ${evento.title}?`
    );

    if (!confirmar) {
      return;
    }

    try {
      await eliminarReserva(evento.id);

      const datosActualizados = await listarReservas(
        instrumentoSeleccionado
      );

      setReservas(datosActualizados);

      setMensaje({
        tipo: "exito",
        texto: "La reserva se canceló correctamente.",
      });
    } catch (error) {
      setMensaje({
        tipo: "error",
        texto: error.message,
      });
    }
  }

  // Convertir reservas en eventos
  const eventos = reservas.map((reserva) => ({
    id: reserva.id,
    title: reserva.solicitante,
    start: new Date(reserva.inicio),
    end: new Date(reserva.fin),
    resource: reserva,
  }));

  // Obtener instrumento seleccionado
  const instrumentoActual = instrumentos.find(
    (instrumento) =>
      instrumento.id === instrumentoSeleccionado
  );

  return (
    <div className="app">

      {/* ENCABEZADO */}
      <header className="encabezado">
        <div className="marca">
          <div className="marca-icono">♫</div>

          <div>
            <h1>ENSAYADERO</h1>
            <p>Sistema de reservas musicales</p>
          </div>
        </div>

        <div className="estado-sistema">
          <span className="punto-online"></span>
          Sistema activo
        </div>
      </header>

      <main className="contenido">

        {/* PRESENTACIÓN */}
        <section className="bienvenida">
          <div>
            <span className="etiqueta">
              RESERVAS MUSICALES
            </span>

            <h2>Organiza tu próximo ensayo</h2>

            <p>
              Selecciona tu instrumento y encuentra
              el horario perfecto para tocar.
            </p>
          </div>

          <div className="nota-musical">♫</div>
        </section>

        {/* SELECCIÓN DE INSTRUMENTOS */}
        <section className="panel">
          <div className="titulo-seccion">
            <div>
              <span className="numero-seccion">01</span>
              <h2>Selecciona un instrumento</h2>
            </div>

            <p>Elige dónde quieres ensayar</p>
          </div>

          <div className="instrumentos">
            {instrumentos.map((instrumento) => {
              const seleccionado =
                instrumentoSeleccionado === instrumento.id;

              const iconos = {
                "Batería": "🥁",
                "Guitarra eléctrica": "🎸",
                "Teclado": "🎹",
              };

              return (
                <button
                  key={instrumento.id}
                  type="button"
                  className={`tarjeta-instrumento ${
                    seleccionado ? "seleccionado" : ""
                  }`}
                  onClick={() => {
                    setInstrumentoSeleccionado(instrumento.id);
                    setMensaje(null);
                  }}
                >
                  <span className="icono-instrumento">
                    {iconos[instrumento.nombre] || "🎵"}
                  </span>

                  <span className="nombre-instrumento">
                    {instrumento.nombre}
                  </span>

                  <span className="estado-instrumento">
                    {seleccionado
                      ? "Seleccionado ✓"
                      : "Seleccionar"}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* FORMULARIO */}
        <section className="panel">
          <div className="titulo-seccion">
            <div>
              <span className="numero-seccion">02</span>
              <h2>Nueva reserva</h2>
            </div>

            <p>Completa los datos de tu ensayo</p>
          </div>

          <form
            className="formulario"
            onSubmit={manejarEnvio}
          >
            <div className="campo">
              <label htmlFor="solicitante">
                Nombre del solicitante
              </label>

              <input
                id="solicitante"
                type="text"
                placeholder="Escribe tu nombre"
                value={solicitante}
                onChange={(evento) =>
                  setSolicitante(evento.target.value)
                }
                required
              />
            </div>

            <div className="campo">
              <label htmlFor="instrumento">
                Instrumento
              </label>

              <input
                id="instrumento"
                type="text"
                value={instrumentoActual?.nombre || ""}
                placeholder="Selecciona un instrumento"
                readOnly
              />
            </div>

            <div className="campo">
              <label htmlFor="fecha">
                Fecha del ensayo
              </label>

              <input
                id="fecha"
                type="date"
                min={obtenerFechaHoy()}
                value={fecha}
                onChange={(evento) =>
                  setFecha(evento.target.value)
                }
                required
              />
            </div>

            <div className="fila-horarios">
              <div className="campo">
                <label htmlFor="horaInicio">
                  Hora de inicio
                </label>

                <select
                  id="horaInicio"
                  value={horaInicio}
                  onChange={(evento) =>
                    setHoraInicio(evento.target.value)
                  }
                  required
                >
                  <option value="">
                    Seleccionar hora
                  </option>

                  {horarios.map((hora) => (
                    <option key={hora} value={hora}>
                      {hora}
                    </option>
                  ))}
                </select>
              </div>

              <div className="campo">
                <label htmlFor="horaFin">
                  Hora de finalización
                </label>

                <select
                  id="horaFin"
                  value={horaFin}
                  onChange={(evento) =>
                    setHoraFin(evento.target.value)
                  }
                  required
                >
                  <option value="">
                    Seleccionar hora
                  </option>

                  {horarios.map((hora) => (
                    <option key={hora} value={hora}>
                      {hora}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* VALIDACIÓN */}
            {errorValidacion && (
              <div className="mensaje-validacion">
                <span>!</span>
                {errorValidacion}
              </div>
            )}

            {/* MENSAJES */}
            {mensaje && (
              <div className={`mensaje ${mensaje.tipo}`}>
                {mensaje.tipo === "exito" ? "✓" : "!"}
                {mensaje.texto}
              </div>
            )}

            <button
              type="submit"
              className="boton-reservar"
              disabled={
                !instrumentoSeleccionado ||
                guardando ||
                Boolean(errorValidacion)
              }
            >
              {guardando
                ? "Procesando reserva..."
                : "Confirmar reserva →"}
            </button>
          </form>
        </section>

        {/* CALENDARIO */}
        <section className="panel panel-calendario">
          <div className="titulo-seccion">
            <div>
              <span className="numero-seccion">03</span>
              <h2>Disponibilidad</h2>
            </div>

            <p>
              {instrumentoActual
                ? instrumentoActual.nombre
                : "Selecciona un instrumento"}
            </p>
          </div>

          <div className="indicaciones-calendario">
            <span>
              <i className="punto-reserva"></i>
              Horarios reservados
            </span>

            <span>
              <i className="punto-libre"></i>
              Horarios disponibles
            </span>
          </div>

          <p className="ayuda-calendario">
            Arrastra sobre un horario libre para seleccionarlo.
            Haz clic sobre una reserva para cancelarla.
          </p>

          <div className="contenedor-calendario">
            <Calendar
              localizer={localizer}
              events={eventos}
              startAccessor="start"
              endAccessor="end"
              views={["week", "day"]}
              defaultView="week"
              culture="es"

              // PASO 38
              selectable
              step={30}
              timeslots={1}
              onSelectSlot={manejarSeleccionHorario}

              // PASO 39
              onSelectEvent={manejarSeleccionReserva}

              messages={{
                next: "Siguiente",
                previous: "Anterior",
                today: "Hoy",
                week: "Semana",
                day: "Día",
                date: "Fecha",
                time: "Hora",
                event: "Reserva",
                noEventsInRange:
                  "No hay reservas en este periodo",
              }}
            />
          </div>
        </section>
      </main>

      {/* PIE DE PÁGINA */}
      <footer className="pie-pagina">
        <span>♫ ENSAYADERO</span>
        <p>Tu música, tu espacio, tu momento.</p>
      </footer>
    </div>
  );
}

export default App;
