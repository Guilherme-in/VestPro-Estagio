import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.main import app
from app.database import Base, get_db
from app.models import User, UserRole, Tenant
from app.utils.auth import get_password_hash

SQLALCHEMY_TEST_URL = "sqlite:///./test.db"

engine_test = create_engine(SQLALCHEMY_TEST_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine_test)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture(scope="session", autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine_test)
    db = TestingSessionLocal()
    tenant = Tenant(nome_loja="Loja Teste")
    db.add(tenant)
    db.flush()
    admin = User(
        nome="Admin Teste",
        email="admin@test.com",
        username="admin",
        hashed_password=get_password_hash("admin123"),
        role=UserRole.ADMIN,
        ativo=True,
        tenant_id=tenant.id,
    )
    db.add(admin)
    db.commit()
    db.close()
    yield
    Base.metadata.drop_all(bind=engine_test)


@pytest.fixture
def client():
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture
def auth_headers(client):
    resp = client.post("/auth/login", json={"username": "admin", "password": "admin123"})
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}
