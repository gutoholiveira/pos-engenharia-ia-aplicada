# E-commerce Recommendation System

A web application that displays user profiles and product listings, with the ability to track user purchases for future machine learning recommendations using TensorFlow.js.

**🚀 Versão com Banco de Dados**: Esta versão utiliza PostgreSQL com pgvector para armazenar vetores de produtos e realizar buscas por similaridade vetorial, simulando um ambiente de produção.

## Project Structure

- `index.html` - Main HTML file for the application
- `src/` - Source code directory
  - `index.js` - Entry point for the application
  - `view/` - Contains classes for managing the DOM and templates
  - `controller/` - Contains controllers to connect views and services
  - `service/` - Contains business logic for data handling
    - `DatabaseService.js` - Serviço para comunicação com a API backend
  - `workers/` - Web Workers para processamento pesado
    - `modelTrainingWorker.js` - Worker para treinamento do modelo ML e recomendações
- `backend/` - Backend API server
  - `server.js` - Express server com endpoints para PostgreSQL/pgvector
- `data/` - Contains JSON files with user and product data
- `docker-compose.yml` - Configuração do PostgreSQL com pgvector

## Setup and Run

### Pré-requisitos

- Node.js (v18+)
- Docker e Docker Compose (ou PostgreSQL com pgvector instalado)

### 1. Configurar Banco de Dados

O arquivo `.env` deve ser configurado com:
```
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=ecommerce_db
POSTGRES_PORT=5433
POSTGRES_HOST=localhost
API_PORT=3001
```

**Iniciar o banco de dados com Docker:**
```bash
docker run -d --name ecommerce-vector-db \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=ecommerce_db \
  -p 5433:5432 \
  -v ecommerce-pgdata:/var/lib/postgresql/data \
  pgvector/pgvector:pg16
```

Ou use o docker-compose (se disponível):
```bash
docker-compose up -d
```

### 2. Instalar Dependências

```bash
npm install
```

### 3. Iniciar o Backend API

Em um terminal:
```bash
npm run start:backend
```

O servidor API estará rodando em `http://localhost:3001`

### 4. Iniciar o Frontend

Em outro terminal:
```bash
npm start
```

Ou iniciar ambos simultaneamente:
```bash
npm run start:all
```

### 5. Acessar a Aplicação

Abra seu navegador e navegue para `http://localhost:3000`

## Features

- ✅ Seleção de perfil de usuário com exibição de detalhes
- ✅ Exibição do histórico de compras
- ✅ Listagem de produtos com "Comprar Agora"
- ✅ Registro de compras usando sessionStorage
- ✅ Motor de recomendação baseado em TensorFlow.js
- ✅ Busca por similaridade vetorial (100 produtos mais similares)
- ✅ Armazenamento persistente dos vetores no banco
- ✅ Persistência do contexto de normalização no banco

## Arquitetura de Produção

### Fluxo de Treinamento

1. O modelo é treinado com dados de usuários e produtos
2. Cada produto é codificado em um vetor de embeddings
3. Os vetores são salvos no PostgreSQL com pgvector
4. O contexto de normalização é salvo no banco

### Fluxo de Recomendação

1. O vetor do usuário é calculado baseado em suas compras/idade
2. **Busca vetorial**: O sistema busca os **100 produtos mais próximos** usando cosine similarity no banco
3. Apenas esses 100 produtos são processados pelo modelo ML
4. Os resultados são ordenados por score e retornados

### Vantagens da Abordagem

- ⚡ **Performance**: Processa apenas 100 produtos em vez de todos
- 💾 **Escalabilidade**: Banco de dados pode armazenar milhões de produtos
- 🔍 **Precisão**: Busca vetorial encontra produtos semanticamente similares
- 🏭 **Produção**: Simula ambiente real com banco de dados persistente

## API Endpoints

- `GET /api/health` - Health check
- `POST /api/products/vectors` - Salvar vetor de produto
- `POST /api/products/similar` - Buscar produtos similares (busca vetorial)
- `GET /api/context` - Obter contexto de treinamento
- `POST /api/context` - Salvar contexto de treinamento
- `DELETE /api/products/vectors` - Limpar todos os vetores

## Database Schema

```sql
-- Tabela de vetores de produtos
CREATE TABLE product_vectors (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    price DECIMAL(10, 2),
    color VARCHAR(50),
    vector vector,  -- pgvector type
    context JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índice HNSW para busca vetorial eficiente
CREATE INDEX product_vectors_vector_idx 
ON product_vectors 
USING hnsw (vector vector_cosine_ops);
```
