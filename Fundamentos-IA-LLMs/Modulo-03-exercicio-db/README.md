# 🛒 Sistema de Recomendação para E-commerce

Uma aplicação web que exibe perfis de usuários e listagem de produtos, com capacidade de registrar compras para gerar recomendações futuras utilizando **TensorFlow.js**.

**🚀 Versão com Banco de Dados:** Esta versão utiliza **PostgreSQL** com **pgvector** para armazenar vetores de produtos e realizar buscas por similaridade vetorial, simulando um ambiente de produção.

---

## 📁 Estrutura do Projeto

- `index.html` – Arquivo HTML principal da aplicação  
- `src/` – Código-fonte da aplicação  
  - `index.js` – Ponto de entrada  
  - `view/` – Classes para manipulação do DOM e templates  
  - `controller/` – Controladores conectando views aos serviços  
  - `service/` – Lógica de negócio e manipulação de dados  
    - `DatabaseService.js` – Serviço para comunicação com a API backend  
  - `workers/` – Web Workers para processamento pesado  
    - `modelTrainingWorker.js` – Worker para treinamento do modelo e recomendações  
- `backend/` – Servidor da API  
  - `server.js` – Servidor Express com endpoints para PostgreSQL + pgvector  
- `data/` – Arquivos JSON com dados de usuários e produtos  
- `docker-compose.yml` – Configuração do PostgreSQL com pgvector  

---

## ⚙️ Configuração e Execução

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
    vector vector(14),  -- pgvector type
    context JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índice HNSW para busca vetorial eficiente
CREATE INDEX product_vectors_vector_idx 
ON product_vectors 
USING hnsw (vector vector_cosine_ops);
```
