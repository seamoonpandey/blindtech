const bcrypt = require('bcrypt');
const db = require('../db');
const fp = require('fastify-plugin');

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
      const token = fastify.jwt.sign({ id: user.id, role: user.role, name: user.name });
      reply.setCookie('token', token, {
        path: '/',
        httpOnly: false, // Allow client JS to read it for WebSocket handshake usage if needed
        secure: false,   // Localhost
        sameSite: 'lax'
      });

      // Trigger broadcasts for live updates
      if (fastify.broadcastAllAdminData) {
        fastify.broadcastAllAdminData().catch(err => fastify.log.error(err));
      }

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

    // Static admin login (accepts "moon" or "moon@admin.com")
    const normalizedEmail = (email || '').trim().toLowerCase();
    const isAdminEmail = normalizedEmail === 'moon@admin.com' || normalizedEmail === 'moon';
    if (isAdminEmail && password === 'ahsila') {
      const adminUser = { id: 'admin-id', name: 'Watchman', email: 'moon@admin.com', role: 'admin' };
      const token = fastify.jwt.sign({ id: adminUser.id, role: adminUser.role, name: adminUser.name });
      reply.setCookie('token', token, {
        path: '/',
        httpOnly: false,
        secure: false,
        sameSite: 'lax'
      });
      return { user: adminUser, token };
    }

    const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];

    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return reply.code(401).send({ error: 'Invalid credentials' });
    }

    const token = fastify.jwt.sign({ id: user.id, role: user.role, name: user.name });
    reply.setCookie('token', token, {
      path: '/',
      httpOnly: false, // For easier client access during dev/ws usage
      secure: false,
      sameSite: 'lax'
    });
    return { user: { id: user.id, name: user.name, email: user.email, role: user.role }, token };
  });

  fastify.get('/me', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    // The user is attached to the request by the authenticate decorator
    const { id, name, role } = request.user;
    
    if (id === 'admin-id') {
      return { id: 'admin-id', name: 'Moon Master', email: 'moon@admin.com', role: 'admin' };
    }

    const result = await db.query('SELECT id, name, email, role FROM users WHERE id = $1', [id]);
    const user = result.rows[0];
    if (!user) {
      return reply.code(404).send({ error: 'User not found' });
    }
    return user;
  });
}

module.exports = fp(authRoutes);
