import { View } from './View.js';

export class ModelView extends View {
    #trainModelBtn = document.querySelector('#trainModelBtn');
    #consumptionArrow = document.querySelector('#consumptionArrow');
    #consumptionDiv = document.querySelector('#consumptionDiv');
    #allRestaurantsConsumptionList = document.querySelector('#allRestaurantsConsumptionList');
    #runPredictionBtn = document.querySelector('#runPredictionBtn');
    #onTrainModel;
    #onRunPrediction;

    constructor() {
        super();
        this.attachEventListeners();
    }

    registerTrainModelCallback(callback) {
        this.#onTrainModel = callback;
    }
    registerRunPredictionCallback(callback) {
        this.#onRunPrediction = callback;
    }

    attachEventListeners() {
        this.#trainModelBtn.addEventListener('click', () => {
            this.#onTrainModel();
        });
        this.#runPredictionBtn.addEventListener('click', () => {
            this.#onRunPrediction();
        });

        this.#consumptionDiv.addEventListener('click', () => {
            const consumptionList = this.#allRestaurantsConsumptionList;

            const isHidden = window.getComputedStyle(consumptionList).display === 'none';

            if (isHidden) {
                consumptionList.style.display = 'block';
                this.#consumptionArrow.classList.remove('bi-chevron-down');
                this.#consumptionArrow.classList.add('bi-chevron-up');
            } else {
                consumptionList.style.display = 'none';
                this.#consumptionArrow.classList.remove('bi-chevron-up');
                this.#consumptionArrow.classList.add('bi-chevron-down');
            }
        });

    }
    enablePredictButton() {
        this.#runPredictionBtn.disabled = false;
    }
    updateTrainingProgress(progress) {
        this.#trainModelBtn.disabled = true;
        this.#trainModelBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Treinando...';

        if (progress.progress === 100) {
            this.#trainModelBtn.disabled = false;
            this.#trainModelBtn.innerHTML = '<i class="bi bi-cpu"></i> Treinar Modelo';
        }
    }

    renderAllRestaurantsConsumption(restaurants) {
        const html = restaurants.map(restaurant => {
            const consumptionHtml = restaurant.consumption.map(consumption => {
                return `<span class="badge bg-light text-dark me-1 mb-1">${consumption.name}: ${consumption.quantity}${consumption.unit} (${consumption.month})</span>`;
            }).join('');

            return `
                <div class="restaurant-consumption-summary">
                    <h6>${restaurant.name} (Capacidade: ${restaurant.capacity})</h6>
                    <div class="consumption-badges">
                        ${consumptionHtml || '<span class="text-muted">Nenhum consumo registrado</span>'}
                    </div>
                </div>
            `;
        }).join('');

        this.#allRestaurantsConsumptionList.innerHTML = html;
    }
}
