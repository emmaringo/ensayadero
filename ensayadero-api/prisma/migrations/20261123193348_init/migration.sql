-- CreateTable
CREATE TABLE "Instrumento" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nombre" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Reserva" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "solicitante" TEXT NOT NULL,
    "instrumentoId" INTEGER NOT NULL,
    "inicio" DATETIME NOT NULL,
    "fin" DATETIME NOT NULL,
    CONSTRAINT "Reserva_instrumentoId_fkey" FOREIGN KEY ("instrumentoId") REFERENCES "Instrumento" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Instrumento_nombre_key" ON "Instrumento"("nombre");

-- CreateIndex
CREATE INDEX "Reserva_instrumentoId_inicio_fin_idx" ON "Reserva"("instrumentoId", "inicio", "fin");
