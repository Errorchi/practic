const { neon } = require('@neondatabase/serverless');

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    console.error('❌ DATABASE_URL is not set in environment variables');
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

// Экспортируем для CommonJS
module.exports = { sql, testConnection };
// Для обратной совместимости с query
module.exports.query = async (text, params) => {
    return sql(text, params);
};