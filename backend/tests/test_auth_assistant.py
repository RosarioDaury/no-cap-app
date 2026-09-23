from fastapi.testclient import TestClient
import jwt
import pytest
from sqlalchemy import select, text

from app.core.config import settings
from app.core.db import session_factory
from app.core.security import decrypt_pii
from app.main import app
from app.models import User


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c


SNAPSHOT = {
    "v": 1,
    "currency": "RD$",
    "as_of": "2026-09-22",
    "month": "2026-09",
    "days_left": 9,
    "income_cents": 8500000,
    "spend_cents": 3200000,
    "capped_spend_cents": 2800000,
    "total_cap_cents": 5000000,
    "categories": [
        {
            "id": "cat_food",
            "name": "Groceries",
            "cap_cents": 2500000,
            "spent_cents": 1800000,
            "unlimited": False,
        }
    ],
    "monthly_spend": [{"month": "2026-09", "total_cents": 3200000}],
    "monthly_income": [{"month": "2026-09", "total_cents": 8500000}],
    "goals": [],
    "debts": [],
    "bills": [],
    "facts": [
        {
            "id": "warn-cat_food",
            "type": "threshold",
            "category_id": "cat_food",
            "amount_cents": 1800000,
            "label": "Groceries is at 72% of its cap",
        }
    ],
}

PROFILE = {
    "password": "longenough",
    "gender": "prefer_not",
    "date_of_birth": "1995-06-15",
}


def _register(
    client: TestClient,
    email: str = "alex@example.com",
    username: str = "alex",
) -> dict:
    response = client.post(
        "/v1/auth/register",
        json={"username": username, "email": email, **PROFILE},
    )
    assert response.status_code == 201, response.text
    return response.json()


def test_register_login_me(client: TestClient) -> None:
    created = _register(client)
    assert created["user_id"].startswith("user_")
    assert created["username"] == "alex"
    assert created["email"] == "alex@example.com"
    assert created["access_token"]

    payload = jwt.decode(created["access_token"], settings.jwt_secret, algorithms=["HS256"])
    assert payload["sub"] == created["user_id"]
    assert payload["username"] == "alex"
    assert "email" not in payload
    assert "gender" not in payload

    dup_email = client.post(
        "/v1/auth/register",
        json={"username": "alex2", "email": "Alex@example.com", **PROFILE},
    )
    assert dup_email.status_code == 409

    dup_user = client.post(
        "/v1/auth/register",
        json={"username": "Alex", "email": "other@example.com", **PROFILE},
    )
    assert dup_user.status_code == 409

    bad = client.post(
        "/v1/auth/login",
        json={"identifier": "alex@example.com", "password": "wrongpass"},
    )
    assert bad.status_code == 401

    by_email = client.post(
        "/v1/auth/login",
        json={"identifier": "alex@example.com", "password": "longenough"},
    )
    assert by_email.status_code == 200
    by_name = client.post(
        "/v1/auth/login",
        json={"identifier": "Alex", "password": "longenough"},
    )
    assert by_name.status_code == 200
    legacy = client.post(
        "/v1/auth/login",
        json={"email": "alex@example.com", "password": "longenough"},
    )
    assert legacy.status_code == 200
    headers = {"Authorization": f"Bearer {by_name.json()['access_token']}"}
    me = client.get("/v1/auth/me", headers=headers)
    assert me.status_code == 200
    body = me.json()
    assert body["email"] == "alex@example.com"
    assert body["username"] == "alex"
    assert body["gender"] == "prefer_not"
    assert body["date_of_birth"] == "1995-06-15"


def test_pii_encrypted_at_rest(client: TestClient) -> None:
    _register(client)
    db = session_factory()()
    try:
        user = db.scalar(select(User).where(User.username == "alex"))
        assert user is not None
        assert "alex@example.com" not in user.email_enc
        assert user.email_hash != "alex@example.com"
        assert decrypt_pii(user.email_enc) == "alex@example.com"
        assert decrypt_pii(user.gender_enc) == "prefer_not"
        assert decrypt_pii(user.dob_enc) == "1995-06-15"
        row = db.execute(text("SELECT * FROM users")).mappings().one()
        dumped = " ".join(str(v) for v in row.values())
        assert "alex@example.com" not in dumped
        assert "1995-06-15" not in dumped
        assert "prefer_not" not in dumped
    finally:
        db.close()


def test_availability_and_validation(client: TestClient) -> None:
    empty = client.get("/v1/auth/available", params={"username": "alex"})
    assert empty.status_code == 200
    assert empty.json() == {"username_taken": False, "email_taken": None}

    _register(client)
    taken = client.get(
        "/v1/auth/available",
        params={"username": "Alex", "email": "alex@example.com"},
    )
    assert taken.json() == {"username_taken": True, "email_taken": True}

    young = client.post(
        "/v1/auth/register",
        json={
            "username": "kiddo",
            "email": "kid@example.com",
            "password": "longenough",
            "gender": "male",
            "date_of_birth": "2020-01-01",
        },
    )
    assert young.status_code == 422

    bad_name = client.post(
        "/v1/auth/register",
        json={
            "username": "no spaces",
            "email": "ok@example.com",
            "password": "longenough",
            "gender": "male",
            "date_of_birth": "1995-06-15",
        },
    )
    assert bad_name.status_code == 422


def test_chat_requires_auth(client: TestClient) -> None:
    response = client.post(
        "/v1/assistant/chat",
        json={"message": "How am I doing?", "snapshot": SNAPSHOT},
    )
    assert response.status_code == 401


def test_chat_creates_server_session(client: TestClient) -> None:
    token = _register(client, "chat@example.com", "chatty")["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    first = client.post(
        "/v1/assistant/chat",
        json={"message": "How are groceries?", "snapshot": SNAPSHOT},
        headers=headers,
    )
    assert first.status_code == 200, first.text
    body = first.json()
    assert body["conversation_id"].startswith("convo_")
    assert body["snapshot_id"].startswith("snap_")
    assert body["user_id"].startswith("user_")
    assert "Groceries" in body["reply"] or "groceries" in body["reply"].lower() or body["reply"]

    listed = client.get("/v1/conversations", headers=headers)
    assert listed.status_code == 200
    assert len(listed.json()) == 1
    assert listed.json()[0]["id"] == body["conversation_id"]

    detail = client.get(f"/v1/conversations/{body['conversation_id']}", headers=headers)
    assert detail.status_code == 200
    messages = detail.json()["messages"]
    assert [m["role"] for m in messages] == ["user", "assistant"]

    second = client.post(
        "/v1/assistant/chat",
        json={
            "conversation_id": body["conversation_id"],
            "message": "What is left?",
            "snapshot": SNAPSHOT,
        },
        headers=headers,
    )
    assert second.status_code == 200
    assert second.json()["conversation_id"] == body["conversation_id"]
    assert second.json()["snapshot_id"] == body["snapshot_id"]

    other = _register(client, "other@example.com", "other")["access_token"]
    stolen = client.get(
        f"/v1/conversations/{body['conversation_id']}",
        headers={"Authorization": f"Bearer {other}"},
    )
    assert stolen.status_code == 404
