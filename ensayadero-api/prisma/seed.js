
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const instrumentos = [
  "Batería",
  "Guitarra eléctrica",
  "Teclado"
];

async function main() {
  for (const nombre of instrumentos) {
    await prisma.instrumento.upsert({
      where: { nombre },
      update: {},
      create: { nombre }
    });
  }

  console.log("Instrumentos creados correctamente");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
