const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    console.log('Intentando conectar con MONGODB_URI:', process.env.MONGODB_URI);
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Conectado a MongoDB');
  } catch (error) {
    console.error('Error de conexión a MongoDB:', error.message);
    process.exit(1);
  }
};

module.exports = connectDB;