// api/db.js - Правильная работа с Neon
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
async function query(text, params = []) {
    try {
        console.log('📝 Query:', text);
        console.log('📊 Params:', params);
        
        let result;
        
        // Если есть параметры - используем параметризованный запрос
        if (params && params.length > 0) {
            // 🚀 ПРАВИЛЬНЫЙ СПОСОБ: заменяем $1, $2 на значения
            // Neon не поддерживает параметры как аргументы функции
            // Используем подход с шаблонными строками
            let queryText = text;
            let paramIndex = 1;
            
            // Заменяем $1, $2 на $1, $2 (оставляем как есть для Neon)
            // Но используем другой подход: выполняем запрос с параметрами через sql()
            // Используем sql для каждого запроса отдельно
            // Вместо этого, строим запрос с экранированными значениями
            // ⚠️ ВАЖНО: экранируем строки, чтобы избежать SQL-инъекций
            const escapedParams = params.map(p => {
                if (typeof p === 'string') {
                    // Экранируем строки (заменяем ' на '')
                    return `'${p.replace(/'/g, "''")}'`;
                } else if (p === null) {
                    return 'NULL';
                } else if (typeof p === 'boolean') {
                    return p ? 'TRUE' : 'FALSE';
                } else {
                    return p;
                }
            });
            
            // Заменяем $1, $2 и т.д. на экранированные значения
            let finalQuery = text;
            let idx = 1;
            for (const param of escapedParams) {
                finalQuery = finalQuery.replace(`$${idx}`, param);
                idx++;
            }
            
            console.log('📝 Final query:', finalQuery);
            result = await sql(finalQuery);
        } else {
            // Запрос без параметров
            result = await sql(text);
        }
        
        console.log('📊 Result type:', typeof result);
        console.log('📊 Is array:', Array.isArray(result));
        
        // ✅ Правильная обработка результата
        if (Array.isArray(result)) {
            return { rows: result };
        } else if (result && typeof result === 'object') {
            // Для INSERT/UPDATE/DELETE возвращаем пустой массив
            return { rows: [] };
        } else {
            return { rows: [] };
        }
    } catch (error) {
        console.error('❌ Database query error:', error);
        throw error;
    }
}

// Экспортируем всё
module.exports = { 
    sql, 
    query, 
    testConnection 
};

// Для обратной совместимости
module.exports.query = query;