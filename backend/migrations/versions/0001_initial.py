"""Initial users, conversations, messages, snapshots.

Revision ID: 0001_initial
Revises:
Create Date: 2026-10-27
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0001_initial"
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.String(length=40), primary_key=True),
        sa.Column("username", sa.String(length=24), nullable=False),
        sa.Column("email_hash", sa.String(length=64), nullable=False),
        sa.Column("email_enc", sa.Text(), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("gender_enc", sa.Text(), nullable=False),
        sa.Column("dob_enc", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_users_username", "users", ["username"], unique=True)
    op.create_index("ix_users_email_hash", "users", ["email_hash"], unique=True)

    op.create_table(
        "conversations",
        sa.Column("id", sa.String(length=40), primary_key=True),
        sa.Column("user_id", sa.String(length=40), nullable=False),
        sa.Column("title", sa.String(length=120), nullable=False, server_default="New chat"),
        sa.Column("brief_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("focus_json", sa.Text(), nullable=False, server_default="{}"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_conversations_user_id", "conversations", ["user_id"])

    op.create_table(
        "messages",
        sa.Column("id", sa.String(length=40), primary_key=True),
        sa.Column("conversation_id", sa.String(length=40), nullable=False),
        sa.Column("role", sa.String(length=20), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["conversation_id"], ["conversations.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_messages_conversation_id", "messages", ["conversation_id"])

    op.create_table(
        "snapshots",
        sa.Column("id", sa.String(length=40), primary_key=True),
        sa.Column("user_id", sa.String(length=40), nullable=False),
        sa.Column("conversation_id", sa.String(length=40), nullable=False),
        sa.Column("digest", sa.String(length=64), nullable=False),
        sa.Column("payload_json", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["conversation_id"], ["conversations.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("conversation_id", "digest", name="uq_conversation_digest"),
    )
    op.create_index("ix_snapshots_user_id", "snapshots", ["user_id"])
    op.create_index("ix_snapshots_conversation_id", "snapshots", ["conversation_id"])
    op.create_index("ix_snapshots_digest", "snapshots", ["digest"])


def downgrade() -> None:
    op.drop_table("snapshots")
    op.drop_table("messages")
    op.drop_table("conversations")
    op.drop_table("users")
