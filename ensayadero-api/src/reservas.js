
export async function buscarConflicto(
  prisma,
  instrumentoId,
  inicio,
  fin,
  excluirId = null
) {
  const conflicto = await prisma.reserva.findFirst({
    where: {
      instrumentoId: Number(instrumentoId),
      inicio: {
        lt: fin
      },
      fin: {
        gt: inicio
      },
      ...(excluirId !== null && {
        id: {
          not: Number(excluirId)
        }
      })
    },
    include: {
      instrumento: true
    }
  });

  return conflicto;
}
