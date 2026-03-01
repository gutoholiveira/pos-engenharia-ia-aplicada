export class RestaurantService {
    #storageKey = 'restaurant-consumption-data';

    async getDefaultRestaurants() {
        const response = await fetch('./data/restaurants.json');
        const restaurants = await response.json();
        this.#setStorage(restaurants);

        return restaurants;
    }

    async getRestaurants() {
        const restaurants = this.#getStorage();
        return restaurants;
    }

    async getRestaurantById(restaurantId) {
        const restaurants = this.#getStorage();
        return restaurants.find(restaurant => restaurant.id === restaurantId);
    }

    async updateRestaurant(restaurant) {
        const restaurants = this.#getStorage();
        const restaurantIndex = restaurants.findIndex(r => r.id === restaurant.id);

        restaurants[restaurantIndex] = { ...restaurants[restaurantIndex], ...restaurant };
        this.#setStorage(restaurants);

        return restaurants[restaurantIndex];
    }

    async addRestaurant(restaurant) {
        const restaurants = this.#getStorage();
        this.#setStorage([restaurant, ...restaurants]);
    }

    #getStorage() {
        const data = sessionStorage.getItem(this.#storageKey);
        return data ? JSON.parse(data) : [];
    }

    #setStorage(data) {
        sessionStorage.setItem(this.#storageKey, JSON.stringify(data));
    }


}
