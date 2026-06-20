// api/db.js - CommonJS с правильной адаптацией
const { neon } = require('@neondatabase/serverless');

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    console.error('❌ DATABASE_URL is not set in environment variables');
    throw new Error('DATABASE_URL is not set');
}

// Создаем клиент Neon
const sql = neon(connectionString);

// Функция для проверки подключения
async function testConnection() {
    try {
        const result = await sql`SELECT 1 as connected`;
        console.log('✅ Database connected successfully');
        return true;
    } catch (error) {
        console.error('❌ Database connection failed:', error);
        return false;
    }
}

// ⚠️ КЛЮЧЕВОЕ ИСПРАВЛЕНИЕ: функция query, которая возвращает { rows: [...] }
async function query(text, params) {
    try {
        // Если текст запроса содержит $1, $2 и т.д. - используем параметризованный запрос
        let result;
        if (params && params.length > 0) {
            // Для параметризованных запросов
            result = await sql(text, ...params);
        } else {
            // Для запросов без параметров
            result = await sql(text);
        }
        
        // Убеждаемся, что результат всегда имеет поле rows
        // Neon возвращает массив, если это SELECT, или объект с count, если это INSERT/UPDATE/DELETE
        if (Array.isArray(result)) {
            return { rows: result };
        } else if (result && typeof result === 'object') {
            // Для INSERT/UPDATE/DELETE возвращаем пустой массив, чтобы не ломать код
            return { rows: [] };
        } else {
            return { rows: [] };
        }
    } catch (error) {
        console.error('Database query error:', error);
        throw error;
    }
}

// Экспортируем всё, что нужно
module.exports = { 
    sql, 
    query, 
    testConnection 
};

// Для обратной совместимости
module.exports.query = query;