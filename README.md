#Nombre: Emmanuel Blandón Zapata
#Ficha: 3519093

# Sistema de agendamiento para un ensayadero musical
## Tecnologías utilizadas
- **Backend:** Node.js y Express.
- **Frontend:** React y Vite.
- **Base de datos:** SQLite.
- **ORM:** Prisma 6.
- **Calendario:** React Big Calendar.
- **Estilos:** CSS.

## Funcionalidades principales

- Consultar los instrumentos disponibles.
- Crear reservas indicando solicitante, instrumento, fecha y horario.
- Consultar las reservas registradas.
- Visualizar las reservas en un calendario.
- Cancelar reservas existentes.
- Validar que no se crucen horarios para un mismo instrumento.
- Permitir reservas simultáneas cuando corresponden a instrumentos diferentes.

## Instrumentos disponibles

El sistema cuenta con tres instrumentos:

1. Batería.
2. Guitarra eléctrica.
3. Teclado.

## ¿Cómo evita el sistema los solapamientos?

El sistema compara la hora de inicio y finalización de cada nueva reserva con las reservas existentes del mismo instrumento. Si los horarios se cruzan, la API rechaza la solicitud para evitar una doble reserva. Los instrumentos diferentes pueden reservarse a la misma hora. También se permiten turnos consecutivos, siempre que uno termine exactamente cuando comienza el siguiente.

## Estructura del proyecto

- `ensayadero-api/`: contiene el backend, las rutas, la lógica de negocio y la conexión con la base de datos.
- `ensayadero-web/`: contiene la interfaz web, el formulario de reservas y el calendario.