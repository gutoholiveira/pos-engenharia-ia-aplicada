import { View } from './View.js';

export class RestaurantView extends View {
    #restaurantSelect = document.querySelector('#restaurantSelect');
    #restaurantCapacity = document.querySelector('#restaurantCapacity');
    #pastConsumptionList = document.querySelector('#pastConsumptionList');

    #consumptionTemplate;
    #onRestaurantSelect;
    #onConsumptionRemove;
    #pastConsumptionElements = [];

    constructor() {
        super();
        this.init();
    }

    async init() {
        this.#consumptionTemplate = await this.loadTemplate('./src/view/templates/past-consumption.html');
        this.attachRestaurantSelectListener();
    }

    registerRestaurantSelectCallback(callback) {
        this.#onRestaurantSelect = callback;
    }

    registerConsumptionRemoveCallback(callback) {
        this.#onConsumptionRemove = callback;
    }

    renderRestaurantOptions(restaurants) {
        const options = restaurants.map(restaurant => {
            return `<option value="${restaurant.id}">${restaurant.name}</option>`;
        }).join('');

        this.#restaurantSelect.innerHTML += options;
    }

    renderRestaurantDetails(restaurant) {
        this.#restaurantCapacity.value = restaurant.capacity;
    }

    renderPastConsumption(pastConsumption) {
        if (!this.#consumptionTemplate) return;

        if (!pastConsumption || pastConsumption.length === 0) {
            this.#pastConsumptionList.innerHTML = '<p>Nenhum consumo histórico encontrado.</p>';
            return;
        }

        const html = pastConsumption.map(consumption => {
            return this.replaceTemplate(this.#consumptionTemplate, {
                ...consumption,
                consumption: JSON.stringify(consumption)
            });
        }).join('');

        this.#pastConsumptionList.innerHTML = html;
        this.attachConsumptionClickHandlers();
    }

    addPastConsumption(consumption) {

        if (this.#pastConsumptionList.innerHTML.includes('Nenhum consumo histórico encontrado')) {
            this.#pastConsumptionList.innerHTML = '';
        }

        const consumptionHtml = this.replaceTemplate(this.#consumptionTemplate, {
            ...consumption,
            consumption: JSON.stringify(consumption)
        });

        this.#pastConsumptionList.insertAdjacentHTML('afterbegin', consumptionHtml);

        const newConsumption = this.#pastConsumptionList.firstElementChild.querySelector('.past-consumption');
        newConsumption.classList.add('past-consumption-highlight');

        setTimeout(() => {
            newConsumption.classList.remove('past-consumption-highlight');
        }, 1000);

        this.attachConsumptionClickHandlers();
    }

    attachRestaurantSelectListener() {
        this.#restaurantSelect.addEventListener('change', (event) => {
            const restaurantId = event.target.value ? Number(event.target.value) : null;

            if (restaurantId) {
                if (this.#onRestaurantSelect) {
                    this.#onRestaurantSelect(restaurantId);
                }
            } else {
                this.#restaurantCapacity.value = '';
                this.#pastConsumptionList.innerHTML = '';
            }
        });
    }

    attachConsumptionClickHandlers() {
        this.#pastConsumptionElements = [];

        const consumptionElements = document.querySelectorAll('.past-consumption');

        consumptionElements.forEach(consumptionElement => {
            this.#pastConsumptionElements.push(consumptionElement);

            consumptionElement.onclick = (event) => {

                const consumption = JSON.parse(consumptionElement.dataset.consumption);
                const restaurantId = this.getSelectedRestaurantId();
                const element = consumptionElement.closest('.col-md-6');

                this.#onConsumptionRemove({ element, restaurantId, consumption });

                element.style.transition = 'opacity 0.5s ease';
                element.style.opacity = '0';

                setTimeout(() => {
                    element.remove();

                    if (document.querySelectorAll('.past-consumption').length === 0) {
                        this.renderPastConsumption([]);
                    }

                }, 500);

            }
        });
    }

    getSelectedRestaurantId() {
        return this.#restaurantSelect.value ? Number(this.#restaurantSelect.value) : null;
    }
}
