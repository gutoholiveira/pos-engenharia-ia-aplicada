import 'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/dist/tf.min.js';
import { workerEvents } from '../events/constants.js';

console.log('Model training worker initialized');
let _globalCtx = {};
let _model = null;

const WEIGHTS = {
    category: 0.3,
    capacity: 0.4,
    price: 0.2,
    month: 0.1,
};

// 🔢 Normalize continuous values to 0–1 range
const normalize = (value, min, max) => (value - min) / ((max - min) || 1);

const oneHotWeighted = (index, length, weight) =>
    tf.oneHot(index, length).cast('float32').mul(weight);

function makeContext(ingredients, restaurants) {
    const capacities = restaurants.map(r => r.capacity);
    const prices = ingredients.map(i => i.averagePrice);
    
    // Extract all quantities for normalization
    const allQuantities = [];
    restaurants.forEach(restaurant => {
        restaurant.consumption.forEach(consumption => {
            allQuantities.push(consumption.quantity);
        });
    });

    const minCapacity = Math.min(...capacities);
    const maxCapacity = Math.max(...capacities);

    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);

    const minQuantity = allQuantities.length > 0 ? Math.min(...allQuantities) : 0;
    const maxQuantity = allQuantities.length > 0 ? Math.max(...allQuantities) : 1000;

    const categories = [...new Set(ingredients.map(i => i.category))];
    
    // Extract unique months
    const months = [...new Set(restaurants.flatMap(r => r.consumption.map(c => c.month)))];
    months.sort();

    const categoriesIndex = Object.fromEntries(
        categories.map((category, index) => {
            return [category, index];
        })
    );

    const monthsIndex = Object.fromEntries(
        months.map((month, index) => {
            return [month, index];
        })
    );

    // Compute average quantity per ingredient by restaurant capacity
    const capacitySums = {};
    const capacityCounts = {};

    restaurants.forEach(restaurant => {
        restaurant.consumption.forEach(consumption => {
            const key = `${consumption.id}_${restaurant.capacity}`;
            capacitySums[key] = (capacitySums[key] || 0) + consumption.quantity;
            capacityCounts[key] = (capacityCounts[key] || 0) + 1;
        });
    });

    const ingredientAvgQuantityNorm = Object.fromEntries(
        ingredients.map(ingredient => {
            const relevantKeys = Object.keys(capacitySums).filter(k => k.startsWith(`${ingredient.id}_`));
            if (relevantKeys.length === 0) {
                return [ingredient.id, 0.5]; // Default normalized quantity
            }
            const totalSum = relevantKeys.reduce((sum, key) => sum + capacitySums[key], 0);
            const totalCount = relevantKeys.reduce((sum, key) => sum + capacityCounts[key], 0);
            const avg = totalCount > 0 ? totalSum / totalCount : 0;
            return [ingredient.id, normalize(avg, minQuantity, maxQuantity)];
        })
    );

    return {
        ingredients,
        restaurants,
        categoriesIndex,
        monthsIndex,
        ingredientAvgQuantityNorm,
        minCapacity,
        maxCapacity,
        minPrice,
        maxPrice,
        minQuantity,
        maxQuantity,
        numCategories: categories.length,
        numMonths: months.length,
        // capacity + price + category + month
        dimentions: 2 + categories.length + months.length
    }
}

function encodeIngredient(ingredient, context) {
    const price = tf.tensor1d([
        normalize(
            ingredient.averagePrice,
            context.minPrice,
            context.maxPrice
        ) * WEIGHTS.price
    ]);

    const category = oneHotWeighted(
        context.categoriesIndex[ingredient.category],
        context.numCategories,
        WEIGHTS.category
    );

    // Month encoding will be added when predicting for specific month
    const monthPlaceholder = tf.zeros([context.numMonths]);

    return tf.concat1d([price, category, monthPlaceholder]);
}

function encodeRestaurant(restaurant, context) {
    if (restaurant.consumption && restaurant.consumption.length > 0) {
        const capacity = tf.tensor1d([
            normalize(restaurant.capacity, context.minCapacity, context.maxCapacity) * WEIGHTS.capacity
        ]);

        // Average consumption pattern
        const avgQuantity = restaurant.consumption.reduce((sum, c) => sum + c.quantity, 0) / restaurant.consumption.length;
        const quantityNorm = tf.tensor1d([
            normalize(avgQuantity, context.minQuantity, context.maxQuantity) * 0.3
        ]);

        // Category preferences from consumption
        const categoryCounts = {};
        restaurant.consumption.forEach(c => {
            const ingredient = context.ingredients.find(i => i.id === c.id);
            if (ingredient) {
                categoryCounts[ingredient.category] = (categoryCounts[ingredient.category] || 0) + 1;
            }
        });

        const categoryVector = Array(context.numCategories).fill(0);
        Object.keys(categoryCounts).forEach(cat => {
            const index = context.categoriesIndex[cat];
            if (index !== undefined) {
                categoryVector[index] = categoryCounts[cat] / restaurant.consumption.length;
            }
        });
        const category = tf.tensor1d(categoryVector).mul(WEIGHTS.category);

        return tf.concat1d([capacity, quantityNorm, category]);
    }

    // Default encoding for restaurant with no consumption history
    const capacity = tf.tensor1d([
        normalize(restaurant.capacity, context.minCapacity, context.maxCapacity) * WEIGHTS.capacity
    ]);
    const quantityNorm = tf.zeros([1]);
    const category = tf.zeros([context.numCategories]);

    return tf.concat1d([capacity, quantityNorm, category]);
}

function encodeMonth(month, context) {
    const monthIndex = context.monthsIndex[month] || 0;
    return oneHotWeighted(monthIndex, context.numMonths, WEIGHTS.month);
}

function createTrainingData(context) {
    const inputs = [];
    const labels = [];

    context.restaurants
        .filter(r => r.consumption && r.consumption.length > 0)
        .forEach(restaurant => {
            const restaurantVector = encodeRestaurant(restaurant, context).dataSync();

            restaurant.consumption.forEach(consumption => {
                const ingredient = context.ingredients.find(i => i.id === consumption.id);
                if (!ingredient) return;

                const ingredientVector = encodeIngredient(ingredient, context).dataSync();
                const monthVector = encodeMonth(consumption.month, context).dataSync();

                // Combine restaurant + ingredient + month
                const combinedVector = [...restaurantVector, ...ingredientVector.slice(0, -context.numMonths), ...monthVector];
                inputs.push(combinedVector);

                // Normalize quantity for training
                const normalizedQuantity = normalize(
                    consumption.quantity,
                    context.minQuantity,
                    context.maxQuantity
                );
                labels.push(normalizedQuantity);
            });
        });

    return {
        xs: tf.tensor2d(inputs),
        ys: tf.tensor2d(labels, [labels.length, 1]),
        inputDimention: inputs[0]?.length || 0
    };
}

async function configureNeuralNetAndTrain(trainData) {
    const model = tf.sequential();

    // Input layer
    model.add(tf.layers.dense({
        inputShape: [trainData.inputDimention],
        units: 128,
        activation: 'relu'
    }));

    // Hidden layer 1
    model.add(tf.layers.dense({
        units: 64,
        activation: 'relu'
    }));

    // Hidden layer 2
    model.add(tf.layers.dense({
        units: 32,
        activation: 'relu'
    }));

    // Output layer - regression (predict quantity)
    model.add(tf.layers.dense({
        units: 1,
        activation: 'linear' // Linear activation for regression
    }));

    model.compile({
        optimizer: tf.train.adam(0.01),
        loss: 'meanSquaredError', // MSE for regression
        metrics: ['mse']
    });

    await model.fit(trainData.xs, trainData.ys, {
        epochs: 100,
        batchSize: 32,
        shuffle: true,
        callbacks: {
            onEpochEnd: (epoch, logs) => {
                
                postMessage({
                    type: workerEvents.trainingLog,
                    epoch: epoch,
                    loss: logs.loss,
                    accuracy: logs.mse,
                    mse: logs.mse
                });
            }
        }
    });

    return model;
}

async function trainModel({ restaurants }) {
    console.log('Training model with restaurants:', restaurants);

    postMessage({ type: workerEvents.progressUpdate, progress: { progress: 50 } });

    const ingredients = await (await fetch('/data/ingredients.json')).json();
    const context = makeContext(ingredients, restaurants);

    context.ingredientVectors = ingredients.map(ingredient => {
        return {
            name: ingredient.name,
            meta: {...ingredient},
            vector: encodeIngredient(ingredient, context).dataSync()
        };
    });

    _globalCtx = context;

    const trainData = createTrainingData(context);

    if (trainData.xs.shape[0] === 0) {
        console.warn('No training data available');
        postMessage({ type: workerEvents.progressUpdate, progress: { progress: 100 } });
        postMessage({ type: workerEvents.trainingComplete });
        return;
    }

    _model = await configureNeuralNetAndTrain(trainData);

    postMessage({ type: workerEvents.progressUpdate, progress: { progress: 100 } });
    postMessage({ type: workerEvents.trainingComplete });
}

function predict(restaurant, targetMonth) {
    if (!_model) return;

    const context = _globalCtx;
    const restaurantVector = encodeRestaurant(restaurant, context).dataSync();

    // Predict for all ingredients for the target month
    const monthVector = encodeMonth(targetMonth, context).dataSync();

    const inputs = context.ingredientVectors.map(({ vector }) => {
        // Remove month placeholder and add actual month encoding
        const ingredientVectorWithoutMonth = vector.slice(0, -context.numMonths);
        return [...restaurantVector, ...ingredientVectorWithoutMonth, ...monthVector];
    });

    const inputTensor = tf.tensor2d(inputs);
    const predictions = _model.predict(inputTensor);

    // Denormalize predictions
    const normalizedQuantities = predictions.dataSync();
    const quantities = normalizedQuantities.map(normQty => {
        const denormalized = normQty * (context.maxQuantity - context.minQuantity) + context.minQuantity;
        return Math.max(0, Math.round(denormalized * 10) / 10); // Round to 1 decimal, ensure non-negative
    });

    const predictionsWithQuantities = context.ingredientVectors.map((item, index) => {
        return {
            ...item.meta,
            name: item.name,
            predictedQuantity: quantities[index],
            unit: item.meta.unit || 'kg',
            month: targetMonth
        };
    });

    // Sort by predicted quantity (descending)
    const sortedPredictions = predictionsWithQuantities.sort((a, b) => b.predictedQuantity - a.predictedQuantity);

    postMessage({
        type: workerEvents.predict,
        restaurant,
        predictions: sortedPredictions,
        targetMonth
    });
}

const handlers = {
    [workerEvents.trainModel]: trainModel,
    [workerEvents.predict]: d => {
        const targetMonth = d.targetMonth || new Date().toISOString().slice(0, 7);
        predict(d.restaurant, targetMonth);
    },
};

self.onmessage = e => {
    const { action, ...data } = e.data;
    if (handlers[action]) handlers[action](data);
};
