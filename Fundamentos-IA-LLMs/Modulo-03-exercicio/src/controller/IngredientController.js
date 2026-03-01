export class IngredientController {
    #ingredientView;
    #currentRestaurant = null;
    #events;
    #ingredientService;
    #restaurantService;
    #allIngredients = [];
    constructor({
        ingredientView,
        events,
        ingredientService,
        restaurantService
    }) {
        this.#ingredientView = ingredientView;
        this.#ingredientService = ingredientService;
        this.#restaurantService = restaurantService;
        this.#events = events;
        this.init();
    }

    static init(deps) {
        return new IngredientController(deps);
    }

    async init() {
        this.setupCallbacks();
        this.setupEventListeners();
        this.#allIngredients = await this.#ingredientService.getIngredients();
        // Inicialmente não mostra ingredientes até que um restaurante seja selecionado
        this.#ingredientView.render([], true);
    }

    /**
     * Filtra ingredientes baseado no histórico de consumo do restaurante
     */
    getRestaurantIngredients(restaurant) {
        if (!restaurant || !restaurant.consumption || restaurant.consumption.length === 0) {
            return [];
        }

        // Extrai IDs únicos de ingredientes do histórico de consumo
        const usedIngredientIds = [...new Set(restaurant.consumption.map(c => c.id))];
        
        // Filtra ingredientes que o restaurante já utilizou
        const restaurantIngredients = this.#allIngredients.filter(ingredient => 
            usedIngredientIds.includes(ingredient.id)
        );

        return restaurantIngredients;
    }

    setupEventListeners() {

        this.#events.onRestaurantSelected(async (restaurant) => {
            this.#currentRestaurant = restaurant;
            this.#ingredientView.onRestaurantSelected(restaurant);
            
            // Filtra e exibe apenas ingredientes que o restaurante utiliza
            const restaurantIngredients = this.getRestaurantIngredients(restaurant);
            this.#ingredientView.render(restaurantIngredients, false);
        })

        this.#events.onPredictionsReady(({ predictions }) => {
            // Filtra previsões para mostrar apenas ingredientes que o restaurante utiliza
            if (this.#currentRestaurant) {
                const restaurantIngredientIds = new Set(
                    this.getRestaurantIngredients(this.#currentRestaurant).map(i => i.id)
                );
                const filteredPredictions = predictions.filter(p => 
                    restaurantIngredientIds.has(p.id)
                );
                this.#ingredientView.render(filteredPredictions, false);
            }
        });

        // Quando o consumo é atualizado, atualiza a lista de ingredientes
        this.#events.onRestaurantsUpdated(async ({ restaurants }) => {
            if (this.#currentRestaurant && restaurants) {
                // Encontra o restaurante atualizado na lista
                const updatedRestaurant = restaurants.find(r => r.id === this.#currentRestaurant.id);
                if (updatedRestaurant) {
                    this.#currentRestaurant = updatedRestaurant;
                    const restaurantIngredients = this.getRestaurantIngredients(updatedRestaurant);
                    this.#ingredientView.render(restaurantIngredients, false);
                }
            }
        });
    }

    setupCallbacks() {
        this.#ingredientView.registerAddConsumptionCallback(this.handleAddConsumption.bind(this));
    }

    async handleAddConsumption(ingredient, quantity, month) {
        const restaurant = this.#currentRestaurant;
        this.#events.dispatchConsumptionAdded({ restaurant, ingredient, quantity, month });
    }

}
