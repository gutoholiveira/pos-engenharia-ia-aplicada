export class RestaurantController {
    #restaurantService;
    #restaurantView;
    #events;
    constructor({
        restaurantView,
        restaurantService,
        events,
    }) {
        this.#restaurantView = restaurantView;
        this.#restaurantService = restaurantService;
        this.#events = events;
    }

    static init(deps) {
        return new RestaurantController(deps);
    }

    async renderRestaurants(nonTrainedRestaurant) {
        const restaurants = await this.#restaurantService.getDefaultRestaurants();

        this.#restaurantService.addRestaurant(nonTrainedRestaurant);
        const defaultAndNonTrained = [nonTrainedRestaurant, ...restaurants];

        this.#restaurantView.renderRestaurantOptions(defaultAndNonTrained);
        this.setupCallbacks();
        this.setupConsumptionObserver();

        this.#events.dispatchRestaurantsUpdated({ restaurants: defaultAndNonTrained });

    }

    setupCallbacks() {
        this.#restaurantView.registerRestaurantSelectCallback(this.handleRestaurantSelect.bind(this));
        this.#restaurantView.registerConsumptionRemoveCallback(this.handleConsumptionRemove.bind(this));
    }

    setupConsumptionObserver() {

        this.#events.onConsumptionAdded(
            async (...data) => {
                return this.handleConsumptionAdded(...data);
            }
        );

    }

    async handleRestaurantSelect(restaurantId) {
        const restaurant = await this.#restaurantService.getRestaurantById(restaurantId);
        this.#events.dispatchRestaurantSelected(restaurant);
        return this.displayRestaurantDetails(restaurant);
    }

    async handleConsumptionAdded({ restaurant, ingredient, quantity, month }) {
        const updatedRestaurant = await this.#restaurantService.getRestaurantById(restaurant.id);
        updatedRestaurant.consumption.push({
            ...ingredient,
            quantity: quantity,
            month: month
        })

        await this.#restaurantService.updateRestaurant(updatedRestaurant);

        const lastConsumption = updatedRestaurant.consumption[updatedRestaurant.consumption.length - 1];
        this.#restaurantView.addPastConsumption(lastConsumption);
        this.#events.dispatchRestaurantsUpdated({ restaurants: await this.#restaurantService.getRestaurants() });
    }

    async handleConsumptionRemove({ restaurantId, consumption }) {
        const restaurant = await this.#restaurantService.getRestaurantById(restaurantId);
        const index = restaurant.consumption.findIndex(item => 
            item.id === consumption.id && item.month === consumption.month
        );

        if (index !== -1) {
            restaurant.consumption.splice(index, 1);
            await this.#restaurantService.updateRestaurant(restaurant);

            const updatedRestaurants = await this.#restaurantService.getRestaurants();
            this.#events.dispatchRestaurantsUpdated({ restaurants: updatedRestaurants });
        }
    }


    async displayRestaurantDetails(restaurant) {
        this.#restaurantView.renderRestaurantDetails(restaurant);
        this.#restaurantView.renderPastConsumption(restaurant.consumption);

    }

    getSelectedRestaurantId() {
        return this.#restaurantView.getSelectedRestaurantId();
    }
}
