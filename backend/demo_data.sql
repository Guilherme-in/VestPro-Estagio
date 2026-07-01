-- =============================================================
-- VestPro – Dados de Demonstração para Banca
-- Usa INSERT IGNORE para não travar em duplicatas.
-- ANTES de rodar: DROP INDEX ix_categories_nome ON categories;
-- =============================================================

SET @tid = 2;   -- << ID da sua loja (LadoSul)

-- =============================================================
-- CATEGORIAS
-- =============================================================
INSERT IGNORE INTO categories (tenant_id, nome, descricao, ativo, created_at) VALUES
(@tid, 'Camisetas',   'Camisetas masculinas e femininas',  1, NOW() - INTERVAL 60 DAY),
(@tid, 'Calças',      'Jeans, sociais e esportivas',       1, NOW() - INTERVAL 60 DAY),
(@tid, 'Vestidos',    'Vestidos casuais e festivos',       1, NOW() - INTERVAL 55 DAY),
(@tid, 'Tênis',       'Calçados esportivos',               1, NOW() - INTERVAL 55 DAY),
(@tid, 'Acessórios',  'Cintos, bonés e bolsas',            1, NOW() - INTERVAL 50 DAY),
(@tid, 'Moletom',     'Moletons e casacos',                1, NOW() - INTERVAL 45 DAY);

SET @cat_camiseta = (SELECT id FROM categories WHERE tenant_id=@tid AND nome='Camisetas'  LIMIT 1);
SET @cat_calca    = (SELECT id FROM categories WHERE tenant_id=@tid AND nome='Calças'     LIMIT 1);
SET @cat_vestido  = (SELECT id FROM categories WHERE tenant_id=@tid AND nome='Vestidos'   LIMIT 1);
SET @cat_tenis    = (SELECT id FROM categories WHERE tenant_id=@tid AND nome='Tênis'      LIMIT 1);
SET @cat_acess    = (SELECT id FROM categories WHERE tenant_id=@tid AND nome='Acessórios' LIMIT 1);
SET @cat_moletom  = (SELECT id FROM categories WHERE tenant_id=@tid AND nome='Moletom'    LIMIT 1);

-- =============================================================
-- FORNECEDORES
-- =============================================================
INSERT IGNORE INTO suppliers (tenant_id, nome, tipo, cnpj, telefone, email, endereco, created_at) VALUES
(@tid, 'Têxtil Brasil Ltda',     'formal',   '12.345.678/0001-90', '(11) 3344-5566', 'vendas@textilbrasil.com.br', 'Rua das Fábricas, 100 – São Paulo/SP',    NOW() - INTERVAL 60 DAY),
(@tid, 'Moda Sul Confecções',    'formal',   '98.765.432/0001-10', '(51) 3322-1100', 'contato@modasul.com.br',     'Av. Industrial, 500 – Porto Alegre/RS',   NOW() - INTERVAL 55 DAY),
(@tid, 'CalçaBem Distribuidora', 'formal',   '11.222.333/0001-44', '(21) 2211-9988', 'pedidos@calcabem.com.br',    'Rua do Comércio, 88 – Rio de Janeiro/RJ', NOW() - INTERVAL 50 DAY),
(@tid, 'João Artesão',           'autonomo', NULL,                 '(62) 99811-2233','joao.artesao@gmail.com',     'Setor Norte, Goiânia/GO',                 NOW() - INTERVAL 40 DAY);

SET @forn1 = (SELECT id FROM suppliers WHERE tenant_id=@tid AND nome='Têxtil Brasil Ltda'     LIMIT 1);
SET @forn2 = (SELECT id FROM suppliers WHERE tenant_id=@tid AND nome='Moda Sul Confecções'    LIMIT 1);
SET @forn3 = (SELECT id FROM suppliers WHERE tenant_id=@tid AND nome='CalçaBem Distribuidora' LIMIT 1);

-- =============================================================
-- CLIENTES
-- =============================================================
INSERT IGNORE INTO customers (tenant_id, nome, cpf, telefone, email, endereco, created_at) VALUES
(@tid, 'Ana Paula Souza',       '111.222.333-44', '(62) 98811-1111', 'ana.souza@gmail.com',       'Rua das Flores, 12 – Goiânia/GO',     NOW() - INTERVAL 50 DAY),
(@tid, 'Carlos Mendes',         '222.333.444-55', '(62) 97722-2222', 'carlos.mendes@hotmail.com', 'Av. Goiás, 400 – Goiânia/GO',         NOW() - INTERVAL 45 DAY),
(@tid, 'Fernanda Lima',         '333.444.555-66', '(62) 96633-3333', 'fernanda.lima@gmail.com',   'Qd. 5, Lt. 10 – Aparecida/GO',        NOW() - INTERVAL 40 DAY),
(@tid, 'Ricardo Oliveira',      '444.555.666-77', '(62) 95544-4444', 'ricardo.oli@gmail.com',     'Rua B, 55 – Trindade/GO',             NOW() - INTERVAL 35 DAY),
(@tid, 'Juliana Costa',         '555.666.777-88', '(62) 94455-5555', 'ju.costa@outlook.com',      'Av. Principal, 300 – Senador Canedo', NOW() - INTERVAL 30 DAY),
(@tid, 'Marcos Alves',          '666.777.888-99', '(62) 93366-6666', 'marcos.alves@gmail.com',    'Rua C, 77 – Goiânia/GO',             NOW() - INTERVAL 25 DAY),
(@tid, 'Beatriz Ferreira',      '777.888.999-00', '(62) 92277-7777', 'bia.ferreira@gmail.com',    'Setor Bueno, Goiânia/GO',             NOW() - INTERVAL 20 DAY),
(@tid, 'Paulo Henrique Santos', '888.999.000-11', '(62) 91188-8888', 'paulo.h@gmail.com',         'Rua D, 90 – Goiânia/GO',             NOW() - INTERVAL 15 DAY);

SET @cli1 = (SELECT id FROM customers WHERE tenant_id=@tid AND cpf='111.222.333-44' LIMIT 1);
SET @cli2 = (SELECT id FROM customers WHERE tenant_id=@tid AND cpf='222.333.444-55' LIMIT 1);
SET @cli3 = (SELECT id FROM customers WHERE tenant_id=@tid AND cpf='333.444.555-66' LIMIT 1);
SET @cli4 = (SELECT id FROM customers WHERE tenant_id=@tid AND cpf='444.555.666-77' LIMIT 1);
SET @cli5 = (SELECT id FROM customers WHERE tenant_id=@tid AND cpf='555.666.777-88' LIMIT 1);
SET @cli6 = (SELECT id FROM customers WHERE tenant_id=@tid AND cpf='666.777.888-99' LIMIT 1);
SET @cli7 = (SELECT id FROM customers WHERE tenant_id=@tid AND cpf='777.888.999-00' LIMIT 1);
SET @cli8 = (SELECT id FROM customers WHERE tenant_id=@tid AND cpf='888.999.000-11' LIMIT 1);

-- =============================================================
-- FUNCIONÁRIOS  (senha: senha123)
-- =============================================================
SET @hash = '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMqJqhg5JMRWTIOkXLsFNj6Kge';

INSERT IGNORE INTO users (tenant_id, nome, email, username, hashed_password, role, ativo, created_at) VALUES
(@tid, 'Maria Gerente',  'maria.gerente@vestpro.com',  'maria', @hash, 'GERENTE',  1, NOW() - INTERVAL 50 DAY),
(@tid, 'Pedro Vendedor', 'pedro.vendedor@vestpro.com', 'pedro', @hash, 'VENDEDOR', 1, NOW() - INTERVAL 45 DAY),
(@tid, 'Luiza Vendas',   'luiza.vendas@vestpro.com',   'luiza', @hash, 'VENDEDOR', 1, NOW() - INTERVAL 30 DAY);

-- =============================================================
-- PRODUTOS
-- =============================================================
INSERT IGNORE INTO products (tenant_id, nome, codigo, tamanho, cor, categoria, category_id, preco, preco_custo, quantidade_estoque, estoque_minimo, created_at) VALUES
(@tid, 'Camiseta Básica Branca',    'CAM-001', 'M',  'Branco',   'Camisetas',  @cat_camiseta, 49.90,  18.00, 28, 5, NOW() - INTERVAL 55 DAY),
(@tid, 'Camiseta Básica Preta',     'CAM-002', 'M',  'Preto',    'Camisetas',  @cat_camiseta, 49.90,  18.00, 21, 5, NOW() - INTERVAL 55 DAY),
(@tid, 'Camiseta Estampada Floral', 'CAM-003', 'P',  'Rosa',     'Camisetas',  @cat_camiseta, 69.90,  25.00, 19, 5, NOW() - INTERVAL 50 DAY),
(@tid, 'Camiseta Polo Masculina',   'CAM-004', 'G',  'Azul',     'Camisetas',  @cat_camiseta, 89.90,  32.00, 17, 5, NOW() - INTERVAL 48 DAY),
(@tid, 'Camiseta Regata Feminina',  'CAM-005', 'PP', 'Vermelho', 'Camisetas',  @cat_camiseta, 39.90,  14.00, 21, 5, NOW() - INTERVAL 45 DAY),
(@tid, 'Calça Jeans Skinny',        'CAL-001', '38', 'Azul',     'Calças',     @cat_calca,   149.90,  55.00, 14, 3, NOW() - INTERVAL 50 DAY),
(@tid, 'Calça Jeans Wide Leg',      'CAL-002', '40', 'Preto',    'Calças',     @cat_calca,   169.90,  60.00, 11, 3, NOW() - INTERVAL 48 DAY),
(@tid, 'Calça Social Masculina',    'CAL-003', '42', 'Grafite',  'Calças',     @cat_calca,   189.90,  70.00,  9, 3, NOW() - INTERVAL 45 DAY),
(@tid, 'Calça Jogger Moletom',      'CAL-004', 'M',  'Cinza',    'Calças',     @cat_calca,   119.90,  42.00, 19, 5, NOW() - INTERVAL 40 DAY),
(@tid, 'Vestido Floral Midi',       'VES-001', 'P',  'Verde',    'Vestidos',   @cat_vestido, 139.90,  48.00,  9, 3, NOW() - INTERVAL 50 DAY),
(@tid, 'Vestido Liso Casual',       'VES-002', 'M',  'Bege',     'Vestidos',   @cat_vestido, 119.90,  42.00, 11, 3, NOW() - INTERVAL 45 DAY),
(@tid, 'Vestido Festa Longo',       'VES-003', 'G',  'Preto',    'Vestidos',   @cat_vestido, 249.90,  90.00,  5, 2, NOW() - INTERVAL 40 DAY),
(@tid, 'Tênis Running Masculino',   'TEN-001', '42', 'Branco',   'Tênis',      @cat_tenis,  299.90, 110.00,  7, 2, NOW() - INTERVAL 45 DAY),
(@tid, 'Tênis Casual Feminino',     'TEN-002', '37', 'Rosa',     'Tênis',      @cat_tenis,  269.90,  98.00,  9, 2, NOW() - INTERVAL 40 DAY),
(@tid, 'Cinto Couro Masculino',     'ACE-001', 'U',  'Marrom',   'Acessórios', @cat_acess,   59.90,  20.00, 17, 5, NOW() - INTERVAL 40 DAY),
(@tid, 'Boné Aba Reta',             'ACE-002', 'U',  'Preto',    'Acessórios', @cat_acess,   49.90,  16.00, 21, 5, NOW() - INTERVAL 35 DAY),
(@tid, 'Bolsa Tote Feminina',       'ACE-003', 'U',  'Caramelo', 'Acessórios', @cat_acess,   89.90,  32.00, 14, 3, NOW() - INTERVAL 35 DAY),
(@tid, 'Moletom Canguru Básico',    'MOL-001', 'G',  'Cinza',    'Moletom',    @cat_moletom,129.90,  46.00, 13, 3, NOW() - INTERVAL 30 DAY),
(@tid, 'Moletom Aberto Feminino',   'MOL-002', 'M',  'Rosa',     'Moletom',    @cat_moletom,139.90,  50.00, 11, 3, NOW() - INTERVAL 28 DAY);

SET @p1  = (SELECT id FROM products WHERE tenant_id=@tid AND codigo='CAM-001' LIMIT 1);
SET @p2  = (SELECT id FROM products WHERE tenant_id=@tid AND codigo='CAM-002' LIMIT 1);
SET @p3  = (SELECT id FROM products WHERE tenant_id=@tid AND codigo='CAM-003' LIMIT 1);
SET @p4  = (SELECT id FROM products WHERE tenant_id=@tid AND codigo='CAM-004' LIMIT 1);
SET @p5  = (SELECT id FROM products WHERE tenant_id=@tid AND codigo='CAM-005' LIMIT 1);
SET @p6  = (SELECT id FROM products WHERE tenant_id=@tid AND codigo='CAL-001' LIMIT 1);
SET @p7  = (SELECT id FROM products WHERE tenant_id=@tid AND codigo='CAL-002' LIMIT 1);
SET @p8  = (SELECT id FROM products WHERE tenant_id=@tid AND codigo='CAL-003' LIMIT 1);
SET @p9  = (SELECT id FROM products WHERE tenant_id=@tid AND codigo='CAL-004' LIMIT 1);
SET @p10 = (SELECT id FROM products WHERE tenant_id=@tid AND codigo='VES-001' LIMIT 1);
SET @p11 = (SELECT id FROM products WHERE tenant_id=@tid AND codigo='VES-002' LIMIT 1);
SET @p12 = (SELECT id FROM products WHERE tenant_id=@tid AND codigo='VES-003' LIMIT 1);
SET @p13 = (SELECT id FROM products WHERE tenant_id=@tid AND codigo='TEN-001' LIMIT 1);
SET @p14 = (SELECT id FROM products WHERE tenant_id=@tid AND codigo='TEN-002' LIMIT 1);
SET @p15 = (SELECT id FROM products WHERE tenant_id=@tid AND codigo='ACE-001' LIMIT 1);
SET @p16 = (SELECT id FROM products WHERE tenant_id=@tid AND codigo='ACE-002' LIMIT 1);
SET @p17 = (SELECT id FROM products WHERE tenant_id=@tid AND codigo='ACE-003' LIMIT 1);
SET @p18 = (SELECT id FROM products WHERE tenant_id=@tid AND codigo='MOL-001' LIMIT 1);
SET @p19 = (SELECT id FROM products WHERE tenant_id=@tid AND codigo='MOL-002' LIMIT 1);

-- =============================================================
-- MOVIMENTAÇÕES DE ENTRADA
-- =============================================================
INSERT IGNORE INTO stock_movements (tenant_id, product_id, tipo, quantidade, motivo, supplier_id, created_at) VALUES
(@tid, @p1,  'ENTRADA', 30, 'Compra inicial – lote fornecedor', @forn1, NOW() - INTERVAL 55 DAY),
(@tid, @p2,  'ENTRADA', 25, 'Compra inicial – lote fornecedor', @forn1, NOW() - INTERVAL 55 DAY),
(@tid, @p3,  'ENTRADA', 20, 'Compra inicial – lote fornecedor', @forn1, NOW() - INTERVAL 50 DAY),
(@tid, @p4,  'ENTRADA', 18, 'Compra – reposição',               @forn1, NOW() - INTERVAL 48 DAY),
(@tid, @p5,  'ENTRADA', 22, 'Compra inicial – lote fornecedor', @forn1, NOW() - INTERVAL 45 DAY),
(@tid, @p6,  'ENTRADA', 15, 'Compra inicial – lote fornecedor', @forn2, NOW() - INTERVAL 50 DAY),
(@tid, @p7,  'ENTRADA', 12, 'Compra inicial – lote fornecedor', @forn2, NOW() - INTERVAL 48 DAY),
(@tid, @p8,  'ENTRADA', 10, 'Compra inicial – lote fornecedor', @forn2, NOW() - INTERVAL 45 DAY),
(@tid, @p9,  'ENTRADA', 20, 'Compra – reposição',               @forn2, NOW() - INTERVAL 40 DAY),
(@tid, @p10, 'ENTRADA', 10, 'Compra inicial – lote fornecedor', @forn1, NOW() - INTERVAL 50 DAY),
(@tid, @p11, 'ENTRADA', 12, 'Compra inicial – lote fornecedor', @forn1, NOW() - INTERVAL 45 DAY),
(@tid, @p12, 'ENTRADA',  6, 'Compra – peças especiais',         @forn2, NOW() - INTERVAL 40 DAY),
(@tid, @p13, 'ENTRADA',  8, 'Compra inicial – lote fornecedor', @forn3, NOW() - INTERVAL 45 DAY),
(@tid, @p14, 'ENTRADA', 10, 'Compra inicial – lote fornecedor', @forn3, NOW() - INTERVAL 40 DAY),
(@tid, @p15, 'ENTRADA', 20, 'Compra inicial – lote fornecedor', @forn2, NOW() - INTERVAL 40 DAY),
(@tid, @p16, 'ENTRADA', 25, 'Compra inicial – lote fornecedor', @forn1, NOW() - INTERVAL 35 DAY),
(@tid, @p17, 'ENTRADA', 15, 'Compra inicial – lote fornecedor', @forn2, NOW() - INTERVAL 35 DAY),
(@tid, @p18, 'ENTRADA', 14, 'Compra inicial – lote fornecedor', @forn1, NOW() - INTERVAL 30 DAY),
(@tid, @p19, 'ENTRADA', 12, 'Compra inicial – lote fornecedor', @forn1, NOW() - INTERVAL 28 DAY),
(@tid, @p3,  'DEVOLUCAO', 1,'Devolução – tamanho errado',       NULL,   NOW() - INTERVAL 10 DAY);

-- =============================================================
-- VENDAS
-- =============================================================

-- Venda 1
INSERT INTO sales (tenant_id, customer_id, total, desconto, forma_pagamento, observacao, created_at) VALUES
(@tid, @cli1, 189.70, 10.00, 'pix', NULL, NOW() - INTERVAL 45 DAY);
SET @sale1 = LAST_INSERT_ID();
INSERT INTO sale_items (sale_id, product_id, quantidade, preco_unitario, subtotal, created_at) VALUES
(@sale1, @p1, 2, 49.90, 99.80, NOW() - INTERVAL 45 DAY),
(@sale1, @p5, 1, 39.90, 39.90, NOW() - INTERVAL 45 DAY),
(@sale1, @p16,1, 49.90, 49.90, NOW() - INTERVAL 45 DAY);
INSERT INTO stock_movements (tenant_id, product_id, tipo, quantidade, motivo, customer_id, created_at) VALUES
(@tid, @p1,  'SAIDA', 2, 'Venda', @cli1, NOW() - INTERVAL 45 DAY),
(@tid, @p5,  'SAIDA', 1, 'Venda', @cli1, NOW() - INTERVAL 45 DAY),
(@tid, @p16, 'SAIDA', 1, 'Venda', @cli1, NOW() - INTERVAL 45 DAY);

-- Venda 2
INSERT INTO sales (tenant_id, customer_id, total, desconto, forma_pagamento, observacao, created_at) VALUES
(@tid, @cli2, 299.90, 0.00, 'dinheiro', NULL, NOW() - INTERVAL 40 DAY);
SET @sale2 = LAST_INSERT_ID();
INSERT INTO sale_items (sale_id, product_id, quantidade, preco_unitario, subtotal, created_at) VALUES
(@sale2, @p13, 1, 299.90, 299.90, NOW() - INTERVAL 40 DAY);
INSERT INTO stock_movements (tenant_id, product_id, tipo, quantidade, motivo, customer_id, created_at) VALUES
(@tid, @p13, 'SAIDA', 1, 'Venda', @cli2, NOW() - INTERVAL 40 DAY);

-- Venda 3
INSERT INTO sales (tenant_id, customer_id, total, desconto, forma_pagamento, observacao, created_at) VALUES
(@tid, @cli3, 389.70, 20.00, 'credito', '3x no crédito', NOW() - INTERVAL 35 DAY);
SET @sale3 = LAST_INSERT_ID();
INSERT INTO sale_items (sale_id, product_id, quantidade, preco_unitario, subtotal, created_at) VALUES
(@sale3, @p10, 1, 139.90, 139.90, NOW() - INTERVAL 35 DAY),
(@sale3, @p6,  1, 149.90, 149.90, NOW() - INTERVAL 35 DAY),
(@sale3, @p15, 1,  59.90,  59.90, NOW() - INTERVAL 35 DAY),
(@sale3, @p16, 1,  49.90,  49.90, NOW() - INTERVAL 35 DAY);
INSERT INTO stock_movements (tenant_id, product_id, tipo, quantidade, motivo, customer_id, created_at) VALUES
(@tid, @p10, 'SAIDA', 1, 'Venda', @cli3, NOW() - INTERVAL 35 DAY),
(@tid, @p6,  'SAIDA', 1, 'Venda', @cli3, NOW() - INTERVAL 35 DAY),
(@tid, @p15, 'SAIDA', 1, 'Venda', @cli3, NOW() - INTERVAL 35 DAY),
(@tid, @p16, 'SAIDA', 1, 'Venda', @cli3, NOW() - INTERVAL 35 DAY);

-- Venda 4
INSERT INTO sales (tenant_id, customer_id, total, desconto, forma_pagamento, observacao, created_at) VALUES
(@tid, @cli4, 219.80, 0.00, 'debito', NULL, NOW() - INTERVAL 30 DAY);
SET @sale4 = LAST_INSERT_ID();
INSERT INTO sale_items (sale_id, product_id, quantidade, preco_unitario, subtotal, created_at) VALUES
(@sale4, @p4, 1,  89.90,  89.90, NOW() - INTERVAL 30 DAY),
(@sale4, @p8, 1, 189.90, 189.90, NOW() - INTERVAL 30 DAY);
INSERT INTO stock_movements (tenant_id, product_id, tipo, quantidade, motivo, customer_id, created_at) VALUES
(@tid, @p4, 'SAIDA', 1, 'Venda', @cli4, NOW() - INTERVAL 30 DAY),
(@tid, @p8, 'SAIDA', 1, 'Venda', @cli4, NOW() - INTERVAL 30 DAY);

-- Venda 5
INSERT INTO sales (tenant_id, customer_id, total, desconto, forma_pagamento, observacao, created_at) VALUES
(@tid, @cli5, 409.70, 0.00, 'pix', NULL, NOW() - INTERVAL 25 DAY);
SET @sale5 = LAST_INSERT_ID();
INSERT INTO sale_items (sale_id, product_id, quantidade, preco_unitario, subtotal, created_at) VALUES
(@sale5, @p12, 1, 249.90, 249.90, NOW() - INTERVAL 25 DAY),
(@sale5, @p11, 1, 119.90, 119.90, NOW() - INTERVAL 25 DAY),
(@sale5, @p15, 1,  59.90,  59.90, NOW() - INTERVAL 25 DAY);
INSERT INTO stock_movements (tenant_id, product_id, tipo, quantidade, motivo, customer_id, created_at) VALUES
(@tid, @p12, 'SAIDA', 1, 'Venda', @cli5, NOW() - INTERVAL 25 DAY),
(@tid, @p11, 'SAIDA', 1, 'Venda', @cli5, NOW() - INTERVAL 25 DAY),
(@tid, @p15, 'SAIDA', 1, 'Venda', @cli5, NOW() - INTERVAL 25 DAY);

-- Venda 6
INSERT INTO sales (tenant_id, customer_id, total, desconto, forma_pagamento, observacao, created_at) VALUES
(@tid, @cli6, 179.80, 0.00, 'dinheiro', NULL, NOW() - INTERVAL 20 DAY);
SET @sale6 = LAST_INSERT_ID();
INSERT INTO sale_items (sale_id, product_id, quantidade, preco_unitario, subtotal, created_at) VALUES
(@sale6, @p9,  1, 119.90, 119.90, NOW() - INTERVAL 20 DAY),
(@sale6, @p16, 1,  49.90,  49.90, NOW() - INTERVAL 20 DAY),
(@sale6, @p2,  1,  49.90,  49.90, NOW() - INTERVAL 20 DAY);
INSERT INTO stock_movements (tenant_id, product_id, tipo, quantidade, motivo, customer_id, created_at) VALUES
(@tid, @p9,  'SAIDA', 1, 'Venda', @cli6, NOW() - INTERVAL 20 DAY),
(@tid, @p16, 'SAIDA', 1, 'Venda', @cli6, NOW() - INTERVAL 20 DAY),
(@tid, @p2,  'SAIDA', 1, 'Venda', @cli6, NOW() - INTERVAL 20 DAY);

-- Venda 7
INSERT INTO sales (tenant_id, customer_id, total, desconto, forma_pagamento, observacao, created_at) VALUES
(@tid, @cli7, 319.70, 10.00, 'credito', '2x no crédito', NOW() - INTERVAL 12 DAY);
SET @sale7 = LAST_INSERT_ID();
INSERT INTO sale_items (sale_id, product_id, quantidade, preco_unitario, subtotal, created_at) VALUES
(@sale7, @p14, 1, 269.90, 269.90, NOW() - INTERVAL 12 DAY),
(@sale7, @p3,  1,  69.90,  69.90, NOW() - INTERVAL 12 DAY);
INSERT INTO stock_movements (tenant_id, product_id, tipo, quantidade, motivo, customer_id, created_at) VALUES
(@tid, @p14, 'SAIDA', 1, 'Venda', @cli7, NOW() - INTERVAL 12 DAY),
(@tid, @p3,  'SAIDA', 1, 'Venda', @cli7, NOW() - INTERVAL 12 DAY);

-- Venda 8
INSERT INTO sales (tenant_id, customer_id, total, desconto, forma_pagamento, observacao, created_at) VALUES
(@tid, @cli8, 269.80, 0.00, 'pix', NULL, NOW() - INTERVAL 7 DAY);
SET @sale8 = LAST_INSERT_ID();
INSERT INTO sale_items (sale_id, product_id, quantidade, preco_unitario, subtotal, created_at) VALUES
(@sale8, @p18, 1, 129.90, 129.90, NOW() - INTERVAL 7 DAY),
(@sale8, @p7,  1, 169.90, 169.90, NOW() - INTERVAL 7 DAY);
INSERT INTO stock_movements (tenant_id, product_id, tipo, quantidade, motivo, customer_id, created_at) VALUES
(@tid, @p18, 'SAIDA', 1, 'Venda', @cli8, NOW() - INTERVAL 7 DAY),
(@tid, @p7,  'SAIDA', 1, 'Venda', @cli8, NOW() - INTERVAL 7 DAY);

-- Venda 9 – cliente fiel voltando
INSERT INTO sales (tenant_id, customer_id, total, desconto, forma_pagamento, observacao, created_at) VALUES
(@tid, @cli1, 179.80, 0.00, 'debito', NULL, NOW() - INTERVAL 3 DAY);
SET @sale9 = LAST_INSERT_ID();
INSERT INTO sale_items (sale_id, product_id, quantidade, preco_unitario, subtotal, created_at) VALUES
(@sale9, @p19, 1, 139.90, 139.90, NOW() - INTERVAL 3 DAY),
(@sale9, @p17, 1,  89.90,  89.90, NOW() - INTERVAL 3 DAY);
INSERT INTO stock_movements (tenant_id, product_id, tipo, quantidade, motivo, customer_id, created_at) VALUES
(@tid, @p19, 'SAIDA', 1, 'Venda', @cli1, NOW() - INTERVAL 3 DAY),
(@tid, @p17, 'SAIDA', 1, 'Venda', @cli1, NOW() - INTERVAL 3 DAY);

-- Venda 10 – balcão, sem cliente, hoje
INSERT INTO sales (tenant_id, customer_id, total, desconto, forma_pagamento, observacao, created_at) VALUES
(@tid, NULL, 99.80, 0.00, 'dinheiro', NULL, NOW());
SET @sale10 = LAST_INSERT_ID();
INSERT INTO sale_items (sale_id, product_id, quantidade, preco_unitario, subtotal, created_at) VALUES
(@sale10, @p2, 2, 49.90, 99.80, NOW());
INSERT INTO stock_movements (tenant_id, product_id, tipo, quantidade, motivo, customer_id, created_at) VALUES
(@tid, @p2, 'SAIDA', 2, 'Venda', NULL, NOW());

-- =============================================================
-- LOGS DE AUDITORIA
-- =============================================================
SET @admin_id   = (SELECT id FROM users WHERE tenant_id=@tid AND role='ADMIN'   LIMIT 1);
SET @gerente_id = (SELECT id FROM users WHERE tenant_id=@tid AND role='GERENTE' LIMIT 1);

INSERT IGNORE INTO audit_logs (tenant_id, user_id, action, resource, details, ip_address, created_at) VALUES
(@tid, @admin_id,   'CREATE', 'products',  'Produto cadastrado: Camiseta Básica Branca', '192.168.1.10', NOW() - INTERVAL 55 DAY),
(@tid, @admin_id,   'CREATE', 'products',  'Produto cadastrado: Calça Jeans Skinny',     '192.168.1.10', NOW() - INTERVAL 50 DAY),
(@tid, @gerente_id, 'CREATE', 'suppliers', 'Fornecedor: Têxtil Brasil Ltda',             '192.168.1.11', NOW() - INTERVAL 55 DAY),
(@tid, @gerente_id, 'UPDATE', 'products',  'Estoque atualizado: Camiseta Básica Preta',  '192.168.1.11', NOW() - INTERVAL 30 DAY),
(@tid, @admin_id,   'CREATE', 'users',     'Usuário criado: Pedro Vendedor',             '192.168.1.10', NOW() - INTERVAL 45 DAY),
(@tid, @admin_id,   'LOGIN',  'auth',      'Login realizado com sucesso',                '192.168.1.10', NOW() - INTERVAL 1  DAY),
(@tid, @gerente_id, 'LOGIN',  'auth',      'Login realizado com sucesso',                '192.168.1.11', NOW() - INTERVAL 2  DAY);

-- FIM
