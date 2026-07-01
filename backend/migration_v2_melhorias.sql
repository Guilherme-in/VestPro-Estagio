-- ============================================================
-- MIGRAÇÃO V2 — Melhorias VestPro
-- Execute no Antares no banco: comercio_estoque
-- ============================================================

-- 1. Adicionar forma_pagamento nas vendas
ALTER TABLE sales ADD COLUMN forma_pagamento VARCHAR(20) DEFAULT 'dinheiro' AFTER desconto;

-- ============================================================
-- PRONTO! Reinicie o backend.
-- ============================================================
