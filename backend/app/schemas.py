from pydantic import BaseModel, Field, EmailStr, field_validator
from datetime import datetime
from typing import Optional, List, Union
from enum import Enum


class MovementTypeEnum(str, Enum):
    ENTRADA = "ENTRADA"
    SAIDA = "SAIDA"
    DEVOLUCAO = "DEVOLUCAO"


class UserRoleEnum(str, Enum):
    ADMIN = "ADMIN"
    GERENTE = "GERENTE"
    VENDEDOR = "VENDEDOR"


# â”€â”€â”€ Auth â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

class Token(BaseModel):
    access_token: str
    token_type: str
    user: "UserResponse"


class TokenData(BaseModel):
    username: Optional[str] = None
    role: Optional[str] = None
    tenant_id: Optional[int] = None


class LoginRequest(BaseModel):
    username: str
    password: str


class RegisterRequest(BaseModel):
    nome_loja: str = Field(..., min_length=1, max_length=200)
    nome: str = Field(..., min_length=1, max_length=200)
    email: str = Field(..., max_length=100)
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=6)


# â”€â”€â”€ Tenant â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

class TenantResponse(BaseModel):
    id: int
    nome_loja: str
    cnpj: Optional[str] = None
    telefone: Optional[str] = None
    endereco: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# â”€â”€â”€ User â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

class UserCreate(BaseModel):
    nome: str = Field(..., min_length=1, max_length=200)
    email: str = Field(..., max_length=100)
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=6)
    role: UserRoleEnum = UserRoleEnum.VENDEDOR


class UserUpdate(BaseModel):
    nome: Optional[str] = Field(None, min_length=1, max_length=200)
    email: Optional[str] = Field(None, max_length=100)
    role: Optional[UserRoleEnum] = None
    ativo: Optional[bool] = None
    password: Optional[str] = Field(None, min_length=6)
    permissoes_extras: Optional[List[str]] = None


class UserResponse(BaseModel):
    id: int
    tenant_id: int
    nome: str
    email: str
    username: str
    role: UserRoleEnum
    ativo: bool
    created_at: datetime
    nome_loja: Optional[str] = None
    permissoes_extras: List[str] = []

    @field_validator('permissoes_extras', mode='before')
    @classmethod
    def parse_permissoes_extras(cls, v):
        import json
        if v is None:
            return []
        if isinstance(v, str):
            try:
                return json.loads(v)
            except Exception:
                return []
        return v

    @classmethod
    def from_orm_with_extras(cls, user):
        return cls.model_validate(user)

    class Config:
        from_attributes = True


# â”€â”€â”€ Category â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

class CategoryBase(BaseModel):
    nome: str = Field(..., min_length=1, max_length=100)
    descricao: Optional[str] = None


class CategoryCreate(CategoryBase):
    pass


class CategoryUpdate(BaseModel):
    nome: Optional[str] = Field(None, min_length=1, max_length=100)
    descricao: Optional[str] = None
    ativo: Optional[bool] = None


class Category(CategoryBase):
    id: int
    ativo: bool
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# â”€â”€â”€ Product â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

class ProductBase(BaseModel):
    nome: str = Field(..., min_length=1, max_length=200)
    codigo: str = Field(..., min_length=1, max_length=100)
    tamanho: Optional[str] = Field(None, max_length=50)
    cor: Optional[str] = Field(None, max_length=50)
    categoria: Optional[str] = Field(None, max_length=100)
    category_id: Optional[int] = None
    preco: float = Field(..., gt=0)
    preco_custo: Optional[float] = Field(None, gt=0)
    quantidade_estoque: int = Field(default=0, ge=0)
    estoque_minimo: int = Field(default=5, ge=0)
    image_url: Optional[str] = None


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    nome: Optional[str] = Field(None, min_length=1, max_length=200)
    codigo: Optional[str] = Field(None, min_length=1, max_length=100)
    tamanho: Optional[str] = Field(None, max_length=50)
    cor: Optional[str] = Field(None, max_length=50)
    categoria: Optional[str] = Field(None, max_length=100)
    category_id: Optional[int] = None
    preco: Optional[float] = Field(None, gt=0)
    preco_custo: Optional[float] = Field(None, gt=0)
    quantidade_estoque: Optional[int] = Field(None, ge=0)
    estoque_minimo: Optional[int] = Field(None, ge=0)
    image_url: Optional[str] = None


class Product(ProductBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# â”€â”€â”€ Supplier â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

class SupplierBase(BaseModel):
    nome: str = Field(..., min_length=1, max_length=200)
    tipo: str = Field("formal", pattern="^(formal|informal|autonomo|pessoa_fisica)$")
    cnpj: Optional[str] = Field(None, max_length=18)
    cpf: Optional[str] = Field(None, max_length=14)
    telefone: Optional[str] = Field(None, max_length=20)
    email: Optional[str] = Field(None, max_length=100)
    endereco: Optional[str] = None


class SupplierCreate(SupplierBase):
    pass


class SupplierUpdate(BaseModel):
    nome: Optional[str] = Field(None, min_length=1, max_length=200)
    tipo: Optional[str] = Field(None, pattern="^(formal|informal|autonomo|pessoa_fisica)$")
    cnpj: Optional[str] = Field(None, max_length=18)
    cpf: Optional[str] = Field(None, max_length=14)
    telefone: Optional[str] = Field(None, max_length=20)
    email: Optional[str] = Field(None, max_length=100)
    endereco: Optional[str] = None


class Supplier(SupplierBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# â”€â”€â”€ Customer â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

class CustomerBase(BaseModel):
    nome: str = Field(..., min_length=1, max_length=200)
    tipo_pessoa: str = Field("PF", pattern="^(PF|PJ)$")
    cpf: Optional[str] = Field(None, min_length=11, max_length=14)
    cnpj: Optional[str] = Field(None, max_length=18)
    razao_social: Optional[str] = Field(None, max_length=200)
    telefone: Optional[str] = Field(None, max_length=20)
    email: Optional[str] = Field(None, max_length=100)
    endereco: Optional[str] = None


class CustomerCreate(CustomerBase):
    pass


class CustomerUpdate(BaseModel):
    nome: Optional[str] = Field(None, min_length=1, max_length=200)
    tipo_pessoa: Optional[str] = Field(None, pattern="^(PF|PJ)$")
    cpf: Optional[str] = Field(None, min_length=11, max_length=14)
    cnpj: Optional[str] = Field(None, max_length=18)
    razao_social: Optional[str] = Field(None, max_length=200)
    telefone: Optional[str] = Field(None, max_length=20)
    email: Optional[str] = Field(None, max_length=100)
    endereco: Optional[str] = None


class Customer(CustomerBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# â”€â”€â”€ Stock Movement â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

class StockMovementBase(BaseModel):
    product_id: int
    tipo: MovementTypeEnum
    quantidade: int = Field(..., gt=0)
    motivo: Optional[str] = Field(None, max_length=200)
    observacao: Optional[str] = None
    customer_id: Optional[int] = None
    supplier_id: Optional[int] = None


class StockMovementCreate(StockMovementBase):
    pass


class StockMovement(StockMovementBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


# â”€â”€â”€ Sale â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

class SaleItemBase(BaseModel):
    product_id: int
    quantidade: int = Field(..., gt=0)
    preco_unitario: float = Field(..., gt=0)


class SaleItemCreate(SaleItemBase):
    pass


class SaleItem(SaleItemBase):
    id: int
    sale_id: int
    subtotal: float
    created_at: datetime

    class Config:
        from_attributes = True


class SaleBase(BaseModel):
    customer_id: Optional[int] = None
    desconto: float = Field(default=0.0, ge=0)
    forma_pagamento: str = Field(default="dinheiro", max_length=20)
    observacao: Optional[str] = None


class SaleCreate(BaseModel):
    customer_id: Optional[int] = None
    items: List[SaleItemCreate] = Field(..., min_length=1)
    desconto: float = Field(default=0.0, ge=0)
    forma_pagamento: str = Field(default="dinheiro", max_length=20)
    observacao: Optional[str] = None


class Sale(SaleBase):
    id: int
    total: float
    created_at: datetime
    updated_at: Optional[datetime] = None
    items: List[SaleItem] = []

    class Config:
        from_attributes = True


class SaleWithDetails(Sale):
    customer_nome: Optional[str] = None


# â”€â”€â”€ Audit Log â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

class AuditLogResponse(BaseModel):
    id: int
    user_id: Optional[int]
    action: str
    resource: str
    resource_id: Optional[int]
    details: Optional[str]
    ip_address: Optional[str]
    created_at: datetime
    user_nome: Optional[str] = None

    class Config:
        from_attributes = True


# â”€â”€â”€ Reports â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

class StockReportItem(BaseModel):
    id: int
    nome: str
    codigo: str
    categoria: Optional[str]
    quantidade_estoque: int
    estoque_minimo: int
    baixo_estoque: bool
    preco: float
    preco_custo: Optional[float] = None
    margem_lucro: Optional[float] = None

    class Config:
        from_attributes = True


class SalesReportItem(BaseModel):
    product_id: int
    product_nome: str
    product_codigo: str
    total_vendido: int
    valor_total: float


class TopSupplierItem(BaseModel):
    supplier_id: int
    supplier_nome: str
    total_entradas: int


class TopProductItem(BaseModel):
    product_id: int
    product_nome: str
    product_codigo: str
    total_saidas: int


class FinancialReportItem(BaseModel):
    period: str
    total_vendas: float
    total_devolucoes: float
    lucro_bruto: float
    num_vendas: int
    num_devolucoes: int


class DevolutionReportItem(BaseModel):
    product_id: int
    product_nome: str
    product_codigo: str
    total_devolvido: int
    valor_estimado: float


# â”€â”€â”€ Exchange Rate â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

class CaixaCreate(BaseModel):
    tipo: str = Field(..., pattern="^(abertura|fechamento|sangria|suprimento)$")
    valor: float = Field(..., ge=0)
    observacao: Optional[str] = None


class CaixaResponse(BaseModel):
    id: int
    tipo: str
    valor: float
    observacao: Optional[str] = None
    created_at: datetime
    user_nome: Optional[str] = None

    class Config:
        from_attributes = True


class ExchangeRate(BaseModel):
    moeda: str
    codigo: str
    bid: float
    ask: float
    updated_at: str


Token.model_rebuild()
