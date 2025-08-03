require('dotenv').config();
console.log('MONGODB_URI:', process.env.MONGODB_URI);
console.log('PORT:', process.env.PORT);
const express = require('express');
const cors = require('cors');
const connectDB = require('./models/database');
const authRoutes = require('./routes/auth');
const ordenRoutes = require('./routes/ordenes');
const stockRoutes = require('./routes/stock');
const reportesRoutes = require('./routes/reportes');
const depositosRoutes = require('./routes/depositos');

const app = express();

// Conectar a MongoDB
connectDB();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Rutas
app.use('/api/auth', authRoutes);
app.use('/api/ordenes', ordenRoutes);
app.use('/api/stock', stockRoutes);
app.use('/api/reportes', reportesRoutes);
app.use('/api/depositos', depositosRoutes);

// Ruta raíz
app.get('/api', (req, res) => {
  res.json({ message: 'API de Órdenes de Compra con MongoDB' });
});

// Servir frontend
app.get('/', (req, res) => {
  res.sendFile('index.html', { root: 'public' });
});

// Iniciar servidor
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});