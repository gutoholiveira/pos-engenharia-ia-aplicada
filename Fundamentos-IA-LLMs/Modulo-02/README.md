## Módulo 02 – Criando minha primeira rede neural para classificação de planos com TensorFlow.js

Este módulo implementa, em Node.js com `@tensorflow/tfjs-node`, um exemplo completo de rede neural para **classificar planos** (`premium`, `medium`, `basic`) a partir de características de pessoas (idade, cor favorita e cidade).

### Estrutura dos dados

- **Arrays base**
  - `colors`: lista de cores possíveis.
  - `places`: lista de cidades possíveis.
  - `plans`: lista de planos possíveis (`["premium", "medium", "basic"]`).
  - `people`: array de objetos com `{ name, age, color, place, plan }`, usado como base de treino.

- **Codificação dos rótulos (saída)**
  - **Função `getOneHotTensorPlans()`**:
    - Recebe implicitamente o array `people`.
    - Converte o campo `plan` de cada pessoa em um vetor **one‑hot** no formato `[premium, medium, basic]`.
    - O resultado é usado como `outputYs` para o treino (`tf.tensor2d(getOneHotTensorPlans())`).

### Pré-processamento e normalização

- **Faixa de idades**
  - **Função `getMinAndMaxAges()`**:
    - Calcula dinamicamente `min` e `max` a partir de `people`.

- **Normalização da idade**
  - **Função `normalizeAge(age)`**:
    - Aplica a fórmula $(idade - idade\_{min}) / (idade\_{max} - idade\_{min})$.

- **Transformação para entrada numérica**
  - **Função `getNormalizedData(data)`**:
    - Aceita **uma pessoa** ou um **array de pessoas**.
    - Para cada pessoa, gera um vetor:
      - `[ idade_normalizada, one‑hot de cores..., one‑hot de lugares... ]`.
    - Usa:
      - `colors` para criar o one‑hot de `color`.
      - `places` para criar o one‑hot de `place`.
    - É usada tanto para montar o dataset de treino (`getNormalizedData(people)`) quanto para normalizar novas pessoas na predição.

- **Dimensão de entrada**
  - **Função `getInputShape()`**:
    - Retorna `colors.length + places.length + 1` (idade + one‑hot de cores + one‑hot de lugares).
    - O valor é usado em `inputShape: [getInputShape()]` na primeira camada densa.

### Modelo e treino

- **Definição do modelo** – `trainModel(inputXs, outputYs)`
  - Modelo sequencial com duas camadas `dense`:
    - **1ª camada:**
      - `units: 80`
      - `inputShape: [getInputShape()]`
      - `activation: 'relu'`
    - **2ª camada (saída):**
      - `units: 3` (um neurônio por plano: premium, medium, basic)
      - `activation: 'softmax'` (probabilidades).

- **Compilação**
  - `optimizer: 'adam'`
  - `loss: 'categoricalCrossentropy'`
  - `metrics: ['accuracy']`

- **Treino**
  - `model.fit(inputXs, outputYs, { epochs: 100, shuffle: true, verbose: 0 })`.
  - `inputXs`: `tf.tensor2d(getNormalizedData(people))`.
  - `outputYs`: `tf.tensor2d(getOneHotTensorPlans())`.

### Predição

- **Função `predict(model, pessoa)`**:
  - Converte `pessoa` (já em formato numérico) em tensor: `tf.tensor2d(pessoa)`.
  - Executa `model.predict(tfInput)` e devolve um array de `{ prob, index }`.

- **Exemplo de uso em `pratica.js`**:
  - Normaliza uma nova pessoa:
    - `getNormalizedData(new_person)`.
  - Chama `predict(model, getNormalizedData(new_person))`.
  - Ordena as probabilidades em ordem decrescente e imprime:
    - `premium (xx.xx%)`, `medium (yy.yy%)`, `basic (zz.zz%)`.

### Como executar o exemplo

- **Pré-requisitos**
  - Node.js instalado.
  - Dependência `@tensorflow/tfjs-node` instalada:

1. Instala dependencias
   ~~~
   
   npm install
   ~~~
3. Executa o arquivo index.js (arquivo base do curso)
   ~~~

   npm start
   ~~~ 
5. Executa o arquivo pratica (arquivo modificado com complementos)
   ~~~
   
   node pratica.js
   ~~~

