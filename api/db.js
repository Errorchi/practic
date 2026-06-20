// api/db.js - исправленная версия
const { neon } = require('@neondatabase/serverless');

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    console.error('❌ DATABASE_URL is not set in environment variables');
    throw new Error('DATABASE_URL is not set');
}

const sql = neon(connectionString);

// 🆕 Функция для преобразования значения в SQL-строку
function escapeSqlValue(value) {
    if (value === null || value === undefined) {
        return 'NULL';
    }
    
    if (typeof value === 'boolean') {
        return value ? 'TRUE' : 'FALSE';
    }
    
    if (typeof value === 'number') {
        return String(value);
    }
    
    if (Array.isArray(value)) {
        // 🆕 Для массивов используем ARRAY[...] синтаксис
        if (value.length === 0) {
            return "ARRAY[]::TEXT[]";
        }
        const escapedItems = value.map(item => {
            if (typeof item === 'string') {
                // Экранируем кавычки внутри строк
                return `'${item.replace(/'/g, "''")}'`;
            }
            return item;
        });
        return `ARRAY[${escapedItems.join(', ')}]`;
    }
    
    if (typeof value === 'string') {
        // Экранируем кавычки
        return `'${value.replace(/'/g, "''")}'`;
    }
    
    return String(value);
}

async function query(text, params = []) {
    try {
        console.log('📝 Query:', text);
        console.log('📊 Params:', params);
        
        let result;
        
        if (params && params.length > 0) {
            let finalQuery = text;
            let idx = 1;
            
            for (const param of params) {
                const escaped = escapeSqlValue(param);
                // Заменяем $1, $2 и т.д. на экранированные значения
                finalQuery = finalQuery.replace(`$${idx}`, escaped);
                idx++;
            }
            
            console.log('📝 Final query:', finalQuery);
            result = await sql(finalQuery);
        } else {
            result = await sql(text);
        }
        
        if (Array.isArray(result)) {
            return { rows: result };
        } else if (result && typeof result === 'object') {
            return { rows: [] };
        } else {
            return { rows: [] };
        }
    } catch (error) {
        console.error('❌ Database query error:', error);
        throw error;
    }
}

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

module.exports = { 
    sql, 
    query, 
    testConnection 
};