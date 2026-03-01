import { View } from './View.js';

export class IngredientView extends View {
    // DOM elements
    #ingredientList = document.querySelector('#ingredientList');

    #buttons;
    // Templates and callbacks
    #ingredientTemplate;
    #onAddConsumption;

    constructor() {
        super();
        this.init();
    }

    async init() {
        this.#ingredientTemplate = await this.loadTemplate('./src/view/templates/ingredient-card.html');
    }

    onRestaurantSelected(restaurant) {
        // Enable buttons if a restaurant is selected, otherwise disable them
        this.setButtonsState(restaurant.id ? false : true);
    }

    registerAddConsumptionCallback(callback) {
        this.#onAddConsumption = callback;
    }

    render(ingredients, disableButtons = true) {
        if (!this.#ingredientTemplate) return;
        
        // Se não houver ingredientes, mostra mensagem
        if (!ingredients || ingredients.length === 0) {
            if (disableButtons) {
                this.#ingredientList.innerHTML = '<div class="col-12"><div class="alert alert-info" role="alert">Selecione um restaurante para ver seus ingredientes.</div></div>';
            } else {
                this.#ingredientList.innerHTML = '<div class="col-12"><div class="alert alert-warning" role="alert">Este restaurante ainda não possui histórico de consumo. Adicione consumo de ingredientes para que apareçam aqui.</div></div>';
            }
            return;
        }
        
        const html = ingredients.map(ingredient => {
            // Check if this is a prediction result (has predictedQuantity)
            const isPrediction = ingredient.predictedQuantity !== undefined;
            const month = ingredient.month || new Date().toISOString().slice(0, 7);
            
            let template = this.#ingredientTemplate;
            
            // Add prediction info if available
            if (isPrediction) {
                const predictionHtml = `
                <div class="alert alert-info mt-2 mb-2" role="alert">
                    <strong>Quantidade Recomendada:</strong><br>
                    ${ingredient.predictedQuantity.toFixed(1)} ${ingredient.unit || 'kg'}<br>
                    <small>Para: ${month}</small>
                </div>`;
                // Insert prediction HTML after the unit line
                template = template.replace(
                    '<strong>Unidade:</strong> {{unit}}<br>',
                    '<strong>Unidade:</strong> {{unit}}<br>' + predictionHtml
                );
            }
            
            return this.replaceTemplate(template, {
                id: ingredient.id,
                name: ingredient.name,
                category: ingredient.category,
                unit: ingredient.unit || 'kg',
                averagePrice: ingredient.averagePrice,
                month: month,
                ingredient: JSON.stringify(ingredient)
            });
        }).join('');

        this.#ingredientList.innerHTML = html;
        this.attachAddConsumptionButtonListeners();

        // Disable all buttons by default
        this.setButtonsState(disableButtons);
    }

    setButtonsState(disabled) {
        if (!this.#buttons) {
            this.#buttons = document.querySelectorAll('.add-consumption-btn');
        }
        this.#buttons.forEach(button => {
            button.disabled = disabled;
        });
    }

    attachAddConsumptionButtonListeners() {
        this.#buttons = document.querySelectorAll('.add-consumption-btn');
        this.#buttons.forEach(button => {

            button.addEventListener('click', (event) => {
                const ingredient = JSON.parse(button.dataset.ingredient);
                const quantityInput = button.closest('.card').querySelector('.quantity-input');
                const monthInput = button.closest('.card').querySelector('.month-input');
                
                const quantity = parseFloat(quantityInput.value) || 0;
                const month = monthInput.value || new Date().toISOString().slice(0, 7);

                if (quantity > 0) {
                    const originalText = button.innerHTML;

                    button.innerHTML = '<i class="bi bi-check-circle-fill"></i> Adicionado';
                    button.classList.remove('btn-primary');
                    button.classList.add('btn-success');
                    setTimeout(() => {
                        button.innerHTML = originalText;
                        button.classList.remove('btn-success');
                        button.classList.add('btn-primary');
                    }, 500);
                    this.#onAddConsumption(ingredient, quantity, month, button);
                } else {
                    alert('Por favor, insira uma quantidade válida.');
                }

            });
        });
    }
}
