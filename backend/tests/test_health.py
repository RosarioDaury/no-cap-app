from fastapi.testclient import TestClient
import pytest

from app.main import app


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c


def test_root(client: TestClient) -> None:
    response = client.get("/")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert "name" in body


def test_health(client: TestClient) -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
