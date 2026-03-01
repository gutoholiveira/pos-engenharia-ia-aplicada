export class ModelController {
    #modelView;
    #restaurantService;
    #events;
    #currentRestaurant = null;
    #alreadyTrained = false;
    constructor({
        modelView,
        restaurantService,
        events,
    }) {
        this.#modelView = modelView;
        this.#restaurantService = restaurantService;
        this.#events = events;

        this.init();
    }

    static init(deps) {
        return new ModelController(deps);
    }

    async init() {
        this.setupCallbacks();
    }

    setupCallbacks() {
        this.#modelView.registerTrainModelCallback(this.handleTrainModel.bind(this));
        this.#modelView.registerRunPredictionCallback(this.handleRunPrediction.bind(this));

        this.#events.onRestaurantSelected((restaurant) => {
            this.#currentRestaurant = restaurant;
            if (!this.#alreadyTrained) return
            this.#modelView.enablePredictButton();
        });

        this.#events.onTrainingComplete(() => {
            this.#alreadyTrained = true;
            if (!this.#currentRestaurant) return
            this.#modelView.enablePredictButton();
        })

        this.#events.onRestaurantsUpdated(
            async (...data) => {
                return this.refreshRestaurantsConsumptionData(...data);
            }
        );
        this.#events.onProgressUpdate(
            (progress) => {
                this.handleTrainingProgressUpdate(progress);
            }
        );

    }


    async handleTrainModel() {
        const restaurants = await this.#restaurantService.getRestaurants();

        this.#events.dispatchTrainModel(restaurants);
    }

    handleTrainingProgressUpdate(progress) {
        this.#modelView.updateTrainingProgress(progress);
    }
    async handleRunPrediction() {
        const currentRestaurant = this.#currentRestaurant;
        const updatedRestaurant = await this.#restaurantService.getRestaurantById(currentRestaurant.id);
        // Get next month for prediction
        const nextMonth = new Date();
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        const targetMonth = nextMonth.toISOString().slice(0, 7);
        this.#events.dispatchPredict({ restaurant: updatedRestaurant, targetMonth });
    }

    async refreshRestaurantsConsumptionData({ restaurants }) {
        this.#modelView.renderAllRestaurantsConsumption(restaurants);
    }
}
