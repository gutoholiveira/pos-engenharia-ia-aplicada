# Sistema de Recomendação de Compras para Restaurantes

Uma aplicação web que exibe perfis de restaurantes e listagens de ingredientes, com a capacidade de rastrear o consumo histórico de ingredientes para recomendar quantidades de compra para os meses seguintes usando TensorFlow.js.

## Estrutura do Projeto

- `index.html` - Arquivo HTML principal da aplicação
- `src/index.js` - Ponto de entrada da aplicação
- `src/view/` - Contém classes para gerenciar o DOM e templates
- `src/controller/` - Contém controladores para conectar views e serviços
- `src/service/` - Contém lógica de negócio para manipulação de dados
- `src/data/` - Contém arquivos JSON com dados de restaurantes e ingredientes
- `src/workers/` - Contém o worker de treinamento do modelo de ML

## Configuração e Execução

1. Instale as dependências:
```
npm install
```

2. Inicie a aplicação:
```
npm start
```

3. Abra seu navegador e navegue para `http://localhost:3000`

## Funcionalidades

- Seleção de perfil de restaurante com exibição de detalhes
- Exibição do histórico de consumo de ingredientes
- Listagem de ingredientes com funcionalidade de adicionar consumo
- Rastreamento de consumo usando sessionStorage
- Modelo de Machine Learning para prever quantidades de compra para meses futuros
- Visualização de recomendações de quantidade por ingrediente

## Melhorias Futuras

- Análise de sazonalidade para previsões mais precisas
- Integração com sistemas de estoque
- Alertas de estoque baixo baseados em previsões
- Análise de tendências de consumo
