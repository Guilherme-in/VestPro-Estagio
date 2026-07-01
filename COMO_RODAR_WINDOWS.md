# 🪟 Guia de Instalação e Execução - Windows

Este guia fornece instruções passo a passo para instalar e executar o Sistema de Gestão de Estoque no **Windows**.

---

## 📋 Pré-requisitos

Antes de começar, você precisará instalar:

1. **Python 3.8 ou superior**
   - Download: https://www.python.org/downloads/
   - ⚠️ **IMPORTANTE**: Durante a instalação, marque a opção **"Add Python to PATH"**

2. **Node.js 18 ou superior**
   - Download: https://nodejs.org/
   - Instale a versão LTS (Long Term Support)

3. **MySQL 5.7+ ou MariaDB 10+**
   - MySQL: https://dev.mysql.com/downloads/installer/
   - MariaDB: https://mariadb.org/download/
   - ⚠️ **IMPORTANTE**: Anote a senha do usuário root que você configurar durante a instalação

4. **Git (Opcional, mas recomendado)**
   - Download: https://git-scm.com/download/win

---

## 🔧 Passo 1: Verificar Instalações

Abra o **Prompt de Comando** (cmd) ou **PowerShell** e verifique se tudo está instalado:

```cmd
python --version
node --version
npm --version
mysql --version
```

Se algum comando não funcionar, verifique se os programas foram adicionados ao PATH do Windows.

---

## 🗄️ Passo 2: Configurar o MySQL

### 2.1. Iniciar o MySQL

O MySQL geralmente inicia automaticamente como serviço no Windows. Para verificar:

1. Abra o **Gerenciador de Serviços** (Services):
   - Pressione `Win + R`
   - Digite `services.msc` e pressione Enter
   - Procure por "MySQL" ou "MariaDB"
   - Se estiver parado, clique com botão direito e selecione "Iniciar"

### 2.2. Criar o Banco de Dados

Abra o **MySQL Command Line Client** ou use o **MySQL Workbench**:

**Opção 1: MySQL Command Line Client**
1. Procure por "MySQL Command Line Client" no menu Iniciar
2. Digite a senha do root quando solicitado
3. Execute:

```sql
CREATE DATABASE comercio_estoque;
EXIT;
```

**Opção 2: MySQL Workbench**
1. Abra o MySQL Workbench
2. Conecte-se ao servidor local
3. Execute a query:
```sql
CREATE DATABASE comercio_estoque;
```

**Opção 3: Prompt de Comando**
```cmd
mysql -u root -p
```
Digite a senha e execute:
```sql
CREATE DATABASE comercio_estoque;
EXIT;
```

---

## 🐍 Passo 3: Configurar o Backend (Python)

### 3.1. Navegar até a Pasta do Backend

Abra o **Prompt de Comando** ou **PowerShell** e navegue até a pasta do projeto:

```cmd
cd C:\caminho\para\Comercio\backend
```

**Exemplo:**
```cmd
cd C:\Users\SeuUsuario\Documentos\Comercio\backend
```

### 3.2. Criar Ambiente Virtual

```cmd
python -m venv venv
```

### 3.3. Ativar o Ambiente Virtual

**No Prompt de Comando (cmd):**
```cmd
venv\Scripts\activate
```

**No PowerShell:**
```powershell
.\venv\Scripts\Activate.ps1
```

Se você receber um erro de política de execução no PowerShell, execute:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

Depois de ativado, você verá `(venv)` no início da linha de comando.

### 3.4. Instalar Dependências

```cmd
pip install -r requirements.txt
```

Isso pode levar alguns minutos. Aguarde a conclusão.

### 3.5. Configurar a Conexão com o Banco de Dados

Edite o arquivo `backend\app\database.py` e ajuste a string de conexão:

```python
SQLALCHEMY_DATABASE_URL = "mysql+pymysql://root:SUA_SENHA_AQUI@localhost/comercio_estoque"
```

Substitua `SUA_SENHA_AQUI` pela senha do seu MySQL.

**Exemplo:**
```python
SQLALCHEMY_DATABASE_URL = "mysql+pymysql://root:minhasenha123@localhost/comercio_estoque"
```

---

## ⚛️ Passo 4: Configurar o Frontend (React)

### 4.1. Navegar até a Pasta do Frontend

Abra um **novo Prompt de Comando** ou **PowerShell** e navegue até:

```cmd
cd C:\caminho\para\Comercio\frontend
```

### 4.2. Instalar Dependências

```cmd
npm install
```

Isso pode levar alguns minutos. Aguarde a conclusão.

---

## 🚀 Passo 5: Executar o Sistema

### 5.1. Iniciar o Backend

No terminal onde você configurou o backend (com o ambiente virtual ativado):

```cmd
cd backend
venv\Scripts\activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Você verá mensagens como:
```
INFO:     Uvicorn running on http://0.0.0.0:8000
INFO:     Application startup complete.
```

✅ **Backend rodando em**: http://localhost:8000

📚 **Documentação da API**:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

### 5.2. Iniciar o Frontend

Em um **novo terminal** (Prompt de Comando ou PowerShell):

```cmd
cd frontend
npm run dev
```

Você verá algo como:
```
VITE v5.4.21  ready in 156 ms

➜  Local:   http://localhost:5173/
```

✅ **Frontend rodando em**: http://localhost:5173

---

## 🎉 Pronto!

Abra seu navegador e acesse: **http://localhost:5173**

O sistema está funcionando! 🎊

---

## 📝 Primeiros Passos

1. **Cadastre Produtos**: Menu "Produtos" → "+ Novo Produto"
2. **Cadastre Fornecedores**: Menu "Fornecedores" → "+ Novo Fornecedor"
3. **Cadastre Clientes**: Menu "Clientes" → "+ Novo Cliente"
4. **Realize uma Venda**: Menu "Vendas" → "+ Nova Venda"
5. **Veja o Dashboard**: Menu "Dashboard" para estatísticas

---

## ⚠️ Problemas Comuns e Soluções

### Erro: "python não é reconhecido como comando"

**Solução:**
1. Reinstale o Python marcando "Add Python to PATH"
2. Ou adicione manualmente ao PATH:
   - Pressione `Win + X` → "Sistema" → "Configurações avançadas do sistema"
   - Clique em "Variáveis de Ambiente"
   - Em "Variáveis do sistema", encontre "Path" e clique em "Editar"
   - Adicione: `C:\Python3X` (onde X é a versão)
   - Reinicie o terminal

### Erro: "mysql não é reconhecido como comando"

**Solução:**
1. Adicione o MySQL ao PATH:
   - Geralmente em: `C:\Program Files\MySQL\MySQL Server X.X\bin`
   - Siga os mesmos passos acima para adicionar ao PATH
   - Reinicie o terminal

### Erro: "Access denied for user 'root'@'localhost'"

**Solução:**
1. Verifique a senha no arquivo `backend\app\database.py`
2. Teste a conexão manualmente:
   ```cmd
   mysql -u root -p
   ```
3. Se não funcionar, redefina a senha do MySQL

### Erro: "Port 8000 already in use"

**Solução:**
1. Encontre o processo usando a porta:
   ```cmd
   netstat -ano | findstr :8000
   ```
2. Mate o processo:
   ```cmd
   taskkill /PID <número_do_PID> /F
   ```
3. Ou use outra porta:
   ```cmd
   uvicorn app.main:app --reload --port 8001
   ```

### Erro: "Port 5173 already in use"

**Solução:**
1. Encontre o processo:
   ```cmd
   netstat -ano | findstr :5173
   ```
2. Mate o processo:
   ```cmd
   taskkill /PID <número_do_PID> /F
   ```
3. Ou edite `frontend\vite.config.js` e adicione:
   ```javascript
   export default {
     server: {
       port: 3000
     }
   }
   ```

### Erro: "Cannot activate virtual environment"

**Solução:**
1. No PowerShell, execute:
   ```powershell
   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
   ```
2. Ou use o Prompt de Comando (cmd) em vez do PowerShell

### Erro: "ModuleNotFoundError" ou "npm ERR!"

**Solução:**
1. Certifique-se de que o ambiente virtual está ativado (backend)
2. Reinstale as dependências:
   ```cmd
   # Backend
   pip install -r requirements.txt
   
   # Frontend
   npm install
   ```

### Erro: "Cannot connect to MySQL server"

**Solução:**
1. Verifique se o MySQL está rodando:
   - Abra o Gerenciador de Serviços (`services.msc`)
   - Procure por "MySQL" e verifique se está "Em execução"
2. Verifique a string de conexão em `database.py`
3. Teste a conexão:
   ```cmd
   mysql -u root -p
   ```

### Frontend não carrega ou mostra erros

**Solução:**
1. Limpe o cache e reinstale:
   ```cmd
   cd frontend
   rmdir /s /q node_modules
   del package-lock.json
   npm install
   npm run dev
   ```

---

## 🔄 Comandos Rápidos de Referência

### Ativar Ambiente Virtual
```cmd
cd backend
venv\Scripts\activate
```

### Iniciar Backend
```cmd
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Iniciar Frontend
```cmd
cd frontend
npm run dev
```

### Parar Servidores
Pressione `Ctrl + C` no terminal onde o servidor está rodando.

---

## 📂 Estrutura de Pastas no Windows

```
C:\caminho\para\Comercio\
├── backend\
│   ├── app\
│   │   ├── database.py          ← Configure a senha do MySQL aqui
│   │   └── ...
│   ├── venv\                     ← Ambiente virtual (criado automaticamente)
│   └── requirements.txt
├── frontend\
│   ├── src\
│   ├── node_modules\             ← Dependências (criado automaticamente)
│   └── package.json
└── README.md
```

---

## 🎯 Dicas Úteis

1. **Use dois terminais**: Um para o backend e outro para o frontend
2. **Mantenha os terminais abertos**: Não feche enquanto estiver usando o sistema
3. **Verifique os logs**: Os terminais mostram erros e informações úteis
4. **Backup do banco**: Faça backup regular do banco de dados MySQL
5. **Atualizações**: Mantenha Python, Node.js e MySQL atualizados

---

## 🔐 Segurança

⚠️ **IMPORTANTE**: 
- Não compartilhe a senha do MySQL
- Em produção, use variáveis de ambiente para credenciais
- Configure firewall adequadamente
- Use HTTPS em produção

---

## 📞 Suporte

Se encontrar problemas não listados aqui:

1. Verifique os logs nos terminais
2. Consulte a documentação da API em http://localhost:8000/docs
3. Verifique se todas as dependências estão instaladas
4. Certifique-se de que o MySQL está rodando

---

## ✅ Checklist de Instalação

- [ ] Python 3.8+ instalado e no PATH
- [ ] Node.js 18+ instalado
- [ ] MySQL instalado e rodando
- [ ] Banco de dados `comercio_estoque` criado
- [ ] Ambiente virtual Python criado e ativado
- [ ] Dependências do backend instaladas
- [ ] String de conexão do banco configurada
- [ ] Dependências do frontend instaladas
- [ ] Backend rodando em http://localhost:8000
- [ ] Frontend rodando em http://localhost:5173
- [ ] Sistema acessível no navegador

---

**Versão**: 1.1.0  
**Última atualização**: Novembro 2025  
**Sistema Operacional**: Windows 10/11

---

**Boa sorte com seu Sistema de Gestão de Estoque! 🏪✨**

