# 🏪 Sistema de Gestão de Estoque

Sistema completo de gestão de estoque para comércio de roupas, desenvolvido com **FastAPI** (Python) no backend e **React** (Vite) no frontend, utilizando **MySQL** como banco de dados.

## 📋 Funcionalidades

### Cadastros
- **Produtos**: Gerenciamento completo de produtos com informações de nome, código, tamanho, cor, categoria, preço e controle de estoque
- **Fornecedores**: Cadastro de fornecedores com CNPJ, telefone, email e endereço
- **Clientes**: Registro de clientes para controle de vendas

### Processos
- **Sistema de Vendas**: 
  - Interface completa para realizar vendas
  - Carrinho de compras com múltiplos produtos
  - Seleção de cliente (opcional)
  - Aplicação de descontos
  - Edição de quantidade e preço unitário por item
  - Cálculo automático de totais e subtotais
  - Atualização automática de estoque ao finalizar venda
  - Histórico completo de vendas
  - Cancelamento de vendas com restauração de estoque
  - Validação de estoque em tempo real
- **Movimentação de Estoque**: 
  - Registro de entradas (compras de fornecedores)
  - Registro de saídas (vendas para clientes)
  - Atualização automática da quantidade em estoque
  - Validação de estoque disponível para saídas

### Relatórios
- **Estoque Atual**: Visualização completa do estoque com alertas de produtos em baixo estoque
- **Vendas por Período**: Análise de vendas com filtro de datas
- **Top Fornecedores**: Fornecedores mais ativos por número de entradas
- **Produtos Mais Vendidos**: Ranking dos produtos com maior saída

## 🚀 Tecnologias Utilizadas

### Backend
- **FastAPI**: Framework web moderno e rápido para Python
- **SQLAlchemy**: ORM para gerenciamento do banco de dados
- **Pydantic**: Validação de dados e schemas
- **PyMySQL**: Driver MySQL para Python
- **Uvicorn**: Servidor ASGI de alta performance

### Frontend
- **React 18**: Biblioteca JavaScript para interfaces de usuário
- **Vite**: Build tool moderna e rápida
- **React Router**: Roteamento de páginas
- **Axios**: Cliente HTTP para requisições à API
- **CSS Moderno**: Design system premium com variáveis CSS

### Banco de Dados
- **MySQL**: Sistema de gerenciamento de banco de dados relacional

## 📦 Estrutura do Projeto

```
Comercio/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py              # Aplicação FastAPI principal
│   │   ├── database.py          # Configuração do banco de dados
│   │   ├── models.py            # Modelos SQLAlchemy
│   │   ├── schemas.py           # Schemas Pydantic
│   │   └── routers/
│   │       ├── products.py      # Endpoints de produtos
│   │       ├── suppliers.py     # Endpoints de fornecedores
│   │       ├── customers.py     # Endpoints de clientes
│   │       ├── sales.py         # Endpoints de vendas
│   │       ├── movements.py     # Endpoints de movimentação
│   │       └── reports.py       # Endpoints de relatórios
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Layout.jsx       # Layout principal com navegação
│   │   │   └── Layout.css
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx    # Dashboard com estatísticas
│   │   │   ├── Products.jsx     # Gerenciamento de produtos
│   │   │   ├── Suppliers.jsx    # Gerenciamento de fornecedores
│   │   │   ├── Customers.jsx    # Gerenciamento de clientes
│   │   │   ├── Sales.jsx        # Sistema de vendas
│   │   │   ├── Movements.jsx    # Movimentação de estoque
│   │   │   └── Reports.jsx      # Relatórios
│   │   ├── services/
│   │   │   └── api.js           # Cliente API com Axios
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css            # Design system global
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
└── README.md
```

## 🔧 Pré-requisitos

- **Python 3.8+**
- **Node.js 18+** e npm
- **MySQL 5.7+** ou **MariaDB 10+**

## 📥 Instalação e Configuração

### 1. Configurar o Banco de Dados

Certifique-se de que o MySQL está instalado e rodando. Crie o banco de dados:

```bash
mysql -u root
```

```sql
CREATE DATABASE comercio_estoque;
EXIT;
```

### 2. Configurar o Backend

```bash
# Navegar para o diretório do backend
cd backend

# Criar ambiente virtual
python3 -m venv venv

# Ativar ambiente virtual
source venv/bin/activate  # No Windows: venv\Scripts\activate

# Instalar dependências
pip install -r requirements.txt
```

### 3. Configurar o Frontend

```bash
# Navegar para o diretório do frontend
cd frontend

# Instalar dependências
npm install
```

## ▶️ Executando o Sistema

### Iniciar o Backend

```bash
cd backend
source venv/bin/activate  # Ativar ambiente virtual
uvicorn app.main:app --reload
```

O backend estará disponível em: **http://localhost:8000**

Documentação automática da API:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

### Iniciar o Frontend

Em outro terminal:

```bash
cd frontend
npm run dev
```

O frontend estará disponível em: **http://localhost:5173**

## 📚 API Endpoints

### Produtos
- `GET /products/` - Listar todos os produtos
- `GET /products/{id}` - Obter produto específico
- `POST /products/` - Criar novo produto
- `PUT /products/{id}` - Atualizar produto
- `DELETE /products/{id}` - Excluir produto

### Fornecedores
- `GET /suppliers/` - Listar todos os fornecedores
- `GET /suppliers/{id}` - Obter fornecedor específico
- `POST /suppliers/` - Criar novo fornecedor
- `PUT /suppliers/{id}` - Atualizar fornecedor
- `DELETE /suppliers/{id}` - Excluir fornecedor

### Clientes
- `GET /customers/` - Listar todos os clientes
- `GET /customers/{id}` - Obter cliente específico
- `POST /customers/` - Criar novo cliente
- `PUT /customers/{id}` - Atualizar cliente
- `DELETE /customers/{id}` - Excluir cliente

### Vendas
- `GET /sales/` - Listar todas as vendas (com filtros opcionais)
- `GET /sales/{id}` - Obter venda específica com detalhes
- `POST /sales/` - Criar nova venda (com múltiplos itens)
- `DELETE /sales/{id}` - Cancelar venda (restaura estoque)

### Movimentações
- `GET /movements/` - Listar movimentações (com filtros opcionais)
- `GET /movements/{id}` - Obter movimentação específica
- `POST /movements/` - Criar nova movimentação (entrada ou saída)

### Relatórios
- `GET /reports/stock` - Relatório de estoque atual
- `GET /reports/sales?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD` - Relatório de vendas por período
- `GET /reports/top-suppliers` - Top 10 fornecedores
- `GET /reports/top-products` - Top 10 produtos mais vendidos

## 🎨 Design e Interface

O sistema possui uma interface moderna e premium com:

- **Dark Mode**: Tema escuro elegante para reduzir fadiga visual
- **Design Responsivo**: Funciona perfeitamente em desktop, tablet e mobile
- **Animações Suaves**: Micro-animações para melhor experiência do usuário
- **Alertas Visuais**: Destaque para produtos com estoque baixo
- **Gradientes e Glassmorphism**: Efeitos visuais modernos
- **Tipografia Premium**: Fonte Inter do Google Fonts
- **Formulários Estilizados**: Todos os inputs, selects e textareas seguem o tema dark
- **Interface de Vendas Intuitiva**: Carrinho de compras visual e fácil de usar

### Paleta de Cores

- **Primary**: #6366f1 (Indigo)
- **Secondary**: #8b5cf6 (Purple)
- **Success**: #10b981 (Green)
- **Warning**: #f59e0b (Amber)
- **Danger**: #ef4444 (Red)

## 🔒 Segurança

- Validação de dados no backend com Pydantic
- Validação de unicidade (código de produto, CNPJ, CPF)
- Verificação de estoque antes de permitir saídas e vendas
- Validação em tempo real de estoque disponível no sistema de vendas
- CORS configurado para aceitar apenas origens específicas
- Atualização automática de estoque ao finalizar vendas

## 🐛 Troubleshooting

### Erro de conexão com o banco de dados

Verifique se:
1. O MySQL está rodando
2. O banco de dados `comercio_estoque` foi criado
3. As credenciais em `backend/app/database.py` estão corretas

### Erro de CORS no frontend

Certifique-se de que o backend está rodando em `http://localhost:8000` e o frontend em `http://localhost:5173`.

### Porta já em uso

Se a porta 8000 ou 5173 já estiver em uso, você pode alterar:

**Backend**:
```bash
uvicorn app.main:app --reload --port 8001
```

**Frontend**: Edite `vite.config.js` e adicione:
```javascript
export default {
  server: {
    port: 3000
  }
}
```

## 📝 Exemplos de Uso

### 1. Cadastrar um Produto

1. Acesse a página "Produtos"
2. Clique em "+ Novo Produto"
3. Preencha os dados (nome, código, preço, etc.)
4. Clique em "Criar Produto"

### 2. Registrar Entrada de Estoque

1. Acesse "Movimentação"
2. Clique em "+ Nova Movimentação"
3. Selecione "Entrada" como tipo
4. Escolha o produto e fornecedor
5. Informe a quantidade
6. Clique em "Registrar Movimentação"

### 3. Realizar uma Venda

1. Acesse a página "Vendas"
2. Clique em "+ Nova Venda"
3. (Opcional) Selecione um cliente no dropdown
4. Adicione produtos clicando em "+ Adicionar" nos cards de produtos
5. Ajuste quantidades e preços unitários na tabela de itens
6. (Opcional) Aplique um desconto em R$
7. Adicione observações se necessário
8. Revise o total e clique em "Finalizar Venda"
9. O estoque será atualizado automaticamente

### 4. Registrar Movimentação Manual

1. Acesse "Movimentação"
2. Clique em "+ Nova Movimentação"
3. Selecione "Entrada" ou "Saída" como tipo
4. Escolha o produto e fornecedor/cliente (opcional)
5. Informe a quantidade
6. Clique em "Registrar Movimentação"

### 5. Visualizar Relatórios

1. Acesse "Relatórios"
2. Escolha a aba desejada:
   - **Estoque Atual**: Veja todos os produtos e seus níveis de estoque
   - **Vendas por Período**: Filtre por data para ver vendas
   - **Top Fornecedores e Produtos**: Veja rankings

## 🤝 Contribuindo

Este é um projeto desenvolvido para uso comercial. Para sugestões ou melhorias, entre em contato.

## 📄 Licença

Este projeto foi desenvolvido para uso específico do comércio.

## 👨‍💻 Desenvolvedor

Sistema desenvolvido com FastAPI, React e MySQL para gestão eficiente de estoque de comércio de roupas.

---

**Versão**: 1.1.0  
**Data**: Novembro 2025

### 🆕 Novidades na Versão 1.1.0

- ✨ **Sistema de Vendas Completo**: Interface moderna para realizar vendas com carrinho de compras
- 🛒 **Carrinho de Compras**: Adicione múltiplos produtos em uma única venda
- 💰 **Descontos e Ajustes**: Aplique descontos e ajuste preços unitários por item
- 📊 **Histórico de Vendas**: Visualize todas as vendas realizadas
- 🔄 **Cancelamento de Vendas**: Cancele vendas e restaure estoque automaticamente
- ✅ **Validação em Tempo Real**: Verificação de estoque disponível durante a criação da venda
