from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Enum, Text, Boolean, UniqueConstraint
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from app.database import Base


class MovementType(str, enum.Enum):
    ENTRADA = "ENTRADA"
    SAIDA = "SAIDA"
    DEVOLUCAO = "DEVOLUCAO"


class UserRole(str, enum.Enum):
    ADMIN = "ADMIN"
    GERENTE = "GERENTE"
    VENDEDOR = "VENDEDOR"


class Tenant(Base):
    __tablename__ = "tenants"

    id = Column(Integer, primary_key=True, index=True)
    nome_loja = Column(String(200), nullable=False)
    cnpj = Column(String(20), nullable=True)
    telefone = Column(String(20), nullable=True)
    endereco = Column(String(300), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    users = relationship("User", back_populates="tenant")
    categories = relationship("Category", back_populates="tenant")
    products = relationship("Product", back_populates="tenant")
    suppliers = relationship("Supplier", back_populates="tenant")
    customers = relationship("Customer", back_populates="tenant")
    sales = relationship("Sale", back_populates="tenant")
    movements = relationship("StockMovement", back_populates="tenant")
    audit_logs = relationship("AuditLog", back_populates="tenant")


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False, index=True)
    nome = Column(String(200), nullable=False)
    email = Column(String(100), nullable=False, index=True)
    username = Column(String(50), nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    role = Column(Enum(UserRole), default=UserRole.VENDEDOR, nullable=False)
    permissoes_extras = Column(Text, nullable=True, default='[]')
    ativo = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint('tenant_id', 'username', name='uq_user_tenant_username'),
        UniqueConstraint('tenant_id', 'email', name='uq_user_tenant_email'),
    )

    tenant = relationship("Tenant", back_populates="users")
    audit_logs = relationship("AuditLog", back_populates="user")


class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False, index=True)
    nome = Column(String(100), nullable=False, index=True)
    descricao = Column(Text)
    ativo = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint('tenant_id', 'nome', name='uq_category_tenant_nome'),
    )

    tenant = relationship("Tenant", back_populates="categories")
    products = relationship("Product", back_populates="category_rel")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    action = Column(String(50), nullable=False)
    resource = Column(String(100), nullable=False)
    resource_id = Column(Integer, nullable=True)
    details = Column(Text, nullable=True)
    ip_address = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    tenant = relationship("Tenant", back_populates="audit_logs")
    user = relationship("User", back_populates="audit_logs")


class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False, index=True)
    nome = Column(String(200), nullable=False)
    codigo = Column(String(100), nullable=False, index=True)
    tamanho = Column(String(50))
    cor = Column(String(50))
    categoria = Column(String(100))
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=True)
    preco = Column(Float, nullable=False)
    preco_custo = Column(Float, nullable=True)
    quantidade_estoque = Column(Integer, default=0)
    estoque_minimo = Column(Integer, default=5)
    image_url = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint('tenant_id', 'codigo', name='uq_product_tenant_codigo'),
    )

    tenant = relationship("Tenant", back_populates="products")
    category_rel = relationship("Category", back_populates="products")
    movements = relationship("StockMovement", back_populates="product")
    sale_items = relationship("SaleItem", back_populates="product")


class Supplier(Base):
    __tablename__ = "suppliers"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False, index=True)
    nome = Column(String(200), nullable=False)
    tipo = Column(String(20), nullable=False, default="formal")
    cnpj = Column(String(18), nullable=True, index=True)
    cpf = Column(String(14), nullable=True)
    telefone = Column(String(20))
    email = Column(String(100))
    endereco = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint('tenant_id', 'cnpj', name='uq_supplier_tenant_cnpj'),
    )

    tenant = relationship("Tenant", back_populates="suppliers")
    movements = relationship("StockMovement", back_populates="supplier")


class Customer(Base):
    __tablename__ = "customers"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False, index=True)
    nome = Column(String(200), nullable=False)
    tipo_pessoa = Column(String(2), nullable=False, server_default="PF")
    cpf = Column(String(14), index=True)
    cnpj = Column(String(18), index=True)
    razao_social = Column(String(200), nullable=True)
    telefone = Column(String(20))
    email = Column(String(100))
    endereco = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint('tenant_id', 'cpf', name='uq_customer_tenant_cpf'),
    )

    tenant = relationship("Tenant", back_populates="customers")
    movements = relationship("StockMovement", back_populates="customer")


class StockMovement(Base):
    __tablename__ = "stock_movements"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    tipo = Column(Enum(MovementType), nullable=False)
    quantidade = Column(Integer, nullable=False)
    motivo = Column(String(200))
    observacao = Column(Text)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=True)
    supplier_id = Column(Integer, ForeignKey("suppliers.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    tenant = relationship("Tenant", back_populates="movements")
    product = relationship("Product", back_populates="movements")
    customer = relationship("Customer", back_populates="movements")
    supplier = relationship("Supplier", back_populates="movements")


class Sale(Base):
    __tablename__ = "sales"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=True)
    total = Column(Float, nullable=False, default=0.0)
    desconto = Column(Float, default=0.0)
    forma_pagamento = Column(String(20), default="dinheiro")
    observacao = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    tenant = relationship("Tenant", back_populates="sales")
    customer = relationship("Customer", backref="sales")
    items = relationship("SaleItem", back_populates="sale", cascade="all, delete-orphan")


class CaixaRegistro(Base):
    __tablename__ = "caixa_registros"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    tipo = Column(String(20), nullable=False)  # abertura, fechamento, sangria, suprimento
    valor = Column(Float, nullable=False, default=0.0)
    observacao = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    tenant = relationship("Tenant")
    user = relationship("User")


class SaleItem(Base):
    __tablename__ = "sale_items"

    id = Column(Integer, primary_key=True, index=True)
    sale_id = Column(Integer, ForeignKey("sales.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    quantidade = Column(Integer, nullable=False)
    preco_unitario = Column(Float, nullable=False)
    subtotal = Column(Float, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    sale = relationship("Sale", back_populates="items")
    product = relationship("Product", back_populates="sale_items")
