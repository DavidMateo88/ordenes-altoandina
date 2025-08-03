const jwt = require('jsonwebtoken');
const User = require('../models/User');

const login = async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Faltan usuario o contraseña' });
  }

  try {
    const user = await User.findOne({ username });
    if (!user || user.password !== password) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET || 'secreto',
      { expiresIn: '1h' }
    );

    res.json({ token, role: user.role });
  } catch (error) {
    console.error('Error al iniciar sesión:', error.message);
    res.status(500).json({ error: 'Error al iniciar sesión' });
  }
};

module.exports = { login };