require('dotenv').config({ path: '/home/demoner88/ordenes-de-compra-app/.env' }); // Carga explícita del .env
const mongoose = require('mongoose');
const connectDB = require('./models/database');
const Proyecto = require('./models/Proyecto');
const Orden = require('./models/Orden');

async function migrateProyectos() {
  try {
    // Conectar a la base de datos
    await connectDB();
    console.log('Conectado a MongoDB');

    // Obtener proyectos únicos de las órdenes
    const proyectosUnicos = await Orden.distinct('proyecto');

    // Migrar cada proyecto a la colección proyectos
    for (const nombre of proyectosUnicos) {
      if (nombre && nombre.trim() !== '') {
        const proyectoExistente = await Proyecto.findOne({ nombre: nombre.trim() });
        if (!proyectoExistente) {
          const nuevoProyecto = new Proyecto({ nombre: nombre.trim() });
          await nuevoProyecto.save();
          console.log(`Migrado proyecto: ${nombre}`);
        } else {
          console.log(`Proyecto ya existe: ${nombre}`);
        }
      }
    }
    console.log('Migración completada');
    process.exit(0);
  } catch (err) {
    console.error('Error en migración:', err);
    process.exit(1);
  }
}

migrateProyectos();