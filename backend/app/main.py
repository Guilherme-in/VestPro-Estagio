import os
import time
import logging
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from app.database import engine, Base
from app.routers import products, suppliers, customers, movements, reports, sales
from app.routers import auth, categories, users, audit, tenant, caixa

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)
logger = logging.getLogger("vestpro")

Base.metadata.create_all(bind=engine)

# Migrations manuais para colunas adicionadas após criação inicial
def run_migrations():
    try:
        with engine.connect() as conn:
            from sqlalchemy import text
            migrations = [
                "ALTER TABLE customers ADD COLUMN IF NOT EXISTS tipo_pessoa VARCHAR(2) NOT NULL DEFAULT 'PF'",
                "ALTER TABLE customers ADD COLUMN IF NOT EXISTS cnpj VARCHAR(18)",
                "ALTER TABLE customers ADD COLUMN IF NOT EXISTS razao_social VARCHAR(200)",
            ]
            for sql in migrations:
                conn.execute(text(sql))
            conn.commit()
        logger.info("Migrations aplicadas com sucesso.")
    except Exception as e:
        logger.warning("Migration ignorada: %s", e)

run_migrations()

app = FastAPI(
    title="VestPro Sistema de Gestão de Estoque",
    description="API para gerenciamento de estoque de comércio de roupas",
    version="2.0.0",
)

ALLOWED_ORIGINS = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:5173,http://localhost:3000"
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def log_requests(request: Request, call_next):
    start = time.time()
    response = await call_next(request)
    duration = round((time.time() - start) * 1000, 2)
    logger.info(
        "%s %s %s %sms",
        request.method,
        request.url.path,
        response.status_code,
        duration,
    )
    return response


# Routers existentes
app.include_router(auth.router)
app.include_router(categories.router)
app.include_router(users.router)
app.include_router(audit.router)
app.include_router(products.router)
app.include_router(suppliers.router)
app.include_router(customers.router)
app.include_router(movements.router)
app.include_router(sales.router)
app.include_router(reports.router)
app.include_router(tenant.router)
app.include_router(caixa.router)


@app.get("/")
def root():
    return {
        "message": "VestPro API v2.0",
        "docs": "/docs",
        "redoc": "/redoc",
    }


@app.get("/health")
def health_check():
    return {"status": "healthy", "version": "2.0.0"}
