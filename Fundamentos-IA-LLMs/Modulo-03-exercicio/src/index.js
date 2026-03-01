import { RestaurantController } from './controller/RestaurantController.js';
import { IngredientController } from './controller/IngredientController.js';
import { ModelController } from './controller/ModelTrainingController.js';
import { TFVisorController } from './controller/TFVisorController.js';
import { TFVisorView } from './view/TFVisorView.js';
import { RestaurantService } from './service/RestaurantService.js';
import { IngredientService } from './service/IngredientService.js';
import { RestaurantView } from './view/RestaurantView.js';
import { IngredientView } from './view/IngredientView.js';
import { ModelView } from './view/ModelTrainingView.js';
import Events from './events/events.js';
import { WorkerController } from './controller/WorkerController.js';

// Create shared services
const restaurantService = new RestaurantService();
const ingredientService = new IngredientService();

// Create views
const restaurantView = new RestaurantView();
const ingredientView = new IngredientView();
const modelView = new ModelView();
const tfVisorView = new TFVisorView();
const mlWorker = new Worker('/src/workers/modelTrainingWorker.js', { type: 'module' });

// Set up worker message handler
const w = WorkerController.init({
    worker: mlWorker,
    events: Events
});

const restaurants = await restaurantService.getDefaultRestaurants();
w.triggerTrain(restaurants);


ModelController.init({
    modelView,
    restaurantService,
    events: Events,
});

TFVisorController.init({
    tfVisorView,
    events: Events,
});

IngredientController.init({
    ingredientView,
    restaurantService,
    ingredientService,
    events: Events,
});


const restaurantController = RestaurantController.init({
    restaurantView,
    restaurantService,
    events: Events,
});


restaurantController.renderRestaurants({
    "id": 99,
    "name": "Restaurante Novo",
    "capacity": 100,
    "consumption": []
});
