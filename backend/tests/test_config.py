from app.core.config import postgres_sqlalchemy_url


def test_postgres_url_uses_psycopg_driver() -> None:
    assert (
        postgres_sqlalchemy_url("postgresql://u:p@host:5432/db")
        == "postgresql+psycopg://u:p@host:5432/db"
    )
    assert (
        postgres_sqlalchemy_url("postgres://u:p@host/db")
        == "postgresql+psycopg://u:p@host/db"
    )
    assert (
        postgres_sqlalchemy_url("postgresql+psycopg://u:p@host/db")
        == "postgresql+psycopg://u:p@host/db"
    )
    assert postgres_sqlalchemy_url("sqlite:///./x.db") == "sqlite:///./x.db"
