/**
 * Backend API Server para comunicação com PostgreSQL + pgvector
 * Simula ambiente de produção
 */
import express from 'express';
import cors from 'cors';
import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

const app = express();
const PORT = process.env.API_PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Configuração do PostgreSQL
const pool = new pg.Pool({
    user: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || 'postgres',
    host: process.env.POSTGRES_HOST || 'localhost',
    port: process.env.POSTGRES_PORT || 5433,
    database: process.env.POSTGRES_DB || 'ecommerce_db',
});

// Testar conexão
pool.on('connect', () => {
    console.log('✅ Connected to PostgreSQL database');
});

pool.on('error', (err) => {
    console.error('❌ Unexpected error on idle client', err);
    process.exit(-1);
});

// Inicializar banco de dados
async function initializeDatabase() {
    try {
        // Criar tabela de produtos com vetores
        await pool.query(`
            CREATE TABLE IF NOT EXISTS product_vectors (
                id SERIAL PRIMARY KEY,
                product_id INTEGER NOT NULL,
                name VARCHAR(255) NOT NULL,
                category VARCHAR(100),
                price DECIMAL(10, 2),
                color VARCHAR(50),
                vector vector(14),
                context JSONB,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(product_id)
            )
        `);

        // Criar índice HNSW para busca vetorial eficiente
        await pool.query(`
            CREATE INDEX IF NOT EXISTS product_vectors_vector_idx 
            ON product_vectors 
            USING hnsw (vector vector_cosine_ops)
        `);

        // Criar tabela para contexto de normalização
        await pool.query(`
            CREATE TABLE IF NOT EXISTS training_context (
                id SERIAL PRIMARY KEY,
                context JSONB NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        console.log('✅ Database initialized successfully');
    } catch (error) {
        console.error('❌ Error initializing database:', error);
        throw error;
    }
}

// Endpoint: Salvar vetor de produto
app.post('/api/products/vectors', async (req, res) => {
    try {
        const { productId, name, category, price, color, vector, context } = req.body;

        if (!productId || !vector || !Array.isArray(vector)) {
            return res.status(400).json({ error: 'productId and vector are required' });
        }

        // Converter array para formato pgvector
        const vectorStr = '[' + vector.join(',') + ']';

        const result = await pool.query(`
            INSERT INTO product_vectors (product_id, name, category, price, color, vector, context)
            VALUES ($1, $2, $3, $4, $5, $6::vector, $7)
            ON CONFLICT (product_id) 
            DO UPDATE SET 
                name = EXCLUDED.name,
                category = EXCLUDED.category,
                price = EXCLUDED.price,
                color = EXCLUDED.color,
                vector = EXCLUDED.vector,
                context = EXCLUDED.context,
                updated_at = CURRENT_TIMESTAMP
            RETURNING *
        `, [productId, name, category, price, color, vectorStr, JSON.stringify(context)]);

        res.json({ success: true, product: result.rows[0] });
    } catch (error) {
        console.error('Error saving product vector:', error);
        res.status(500).json({ error: error.message });
    }
});

// Endpoint: Buscar produtos similares usando busca vetorial
app.post('/api/products/similar', async (req, res) => {
    try {
        const { vector, limit = 100 } = req.body;

        if (!vector || !Array.isArray(vector)) {
            return res.status(400).json({ error: 'vector is required' + !vector + !Array.isArray(vector) });
        }

        // Converter array para formato pgvector
        const vectorStr = '[' + vector.join(',') + ']';

        // Buscar produtos mais próximos usando cosine similarity
        const result = await pool.query(`
            SELECT 
                product_id,
                name,
                category,
                price,
                color,
                vector,
                context,
                1 - (vector <=> $1::vector) as similarity
            FROM product_vectors
            ORDER BY vector <=> $1::vector
            LIMIT $2
        `, [vectorStr, limit]);

        // Converter vetores de string para array
        // pgvector retorna como string no formato '[1,2,3]' ou como objeto
        const products = result.rows.map(row => {
            let vectorArray;
            if (typeof row.vector === 'string') {
                // Se for string, fazer parse
                const match = row.vector.match(/\[(.*?)\]/);
                if (match) {
                    vectorArray = match[1].split(',').map(Number);
                } else {
                    vectorArray = JSON.parse(row.vector);
                }
            } else if (Array.isArray(row.vector)) {
                vectorArray = row.vector;
            } else {
                // Tentar parsear como JSON
                vectorArray = JSON.parse(JSON.stringify(row.vector));
            }

            return {
                id: row.product_id,
                name: row.name,
                category: row.category,
                price: parseFloat(row.price),
                color: row.color,
                vector: vectorArray,
                context: row.context,
                similarity: parseFloat(row.similarity)
            };
        });

        res.json({ success: true, products });
    } catch (error) {
        console.error('Error finding similar products:', error);
        res.status(500).json({ error: error.message });
    }
});

// Endpoint: Salvar contexto de treinamento
app.post('/api/context', async (req, res) => {
    try {
        const { context } = req.body;

        if (!context) {
            return res.status(400).json({ error: 'context is required' });
        }

        // Limpar contexto anterior e salvar novo
        await pool.query('DELETE FROM training_context');
        const result = await pool.query(`
            INSERT INTO training_context (context)
            VALUES ($1)
            RETURNING *
        `, [JSON.stringify(context)]);

        res.json({ success: true, context: result.rows[0].context });
    } catch (error) {
        console.error('Error saving context:', error);
        res.status(500).json({ error: error.message });
    }
});

// Endpoint: Obter contexto de treinamento
app.get('/api/context', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT context 
            FROM training_context 
            ORDER BY created_at DESC 
            LIMIT 1
        `);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Context not found' });
        }

        res.json(result.rows[0].context);
    } catch (error) {
        console.error('Error getting context:', error);
        res.status(500).json({ error: error.message });
    }
});

// Endpoint: Limpar todos os vetores
app.delete('/api/products/vectors', async (req, res) => {
    try {
        await pool.query('DELETE FROM product_vectors');
        res.json({ success: true, message: 'All vectors cleared' });
    } catch (error) {
        console.error('Error clearing vectors:', error);
        res.status(500).json({ error: error.message });
    }
});

// Health check
app.get('/api/health', async (req, res) => {
    try {
        await pool.query('SELECT 1');
        res.json({ status: 'ok', database: 'connected' });
    } catch (error) {
        res.status(500).json({ status: 'error', database: 'disconnected', error: error.message });
    }
});

// Inicializar e iniciar servidor
async function startServer() {
    try {
        await initializeDatabase();
        app.listen(PORT, () => {
            console.log(`🚀 API Server running on http://localhost:${PORT}`);
            console.log(`📊 Database: ${process.env.POSTGRES_DB || 'ecommerce_db'}@${process.env.POSTGRES_HOST || 'localhost'}:${process.env.POSTGRES_PORT || 5433}`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

startServer();
