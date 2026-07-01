-- ============================================================
-- MIGRAÇÃO MULTI-TENANT — VestPro
-- Execute no Antares ou MySQL Workbench no banco: comercio_estoque
-- ============================================================

-- 1. Criar tabela de tenants (lojas)
CREATE TABLE IF NOT EXISTS tenants (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome_loja VARCHAR(200) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. Inserir um tenant padrão para os dados que já existem
INSERT INTO tenants (nome_loja) VALUES ('Loja Principal');

-- Guarde o ID gerado (normalmente será 1)
SET @DEFAULT_TENANT = LAST_INSERT_ID();

-- 3. Adicionar coluna tenant_id nas tabelas existentes
ALTER TABLE users
    ADD COLUMN tenant_id INT NOT NULL DEFAULT 1 AFTER id,
    ADD CONSTRAINT fk_users_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id);

ALTER TABLE categories
    ADD COLUMN tenant_id INT NOT NULL DEFAULT 1 AFTER id,
    ADD CONSTRAINT fk_categories_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id);

ALTER TABLE products
    ADD COLUMN tenant_id INT NOT NULL DEFAULT 1 AFTER id,
    ADD CONSTRAINT fk_products_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id);

ALTER TABLE suppliers
    ADD COLUMN tenant_id INT NOT NULL DEFAULT 1 AFTER id,
    ADD CONSTRAINT fk_suppliers_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id);

ALTER TABLE customers
    ADD COLUMN tenant_id INT NOT NULL DEFAULT 1 AFTER id,
    ADD CONSTRAINT fk_customers_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id);

ALTER TABLE stock_movements
    ADD COLUMN tenant_id INT NOT NULL DEFAULT 1 AFTER id,
    ADD CONSTRAINT fk_movements_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id);

ALTER TABLE sales
    ADD COLUMN tenant_id INT NOT NULL DEFAULT 1 AFTER id,
    ADD CONSTRAINT fk_sales_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id);

ALTER TABLE audit_logs
    ADD COLUMN tenant_id INT NULL AFTER id,
    ADD CONSTRAINT fk_audit_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id);

-- 4. Atribuir todos os registros existentes ao tenant padrão
UPDATE users         SET tenant_id = @DEFAULT_TENANT WHERE tenant_id = 1;
UPDATE categories    SET tenant_id = @DEFAULT_TENANT WHERE tenant_id = 1;
UPDATE products      SET tenant_id = @DEFAULT_TENANT WHERE tenant_id = 1;
UPDATE suppliers     SET tenant_id = @DEFAULT_TENANT WHERE tenant_id = 1;
UPDATE customers     SET tenant_id = @DEFAULT_TENANT WHERE tenant_id = 1;
UPDATE stock_movements SET tenant_id = @DEFAULT_TENANT WHERE tenant_id = 1;
UPDATE sales         SET tenant_id = @DEFAULT_TENANT WHERE tenant_id = 1;
UPDATE audit_logs    SET tenant_id = @DEFAULT_TENANT WHERE tenant_id IS NULL;

-- 5. Remover unique constraints globais e adicionar compostas por tenant
-- (Só execute se existirem — verifique os nomes com SHOW INDEX FROM tabela)

-- Users
ALTER TABLE users DROP INDEX IF EXISTS username;
ALTER TABLE users DROP INDEX IF EXISTS email;
ALTER TABLE users ADD UNIQUE INDEX uq_user_tenant_username (tenant_id, username);
ALTER TABLE users ADD UNIQUE INDEX uq_user_tenant_email (tenant_id, email);

-- Categories
ALTER TABLE categories DROP INDEX IF EXISTS nome;
ALTER TABLE categories ADD UNIQUE INDEX uq_category_tenant_nome (tenant_id, nome);

-- Products
ALTER TABLE products DROP INDEX IF EXISTS codigo;
ALTER TABLE products ADD UNIQUE INDEX uq_product_tenant_codigo (tenant_id, codigo);

-- Suppliers (CNPJ pode ser NULL)
ALTER TABLE suppliers DROP INDEX IF EXISTS cnpj;

-- Customers (CPF pode ser NULL)
ALTER TABLE customers DROP INDEX IF EXISTS cpf;

-- ============================================================
-- PRONTO! Rode o backend e teste o cadastro de nova loja.
-- ============================================================
