export const events = {
    restaurantSelected: 'restaurant:selected',
    restaurantsUpdated: 'restaurants:updated',
    consumptionAdded: 'consumption:added',
    consumptionRemoved: 'consumption:remove',
    modelTrain: 'training:train',
    trainingComplete: 'training:complete',

    modelProgressUpdate: 'model:progress-update',
    predictionsReady: 'predictions:ready',
    predict: 'predict',
    tfvisLogs: 'tfvis:logs',
    tfvisData: 'tfvis:data',
}

export const workerEvents = {
    trainingComplete: 'training:complete',
    trainModel: 'train:model',
    predict: 'predict',
    trainingLog: 'training:log',
    progressUpdate: 'progress:update',
    tfVisData: 'tfvis:data',
    tfVisLogs: 'tfvis:logs',
}
