import tf from '@tensorflow/tfjs-node';

const colors = ['blue', 'red', 'green', 'black', 'white', 'yellow', 'purple', 'orange', 'pink', 'gray', 'brown', 'turquoise'];
const places = ['São Paulo', 'Rio de Janeiro', 'Curitiba', 'Belo Horizonte', 'Porto Alegre', 'Salvador', 'Florianópolis'];
const plans = ["premium", "medium", "basic"];

const people = [
    { name: "Erick", age: 58, color: "blue", place: "São Paulo", plan: "premium" },
    { name: "Ana", age: 25, color: "red", place: "Rio de Janeiro", plan: "medium" },
    { name: "Carlos", age: 40, color: "green", place: "Curitiba", plan: "medium" },
    { name: "Mariana", age: 28, color: "yellow", place: "Belo Horizonte", plan: "premium" },
    { name: "João", age: 35, color: "black", place: "Porto Alegre", plan: "basic" },
    { name: "Fernanda", age: 18, color: "purple", place: "Salvador", plan: "premium" },
    { name: "Lucas", age: 31, color: "orange", place: "Florianópolis", plan: "premium" },
    { name: "Patrícia", age: 27, color: "pink", place: "Curitiba", plan: "basic" },
    { name: "Rafael", age: 45, color: "gray", place: "Porto Alegre", plan: "medium" },
    { name: "Juliana", age: 29, color: "white", place: "Florianópolis", plan: "premium" },
    { name: "Bruno", age: 51, color: "brown", place: "São Paulo", plan: "basic" },
    { name: "Camila", age: 26, color: "turquoise", place: "Curitiba", plan: "basic" }
];

// Retorna a estrutura de planos em formato one-hot [premium, medium, basic]
function getOneHotTensorPlans() {
    return people.map(person => {
        const planIndex = plans.indexOf(person.plan);

        return plans.map((_, index) =>
            index === planIndex ? 1 : 0
        );
    });
}

// Retorna a idade mínima e máxima do array de pessoas
function getMinAndMaxAges() {
    const ages = people.map(person => person.age);
    const min = Math.min(...ages);
    const max = Math.max(...ages);

    return { min, max };
}

// Normaliza a idade usando a fórmula (idade - idade_min) / (idade_max - idade_min)
function normalizeAge(age) {
    const { min, max } = getMinAndMaxAges();
    return (age - min) / (max - min);
}

// Retorna os dados normalizados no formato numérico para tensor
// [ idade_normalizada, one-hot de cores..., one-hot de lugares... ]
function getNormalizedData(data) {
    // Verifica se 'data' é uma matriz, se não for, transforma em matriz com um elemento
    if (!Array.isArray(data)) {
        data = [data];
    }

    return data.map(person => {
        const idadeNormalizada = normalizeAge(person.age);

        // One-hot para cor
        const colorVector = colors.map(colorName =>
            colorName === person.color ? 1 : 0
        );

        // One-hot para local
        const placeVector = places.map(placeName =>
            placeName === person.place ? 1 : 0
        );

        return [idadeNormalizada, ...colorVector, ...placeVector];
    });
}

// Retorna um contador de campos para total_cores + total_lugares + idade
function getInputShape() {
    return colors.length + places.length + 1;
}

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
        inputShape: [getInputShape()],
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
                // onEpochEnd: (epoch, logs) => {
                //     console.log(`Epoch ${epoch} - Loss: ${logs.loss}`);
                // }
            }
        }
    )

    return model;
}

async function predict(model, pessoa) {
    // transformar o array js  para o tensor
    const tfInput = tf.tensor2d(pessoa);

    // faz a predição (output sera um vetor de 3 probabilidades)
    const pred = model.predict(tfInput);
    const predArray = await pred.array();

    return predArray[0].map((prob, index) => ({ prob, index }));
}

// Criamos tensores de entrada (xs) e saída (ys) para treinar o modelo
const inputXs = tf.tensor2d(getNormalizedData(people))
const outputYs = tf.tensor2d(getOneHotTensorPlans())

// Quanto mais dados, melhor
// assim o modelo entende melhor o padrão complexos dos dados
const model = await trainModel(inputXs, outputYs);

const new_person = { name: "Eduardo", age: 53, color: "white", place: "Porto Alegre" };

const predictions_new_person = await predict(model, getNormalizedData(new_person));

const results_new_person = predictions_new_person
.sort((a, b) => b.prob - a.prob)
.map(p => `${plans[p.index]} (${(p.prob * 100).toFixed(2)}%)`)
.join('\n');

console.log(`Resultados de nova pessoa - ${new_person.name} \n ${results_new_person}`);
