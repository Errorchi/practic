// api/auth.js
import { sql } from './db.js';

export default async function handler(req, res) {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Preflight
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Только POST
    if (req.method !== 'POST') {
        return res.status(405).json({ 
            error: 'Method not allowed. Use POST.' 
        });
    }

    try {
        const { action, email, password, name } = req.body;

        // Проверка полей
        if (!action || !email || !password) {
            return res.status(400).json({ 
                error: 'Missing required fields' 
            });
        }

        // Регистрация
        if (action === 'register') {
            // Проверяем, существует ли пользователь
            const existing = await sql`
                SELECT * FROM users WHERE email = ${email}
            `;

            if (existing.length > 0) {
                return res.status(400).json({ 
                    error: 'User already exists' 
                });
            }

            // Создаем пользователя (пароль без хеша для простоты)
            const result = await sql`
                INSERT INTO users (email, password_hash, name)
                VALUES (${email}, ${password}, ${name})
                RETURNING id, email, name
            `;

            return res.status(201).json({
                success: true,
                userId: result[0].id,
                user: {
                    id: result[0].id,
                    email: result[0].email,
                    name: result[0].name
                }
            });
        }

        // Вход
        if (action === 'login') {
            const user = await sql`
                SELECT * FROM users WHERE email = ${email}
            `;

            if (user.length === 0) {
                return res.status(401).json({ 
                    error: 'User not found' 
                });
            }

            // Простая проверка (без bcrypt)
            if (user[0].password_hash !== password) {
                return res.status(401).json({ 
                    error: 'Invalid password' 
                });
            }

            return res.status(200).json({
                success: true,
                userId: user[0].id,
                user: {
                    id: user[0].id,
                    email: user[0].email,
                    name: user[0].name
                }
            });
        }

        return res.status(400).json({ error: 'Invalid action' });

    } catch (error) {
        console.error('Auth error:', error);
        return res.status(500).json({ 
            error: 'Internal server error',
            details: error.message 
        });
    }
}