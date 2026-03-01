export class IngredientService {
    async getIngredients() {
        const response = await fetch('./data/ingredients.json');
        return await response.json();
    }

    async getIngredientById(id) {
        const ingredients = await this.getIngredients();
        return ingredients.find(ingredient => ingredient.id === id);
    }

    async getIngredientsByIds(ids) {
        const ingredients = await this.getIngredients();
        return ingredients.filter(ingredient => ids.includes(ingredient.id));
    }
}
