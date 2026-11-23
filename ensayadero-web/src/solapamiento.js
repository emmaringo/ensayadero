export function haySolapamiento(
  nuevoInicio,
  nuevoFin,
  reservasExistentes
) {
  return reservasExistentes.some((reserva) => {
    return (
      new Date(nuevoInicio) < new Date(reserva.fin) &&
      new Date(nuevoFin) > new Date(reserva.inicio)
    );
  });
}
