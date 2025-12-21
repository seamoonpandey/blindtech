const { Client } = require('pg');
const bcrypt = require('bcrypt');
require('dotenv').config();

const DATABASE_URL = process.env.DATABASE_URL;

async function seed() {
    const client = new Client({ connectionString: DATABASE_URL });
    await client.connect();

    try {
        console.log('--- SEEDING INITIAL DATA ---');
        await client.query('BEGIN');

        // 1. Initial Game State
        console.log('Inserting initial game state...');
        await client.query("INSERT INTO game_state (id, current_round, status) VALUES (1, 0, 'waiting') ON CONFLICT (id) DO UPDATE SET current_round = 0, status = 'waiting'");

        // 2. Seed Users
        const passwordHash = await bcrypt.hash('password123', 10);
        
        console.log('Seeding 5 Volunteers...');
        const volunteers = [
            { name: 'Admin One', email: 'admin1@test.com' },
            { name: 'Volunteer Two', email: 'vol2@test.com' },
            { name: 'Volunteer Three', email: 'vol3@test.com' },
            { name: 'Volunteer Four', email: 'vol4@test.com' },
            { name: 'Volunteer Five', email: 'vol5@test.com' }
        ];

        for (const v of volunteers) {
            await client.query(
                'INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) ON CONFLICT (email) DO NOTHING',
                [v.name, v.email, passwordHash, 'volunteer']
            );
        }

        console.log('Seeding 40 Players...');
        for (let i = 1; i <= 40; i++) {
            await client.query(
                'INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) ON CONFLICT (email) DO NOTHING',
                [`Player ${i}`, `player${i}@test.com`, passwordHash, 'player']
            );
        }

        await client.query('COMMIT');
        console.log('--- SEEDING COMPLETE ---');
        console.log('Users: 5 Volunteers, 40 Players');
        console.log('Password for all: password123');
        console.log('Game State: Round 0, Status: waiting');

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('ERROR DURING SEEDING:', err);
    } finally {
        await client.end();
    }
}

seed();
