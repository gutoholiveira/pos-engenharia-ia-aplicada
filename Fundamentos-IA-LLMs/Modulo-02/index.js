import tf from '@tensorflow/tfjs-node';

async function trainModel(inputXs, outputYs) {
    const model = tf.sequential();

    /* 
    Primeira camada da rede
    entrada de 7 posições (idade + 3 cores + 3 localidades)

    80 neuronios = essa quantidade pelo tamanho pequeno da base de treino
    quanto mais neuronios, mais complecidade a rede pode aprender
    e consequentemente, mais processamento é necessário

    A ReLU age como um filtro que mantem apenas os dados positivos, 
    os negativos ou zero são descartados
    */
    model.add(tf.layers.dense({
        units: 80,
        inputShape: [7],
        activation: 'relu'
    }));

    /*
    Saída 3 neuronios = 3 categorias de planos

    A softmax normaliza a saida como probabilidade,
    */
    model.add(tf.layers.dense({
        units: 3, 
        activation: 'softmax'
    }));

    /*
    Compilação do modelo

    optimizer: Adam (Adaptative Moment Estimation)
    é um treinador pessoal moderno para redes neurais
    ajusta os pesos de forma eficiente e inteligente
    aprender com historico de erros e acertos

    loss: categoricalCrossentropy
    compara o que o modelo "acha" com a resposta correta
    exemplo premium sempre [1,0,0], medium [0,1,0], basic [0,0,1]

    metrics: ['accuracy']
    quanto mais distante da previsão do modelo da resposta correta
    maior o erro (loss)
    exemplo: classificação de imagens, recomendações, categorias de usuário
    qualquer coisa em que a resposta cera é "apenas uma entre várias possíveis"
    */
    model.compile({
        optimizer: 'adam',
        loss: 'categoricalCrossentropy',
        metrics: ['accuracy']
    });
    
    await model.fit(
        inputXs,
        outputYs,
        {
            verbose: 0, // 0 = sem logs, 1 = logs simples, 2 = logs detalhados
            epochs: 100, // quantidade de vezes que passa pela base de treino
            shuffle: true, // embaralha a base de treino
            callbacks: {
                onEpochEnd: (epoch, logs) => {
                    console.log(`Epoch ${epoch} - Loss: ${logs.loss}`);
                }
            }
        }
    )

    return model;
}

// Exemplo de pessoas para treino (cada pessoa com idade, cor e localização)
// const pessoas = [
//     { nome: "Erick", idade: 30, cor: "azul", localizacao: "São Paulo" },
//     { nome: "Ana", idade: 25, cor: "vermelho", localizacao: "Rio" },
//     { nome: "Carlos", idade: 40, cor: "verde", localizacao: "Curitiba" }
// ];

// Vetores de entrada com valores já normalizados e one-hot encoded
// Fórmula normalização: (valor - min) / (max - min)
// Ordem: [idade_normalizada, azul, vermelho, verde, São Paulo, Rio, Curitiba]
// const tensorPessoas = [
//     [0.33, 1, 0, 0, 1, 0, 0], // Erick
//     [0, 0, 1, 0, 0, 1, 0],    // Ana
//     [1, 0, 0, 1, 0, 0, 1]     // Carlos
// ]

// Usamos apenas os dados numéricos, como a rede neural só entende números.
// tensorPessoasNormalizado corresponde ao dataset de entrada do modelo.
const tensorPessoasNormalizado = [
    [0.33, 1, 0, 0, 1, 0, 0], // Erick
    [0, 0, 1, 0, 0, 1, 0],    // Ana
    [1, 0, 0, 1, 0, 0, 1]     // Carlos
]

// Labels das categorias a serem previstas (one-hot encoded)
// [premium, medium, basic]
const labelsNomes = ["premium", "medium", "basic"]; // Ordem dos labels
const tensorLabels = [
    [1, 0, 0], // premium - Erick
    [0, 1, 0], // medium - Ana
    [0, 0, 1]  // basic - Carlos
];

// Criamos tensores de entrada (xs) e saída (ys) para treinar o modelo
const inputXs = tf.tensor2d(tensorPessoasNormalizado)
const outputYs = tf.tensor2d(tensorLabels)

// Quanto mais dados, melhor
// assim o modelo entende melhor o padrão complexos dos dados
const model = trainModel(inputXs, outputYs);
