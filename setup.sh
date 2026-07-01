#!/bin/bash

echo "🔧 Configurando o Sistema de Gestão de Estoque..."
echo ""

# Check if MySQL is installed
if ! command -v mysql &> /dev/null; then
    echo "❌ MySQL não está instalado."
    echo ""
    echo "Para instalar o MySQL, execute:"
    echo "  sudo apt update"
    echo "  sudo apt install mysql-server"
    echo ""
    echo "Ou para MariaDB:"
    echo "  sudo apt update"
    echo "  sudo apt install mariadb-server"
    echo ""
    exit 1
fi

echo "✅ MySQL encontrado!"
echo ""

# Create database
echo "📦 Criando banco de dados 'comercio_estoque'..."
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS comercio_estoque;" 2>/dev/null

if [ $? -eq 0 ]; then
    echo "✅ Banco de dados criado com sucesso!"
else
    echo "⚠️  Erro ao criar banco de dados. Você pode precisar executar:"
    echo "  mysql -u root -p"
    echo "  CREATE DATABASE comercio_estoque;"
    echo "  EXIT;"
fi

echo ""
echo "✅ Configuração concluída!"
echo ""
echo "Próximos passos:"
echo "1. Instalar dependências do backend: cd backend && pip install -r requirements.txt"
echo "2. Instalar dependências do frontend: cd frontend && npm install"
echo "3. Iniciar o backend: cd backend && uvicorn app.main:app --reload"
echo "4. Iniciar o frontend: cd frontend && npm run dev"
