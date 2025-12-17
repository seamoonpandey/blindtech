const bcrypt = require('bcrypt');
const db = require('../db');

async function authRoutes(fastify, options) {
  fastify.post('/register', async (request, reply) => {
    const { name, email, password, role } = request.body;
    
    if (!['player', 'volunteer'].includes(role)) {
      return reply.code(400).send({ error: 'Invalid role' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    try {
      const result = await db.query(
        'INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role',
        [name, email, hashedPassword, role]
      );
      const user = result.rows[0];
      const token = fastify.jwt.sign({ id: user.id, role: user.role });
      return { user, token };
    } catch (err) {
      if (err.code === '23505') { // Unique violation
        return reply.code(409).send({ error: 'Email already exists' });
      }
      fastify.log.error(err);
      return reply.code(500).send({ error: 'Internal Server Error' });
    }
  });

  fastify.post('/login', async (request, reply) => {
    const { email, password } = request.body;
    const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];

    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return reply.code(401).send({ error: 'Invalid credentials' });
    }

    const token = fastify.jwt.sign({ id: user.id, role: user.role });
    return { user: { id: user.id, name: user.name, email: user.email, role: user.role }, token };
  });
}

module.exports = authRoutes;
