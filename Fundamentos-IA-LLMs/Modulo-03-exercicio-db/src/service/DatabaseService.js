/**
 * DatabaseService - Serviço para comunicação com a API backend
 * que gerencia o banco de dados PostgreSQL com pgvector
 */
export class DatabaseService {
    #apiBaseUrl = 'http://localhost:3001/api';

    /**
     * Salva ou atualiza um vetor de produto no banco de dados
     * @param {Object} product - Produto com metadados
     * @param {Array<number>} vector - Vetor de embeddings do produto
     * @param {Object} context - Contexto de normalização (minPrice, maxPrice, etc)
     */
    async saveProductVector(product, vector, context) {
        try {
            const response = await fetch(`${this.#apiBaseUrl}/products/vectors`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    productId: product.id,
                    name: product.name,
                    category: product.category,
                    price: product.price,
                    color: product.color,
                    vector: vector,
                    context: context // Salva o contexto para normalização futura
                })
            });

            if (!response.ok) {
                throw new Error(`Failed to save product vector: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error saving product vector:', error);
            throw error;
        }
    }

    /**
     * Busca os N produtos mais próximos de um vetor de usuário
     * @param {Array<number>} userVector - Vetor de embeddings do usuário
     * @param {number} limit - Número de produtos a retornar (padrão: 100)
     * @returns {Promise<Array>} Array de produtos com seus vetores e metadados
     */
    async findSimilarProducts(userVector, limit = 100) {
        try {
            const response = await fetch(`${this.#apiBaseUrl}/products/similar`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    vector: userVector,
                    limit: limit
                })
            });

            if (!response.ok) {
                throw new Error(`Failed to find similar products: ${response.statusText}`);
            }

            const data = await response.json();
            return data.products || [];
        } catch (error) {
            console.error('Error finding similar products:', error);
            throw error;
        }
    }

    /**
     * Obtém o contexto de normalização salvo no banco
     * @returns {Promise<Object>} Contexto com minPrice, maxPrice, etc.
     */
    async getContext() {
        try {
            const response = await fetch(`${this.#apiBaseUrl}/context`);

            if (!response.ok) {
                throw new Error(`Failed to get context: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error getting context:', error);
            return null;
        }
    }

    /**
     * Limpa todos os vetores do banco (útil para retreinamento)
     */
    async clearAllVectors() {
        try {
            const response = await fetch(`${this.#apiBaseUrl}/products/vectors`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                throw new Error(`Failed to clear vectors: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error clearing vectors:', error);
            throw error;
        }
    }
}
