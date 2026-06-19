// api/db.js
import { neon } from '@neondatabase/serverless';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    console.error('❌ DATABASE_URL is not set in environment variables');
}

// Создаем клиент Neon
export const sql = neon(connectionString);

// Функция для проверки подключения
export async function testConnection() {
    try {
        const result = await sql`SELECT 1 as connected`;
        console.log('✅ Database connected successfully');
        return true;
    } catch (error) {
        console.error('❌ Database connection failed:', error);
        return false;
    }
}

// Для совместимости с другими файлами
export default sql;