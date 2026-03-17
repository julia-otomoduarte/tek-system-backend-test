# Tek System Backend

API REST de **módulo de vendas e gestão de estoque**, desenvolvida como teste técnico para a **Tek System**.

---

## Tecnologias Utilizadas

| Tecnologia              | Versão            |
| ----------------------- | ----------------- |
| Node.js                 | 22.x              |
| NestJS                  | 11.x              |
| TypeScript              | 5.x               |
| Prisma ORM              | 5.x               |
| MongoDB                 | 7.x (Replica Set) |
| JWT (access + refresh)  | —                 |
| Docker / Docker Compose | —                 |
| Jest                    | 30.x              |

---

## Pré-requisitos

- [Docker](https://www.docker.com/) e Docker Compose instalados

---

## Guia de Instalação

### 1. Clone o repositório

```bash
git clone <url-do-repositorio>
cd tek-system-backend-test
```

### 2. Configure as variáveis de ambiente

```bash
cp .env.example .env
```

Edite o `.env` e substitua os valores de `JWT_SECRET` e `JWT_REFRESH_SECRET`.

### 3. Suba os containers

```bash
docker compose up --build -d
```

Isso irá iniciar:

- `mongo-keyfile-init` — geração idempotente do keyfile do MongoDB
- `mongodb` — MongoDB com Replica Set
- `mongo-init-replica` — inicialização idempotente do Replica Set
- `web` — API NestJS em `http://localhost:3000`

### 4. Execute os testes

```bash
docker compose exec web yarn test
```

### 5. Comandos para demo (logs limpos)

Subida silenciosa e reproduzível:

```bash
docker compose up -d --build
```

Ver status dos serviços:

```bash
docker compose ps
```

Ver somente logs da API (evita ruído dos serviços de bootstrap):

```bash
docker compose logs -f web --tail=80
```

Logs do MongoDB quando necessário:

```bash
docker compose logs -f mongodb --tail=80
```

Reset completo do ambiente (útil antes da avaliação):

```bash
docker compose down -v --remove-orphans
docker compose up -d --build
```

---

## Rotas da API

Todas as rotas (exceto autenticação) exigem o header:

```
Authorization: Bearer <access_token>
```

### Auth — `/auth`

| Método | Rota             | Descrição                               |
| ------ | ---------------- | --------------------------------------- |
| POST   | `/auth/register` | Cadastro de usuário                     |
| POST   | `/auth/login`    | Login e geração de tokens               |
| POST   | `/auth/refresh`  | Renova o access token via refresh token |

**Payload register/login:**

```json
{
  "name": "Maria Silva",
  "email": "maria@email.com",
  "password": "senha123"
}
```

---

### Usuários — `/users`

> Cada usuário só pode acessar e modificar os próprios dados.

| Método | Rota                  | Descrição                 |
| ------ | --------------------- | ------------------------- |
| GET    | `/users`              | Lista todos os usuários   |
| GET    | `/users/:id`          | Busca usuário por ID      |
| GET    | `/users/email/:email` | Busca usuário por e-mail  |
| PATCH  | `/users/:id`          | Atualiza dados do usuário |
| DELETE | `/users/:id`          | Remove o usuário          |

---

### Clientes — `/customers`

| Método | Rota             | Descrição                                   |
| ------ | ---------------- | ------------------------------------------- |
| GET    | `/customers`     | Lista clientes (com filtros por query)      |
| GET    | `/customers/:id` | Busca cliente por ID                        |
| POST   | `/customers`     | Cadastra novo cliente                       |
| PUT    | `/customers/:id` | Atualiza cliente                            |
| DELETE | `/customers/:id` | Remove cliente (bloqueado se tiver pedidos) |

**Payload POST/PUT:**

```json
{
  "name": "Maria Silva",
  "email": "maria@email.com",
  "phone": "(11) 91234-5678",
  "document": "123.456.789-09",
  "address": {
    "street": "Rua das Flores",
    "number": "42",
    "neighborhood": "Centro",
    "city": "São Paulo",
    "state": "SP",
    "zipCode": "01310-100"
  }
}
```

**Filtros e paginação GET `/customers` (query params):**

```
?name=maria&email=@email&phone=11912345678&city=São Paulo&state=SP&page=1&limit=10
```

**Resposta paginada:**

```json
{ "data": [...], "meta": { "total": 42, "page": 1, "limit": 10, "totalPages": 5 } }
```

---

### Produtos — `/products`

| Método | Rota            | Descrição                    |
| ------ | --------------- | ---------------------------- |
| GET    | `/products`     | Lista produtos (com filtros) |
| GET    | `/products/:id` | Busca produto por ID         |
| POST   | `/products`     | Cadastra novo produto        |
| PATCH  | `/products/:id` | Atualiza produto             |
| DELETE | `/products/:id` | Remove produto               |

**Payload POST:**

```json
{
  "sku": "PROD-001",
  "name": "Camiseta Básica Preta",
  "description": "Camiseta 100% algodão",
  "price": 49.9,
  "stock": 100
}
```

**Filtros e paginação GET `/products` (body):**

```json
{ "name": "Camiseta", "priceGte": 20, "priceLte": 100, "page": 1, "limit": 10 }
```

**Resposta paginada:**

```json
{ "data": [...], "meta": { "total": 80, "page": 1, "limit": 10, "totalPages": 8 } }
```

---

### Pedidos — `/orders`

| Método | Rota                 | Descrição                                |
| ------ | -------------------- | ---------------------------------------- |
| GET    | `/orders`            | Lista pedidos (com filtros)              |
| GET    | `/orders/:id`        | Busca pedido por ID                      |
| POST   | `/orders`            | Cria novo pedido                         |
| PATCH  | `/orders/:id`        | Atualiza itens/cliente do pedido         |
| PATCH  | `/orders/:id/status` | Atualiza status do pedido                |
| DELETE | `/orders/:id`        | Remove pedido (somente DRAFT ou PENDING) |

**Payload POST:**

```json
{
  "customerId": "<id-do-cliente>",
  "items": [{ "productId": "<id-do-produto>", "quantity": 2 }]
}
```

**Filtros e paginação GET `/orders` (body):**

```json
{
  "status": "PENDING",
  "customerId": "<id>",
  "totalGte": 100,
  "page": 1,
  "limit": 10
}
```

**Resposta paginada:**

```json
{ "data": [...], "meta": { "total": 38, "page": 1, "limit": 10, "totalPages": 4 } }
```

**Payload PATCH status:**

```json
{ "status": "PENDING" }
```

**Transições de status permitidas:**

```
DRAFT → PENDING → COMPLETED
DRAFT → CANCELED
PENDING → CANCELED
```

> Ao mover para `PENDING` ou `COMPLETED`, o estoque dos produtos é decrementado automaticamente. Ao cancelar um pedido `PENDING`, o estoque é revertido.

---

### Dashboard — `/dashboard`

| Método | Rota         | Descrição                               |
| ------ | ------------ | --------------------------------------- |
| GET    | `/dashboard` | Retorna dados consolidados do dashboard |

**Resposta:**

```json
{
  "totalRevenue": 15000.0,
  "ordersQuantityByStatus": {
    "DRAFT": 3,
    "PENDING": 8,
    "COMPLETED": 20,
    "CANCELLED": 2
  },
  "topSellingProducts": [
    {
      "productId": "...",
      "productName": "Camiseta Básica Preta",
      "sku": "PROD-001",
      "totalQuantity": 50,
      "totalValue": 2495.0
    }
  ]
}
```
