import pytest

from app.core.config import settings
from app.core.db import init_db, reset_db_engine


@pytest.fixture(autouse=True)
def isolated_db(tmp_path):
    settings.database_url = f"sqlite:///{tmp_path}/test.db"
    settings.jwt_secret = "test-secret-test-secret-test-xx"
    settings.pii_key = "test-pii-key-test-pii-key-xxxx"
    settings.llm_api_key = ""
    reset_db_engine()
    init_db()
    yield
    reset_db_engine()
