# Backend do Editor de Texto Colaborativo

Este repositório contém o código do backend da aplicação de editor de texto colaborativo em tempo real. Ele é responsável por gerenciar documentos, persistir dados no banco de dados e coordenar a colaboração em tempo real entre os utilizadores.

## 1. Processo de Trabalho e Escolhas Tecnológicas

Para este desafio, optei por uma **stack moderna e robusta**, ideal para aplicações web em tempo real:

* **Node.js:** Como ambiente de execução JavaScript no servidor, escolhido pela sua performance assíncrona e ecossistema rico de pacotes (NPM).
* **Express.js:** Um framework web minimalista e flexível para Node.js, utilizado para construir a API RESTful de forma eficiente e com grande controle sobre as rotas e middlewares.
* **MySQL:** Um sistema de gerenciamento de banco de dados relacional (RDBMS) robusto e amplamente utilizado, selecionado para a persistência dos dados dos documentos devido à sua confiabilidade e capacidade de lidar com dados textuais longos.
* **Sequelize:** Um ORM (Object-Relational Mapper) para Node.js, usado para interagir com o MySQL. Ele simplifica as operações de banco de dados ao permitir que se trabalhe com objetos JavaScript em vez de escrever SQL diretamente, o que aumenta a produtividade e a legibilidade do código.
* **Socket.IO:** Uma biblioteca popular para comunicação bidirecional em tempo real (WebSockets), essencial para a funcionalidade colaborativa do editor. Ele gerencia as conexões persistentes e a troca de mensagens entre o servidor e os clientes.

O processo de trabalho foi dividido em etapas para garantir o foco nas funcionalidades essenciais:

1.  **Configuração Inicial:** Configuração do projeto Node.js, Express e conexão com MySQL via Sequelize.
2.  **Gerenciamento de Documentos (API REST):** Implementação dos endpoints para criar, listar e buscar documentos, com persistência no MySQL.
3.  **Colaboração em Tempo Real (Socket.IO):** Configuração do Socket.IO para lidar com as conexões em tempo real, recebimento de alterações e propagação para outros clientes.
4.  **Funcionalidade "Utilizadores Ativos":** Adição da lógica para rastrear e exibir os utilizadores que estão editando um documento em tempo real, utilizando nomes de utilizador em vez de IDs de socket.
5.  **Refatoração e Organização:** Estruturação do código em pastas (controllers, models, services, routes, config) para melhor organização e separação de responsabilidades.

## 2. Decisões Arquiteturais

A arquitetura do backend segue um modelo **modular/por camadas**, visando a clareza, manutenibilidade e escalabilidade:

* **`src/app.js`**: Ponto de entrada da aplicação, responsável por iniciar o servidor Express, conectar ao banco de dados e inicializar o Socket.IO.
* **`src/config/`**: Contém as configurações do banco de dados e outras configurações de ambiente.
* **`src/models/`**: Define os modelos de dados (ex: `Document.js`) utilizando Sequelize, que mapeiam as tabelas do banco de dados para objetos JavaScript.
* **`src/controllers/`**: Contém a lógica de negócio principal para cada recurso (ex: `documentController.js`), respondendo às requisições HTTP recebidas pelas rotas.
* **`src/routes/`**: Define as rotas da API REST (`/api/documents`), mapeando os endpoints para os controladores correspondentes.
* **`src/services/`**: Contém a lógica específica do Socket.IO (`socketService.js`), gerenciando as conexões em tempo real, as "salas" de documento e a lógica de propagação de alterações e utilizadores ativos. Essa separação ajuda a manter a lógica de tempo real distinta da lógica de API REST.

**Resolução de Conflitos (Considerações):**

A implementação atual adota uma abordagem simplificada para resolução de conflitos: a **última alteração recebida no servidor prevalece** (`Last-Writer-Wins` ou sobrescrita simples). Quando um cliente envia uma mudança, o backend atualiza o conteúdo do documento no MySQL e propaga essa versão para todos os outros clientes.

Para um sistema mais robusto, seriam necessárias estratégias avançadas como:

* **Operational Transformation (OT):** Utilizada em editores como o Google Docs, onde as operações (inserção, exclusão) são transformadas para que possam ser aplicadas de forma consistente, independentemente da ordem de chegada.
* **Conflict-free Replicated Data Types (CRDTs):** Tipos de dados que permitem a edição concorrente em réplicas distribuídas sem a necessidade de um servidor central para resolver conflitos de forma determinística.

A escolha pela sobrescrita simples foi feita para focar na funcionalidade principal do desafio, mas a arquitetura está preparada para futuras expansões que envolvam lógicas de concorrência mais complexas.

## 3. Modelo de Dados

O banco de dados MySQL contém a tabela principal para armazenar os documentos:

### `documents`

| Campo       | Tipo              | Descrição                                         |
| :---------- | :---------------- | :------------------------------------------------ |
| `id`        | `UUID` (String)   | Identificador único do documento (Gerado pelo Sequelize) |
| `title`     | `VARCHAR(255)`    | Título do documento                               |
| `content`   | `LONGTEXT`        | Conteúdo textual completo do documento (pode ser longo) |
| `createdAt` | `DATETIME`        | Carimbo de data/hora de criação                   |
| `updatedAt` | `DATETIME`        | Carimbo de data/hora da última atualização        |

## 4. Design da API

A API RESTful do backend lida com o gerenciamento de documentos. A comunicação em tempo real é tratada separadamente pelo Socket.IO.

### Endpoints da API REST (Express.js)

* **`POST /api/documents`**
    * **Descrição:** Cria um novo documento.
    * **Corpo da Requisição (JSON):**
        ```json
        {
          "title": "Meu Novo Documento"
        }
        ```
    * **Resposta (JSON):** Retorna os detalhes do documento criado, incluindo o `id`.
        ```json
        {
          "id": "uuid-do-documento",
          "title": "Meu Novo Documento",
          "content": "",
          "createdAt": "...",
          "updatedAt": "..."
        }
        ```
* **`GET /api/documents`**
    * **Descrição:** Lista todos os documentos existentes.
    * **Resposta (JSON):** Um array de objetos de documento (apenas `id`, `title`, `createdAt`, `updatedAt`).
        ```json
        [
          {
            "id": "uuid-do-documento-1",
            "title": "Documento A",
            "createdAt": "...",
            "updatedAt": "..."
          },
          {
            "id": "uuid-do-documento-2",
            "title": "Documento B",
            "createdAt": "...",
            "updatedAt": "..."
          }
        ]
        ```
* **`GET /api/documents/:id`**
    * **Descrição:** Recupera o conteúdo completo de um documento específico.
    * **Parâmetros de Rota:** `id` (UUID do documento).
    * **Resposta (JSON):** Os detalhes completos do documento, incluindo o `content`.
        ```json
        {
          "id": "uuid-do-documento",
          "title": "Nome do Documento",
          "content": "Conteúdo completo do texto aqui...",
          "createdAt": "...",
          "updatedAt": "..."
        }
        ```

### Eventos do Socket.IO (Tempo Real)

| Evento Emitido (Cliente -> Servidor) | Parâmetros                                 | Descrição                                                |
| :----------------------------------- | :----------------------------------------- | :------------------------------------------------------- |
| `join_document`                      | `{ documentId: string, username: string }` | Um cliente solicita juntar-se à sala de um documento.     |
| `document_content_change`            | `{ documentId: string, newContent: string }` | Um cliente envia o conteúdo atualizado do documento.     |
| `leave_document`                     | `{ documentId: string, username: string }` | Um cliente informa que está a sair de um documento.      |

| Evento Recebido (Servidor -> Cliente) | Parâmetros                                                                | Descrição                                                                         |
| :------------------------------------ | :------------------------------------------------------------------------ | :-------------------------------------------------------------------------------- |
| `document_updated`                    | `{ documentId: string, newContent: string }`                              | O conteúdo do documento foi atualizado (por outro utilizador ou pelo servidor). |
| `active_users_updated`                | `{ documentId: string, users: Array<{ socketId: string, username: string }> }` | A lista de utilizadores ativos no documento foi atualizada.                       |

## 5. Como Configurar, Executar e Testar

Siga os passos abaixo para colocar o backend a funcionar.

### Pré-requisitos

* Node.js (versão 14 ou superior)
* MySQL Server (localmente ou acessível via rede)
* NPM (gerenciador de pacotes do Node.js, geralmente vem com o Node.js)

### Passos de Configuração

1.  **Clonar o Repositório:**
    ```bash
    git clone <URL_DO_SEU_REPOSITORIO_BACKEND>
    cd collaborative-editor-backend
    ```

2.  **Instalar Dependências:**
    ```bash
    npm install
    ```

3.  **Configurar o Banco de Dados:**
    * Crie um banco de dados MySQL. Você pode usar um cliente MySQL (MySQL Workbench, DBeaver, linha de comando) e executar:
        ```sql
        CREATE DATABASE collaborative_editor_db;
        ```
    * CCrie um ficheiro `.env` na pasta raiz do backend e adicione as suas credenciais do MySQL e a porta do servidor:
        ```env
        PORT=3001
        DB_HOST=localhost
        DB_USER=root
        DB_PASSWORD=your_mysql_password
        DB_NAME=collaborative_editor_db
        FRONTEND_URL=http://localhost:3000 # URL do seu frontend React
        ```
        **Importante:** Substitua `your_mysql_password` pela sua senha do MySQL.

4.  **Executar as Migrações (Sequelize):**
    O Sequelize criará a tabela `documents` automaticamente ao iniciar a aplicação pela primeira vez (`sequelize.sync({ alter: true })`).

### Como Executar

1.  **Iniciar o Servidor Backend:**
    ```bash
    npm start
    # Ou para desenvolvimento com auto-reload (nodemon):
    # npm run dev
    ```
    O servidor deverá iniciar na porta configurada (padrão: `3001`). Você verá mensagens de console sobre a conexão com o banco de dados e o servidor Socket.IO.

### Como Testar

Você pode testar a API REST usando ferramentas como o **Postman**, **Insomnia** ou `curl`. Para testar a funcionalidade em tempo real, você precisará do frontend.

#### Testes Manuais com Ferramentas API (Ex: Postman)

* **Criar Documento:**
    * **Método:** `POST`
    * **URL:** `http://localhost:3001/api/documents`
    * **Headers:** `Content-Type: application/json`
    * **Body (raw JSON):**
        ```json
        {
          "title": "Meu Primeiro Documento Colaborativo"
        }
        ```
* **Listar Documentos:**
    * **Método:** `GET`
    * **URL:** `http://localhost:3001/api/documents`
* **Obter Documento por ID:**
    * **Método:** `GET`
    * **URL:** `http://localhost:3001/api/documents/<ID_DO_DOCUMENTO>` (substitua `<ID_DO_DOCUMENTO>`)

#### Testes com o Frontend

1.  Certifique-se de que o backend está a correr (`npm start` ou `npm run dev`).
2.  Inicie o frontend (assumindo que está configurado para ligar ao `http://localhost:3001`).
3.  Abra o frontend em várias abas ou diferentes navegadores.
4.  Crie um novo documento ou abra um existente.
5.  Em cada aba, digite um nome de utilizador diferente no campo "Your Name".
6.  Comece a digitar em uma aba e observe as alterações a aparecerem em tempo real nas outras abas.
7.  Observe a lista de "Active Users" a ser atualizada quando novas abas se conectarem ou desconectarem.

---

Espero que este README seja útil para o seu projeto!