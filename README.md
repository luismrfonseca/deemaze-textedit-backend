# Backend do Deemaze Text Editor - Editor de Texto Colaborativo

Este repositório contém o código do backend da aplicação de editor de texto colaborativo em tempo real. Ele é responsável por gerenciar documentos, persistir dados na base de dados e coordenar a colaboração em tempo real entre os utilizadores.

## 1. Decisões Arquiteturais

A arquitetura do backend segue um modelo **modular/por camadas**, visando a clareza, manutenibilidade e escalabilidade:

* **`src/app.js`**: Ponto de entrada da aplicação, responsável por iniciar o servidor Express, conectar à base de dados e inicializar o Socket.IO.
* **`src/config/`**: Contém as configurações da base de dados e outras configurações de ambiente.
* **`src/models/`**: Define os modelos de dados (ex: `Document.js`) utilizando Sequelize, que mapeiam as tabelas da base de dados para objetos JavaScript.
* **`src/controllers/`**: Contém a lógica de negócio principal para cada recurso (ex: `documentController.js`), respondendo às requisições HTTP recebidas pelas rotas.
* **`src/routes/`**: Define as rotas da API REST (`/api/documents`), mapeando os endpoints para os controladores correspondentes.
* **`src/services/`**: Contém a lógica específica do Socket.IO (`socketService.js`), gerir as conexões em tempo real, os documento e a lógica de propagação de alterações e utilizadores ativos. Essa separação ajuda a manter a lógica de tempo real distinta da lógica de API REST.


## 2. Modelo de Dados

A base de dados MySQL contém a tabela principal para armazenar os documentos:

### `documents`

| Campo       | Tipo              | Descrição                                         |
| :---------- | :---------------- | :------------------------------------------------ |
| `id`        | `UUID` (String)   | Identificador único do documento (Gerado pelo Sequelize) |
| `title`     | `VARCHAR(255)`    | Título do documento                               |
| `content`   | `LONGTEXT`        | Conteúdo textual completo do documento (pode ser longo) |
| `createdAt` | `DATETIME`        | Carimbo de data/hora de criação                   |
| `updatedAt` | `DATETIME`        | Carimbo de data/hora da última atualização        |

## 3. Design da API

A API RESTful do backend lida com a gestão de documentos. A comunicação em tempo real é tratada separadamente pelo Socket.IO.

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
    * **Descrição:** Obtem os dados completo de um documento específico.
    * **Parâmetros de Rota:** `id` (UUID do documento).
    * **Resposta (JSON):** Os detalhes do documento, incluindo o `content`.
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
| `join_document`                      | `{ documentId: string, username: string }` | Um cliente solicita juntar-se ao documento.     |
| `document_content_change`            | `{ documentId: string, newContent: string }` | Um cliente envia o conteúdo atualizado do documento.     |
| `leave_document`                     | `{ documentId: string, username: string }` | Um cliente informa que está a sair do documento.      |

| Evento Recebido (Servidor -> Cliente) | Parâmetros                                                                | Descrição                                                                         |
| :------------------------------------ | :------------------------------------------------------------------------ | :-------------------------------------------------------------------------------- |
| `document_updated`                    | `{ documentId: string, newContent: string }`                              | O conteúdo do documento foi atualizado. |
| `active_users_updated`                | `{ documentId: string, users: Array<{ socketId: string, username: string }> }` | A lista de utilizadores ativos no documento foi atualizada.                       |

## 4. Como Configurar, Executar e Testar

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

3.  **Configurar Base de Dados:**
    * Crie uma base de dados MySQL. Podem usar o cliente MySQL (MySQL Workbench, DBeaver, linha de comando) e executar:
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
        FRONTEND_URL=http://localhost:3000
        ```
        **Importante:** Substitua `your_mysql_password` pela sua senha do MySQL.

### Como Executar

1.  **Iniciar o Servidor Backend:**
    ```bash
    npm start
    # Ou para desenvolvimento com auto-reload (nodemon):
    # npm run dev
    ```
    O servidor deverá iniciar na porta configurada (padrão: `3001`). Iram aparecer logs na consola sobre a conexão com a base de dados e o servidor Socket.IO.

### Como Testar

Para testar a API REST podem usar ferramentas como o **Postman**, **Insomnia** ou `curl`. Para testar a funcionalidade em tempo real, você precisará do frontend.

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



---

**Desenvolvido com ❤️ por Luís Fonseca**

