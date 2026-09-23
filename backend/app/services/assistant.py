import hashlib
from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models import Conversation, Message, Snapshot, User
from app.schemas.assistant import ChatRequest, ChatResponse
from app.services.llm import generate_reply


def new_id(prefix: str) -> str:
    from uuid import uuid4

    return f"{prefix}_{uuid4().hex[:16]}"


def _snapshot_digest(payload: str) -> str:
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def isoformat_dt(dt: datetime) -> str:
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.isoformat()


def list_conversations(db: Session, user: User) -> list[Conversation]:
    return list(
        db.scalars(
            select(Conversation)
            .where(Conversation.user_id == user.id)
            .order_by(Conversation.updated_at.desc())
        ).all()
    )


def get_conversation(db: Session, user: User, conversation_id: str) -> Conversation | None:
    convo = db.get(Conversation, conversation_id)
    if convo is None or convo.user_id != user.id:
        return None
    return convo


def message_count(db: Session, conversation_id: str) -> int:
    return int(
        db.scalar(select(func.count()).where(Message.conversation_id == conversation_id)) or 0
    )


def chat(db: Session, user: User, req: ChatRequest) -> ChatResponse:
    payload = req.snapshot.model_dump_json()
    if len(payload.encode("utf-8")) > settings.snapshot_max_bytes:
        raise ValueError("Snapshot is too large")

    now = datetime.now(timezone.utc)
    convo: Conversation | None = None
    if req.conversation_id:
        convo = get_conversation(db, user, req.conversation_id)
        if convo is None:
            raise LookupError("Conversation not found")

    if convo is None:
        convo = Conversation(
            id=new_id("convo"),
            user_id=user.id,
            title=req.message.strip()[:48] or "New chat",
            created_at=now,
            updated_at=now,
        )
        db.add(convo)
        db.flush()

    digest = _snapshot_digest(payload)
    snap = db.scalar(
        select(Snapshot).where(
            Snapshot.conversation_id == convo.id,
            Snapshot.digest == digest,
        )
    )
    if snap is None:
        snap = Snapshot(
            id=new_id("snap"),
            user_id=user.id,
            conversation_id=convo.id,
            digest=digest,
            payload_json=payload,
            created_at=now,
        )
        db.add(snap)
        db.flush()

    prior = list(
        db.scalars(
            select(Message)
            .where(Message.conversation_id == convo.id)
            .order_by(Message.created_at.desc())
            .limit(settings.chat_history_limit)
        ).all()
    )
    prior.reverse()
    history = [{"role": m.role, "body": m.body} for m in prior]

    generated = generate_reply(req.snapshot, req.message.strip(), history)

    user_msg = Message(
        id=new_id("msg"),
        conversation_id=convo.id,
        role="user",
        body=req.message.strip(),
        created_at=now,
    )
    assistant_msg = Message(
        id=new_id("msg"),
        conversation_id=convo.id,
        role="assistant",
        body=generated["reply"],
        created_at=now,
    )
    db.add(user_msg)
    db.add(assistant_msg)
    if convo.title in {"New chat", ""} or message_count(db, convo.id) <= 1:
        convo.title = generated["title"] or convo.title
    convo.updated_at = now
    db.commit()

    return ChatResponse(
        conversation_id=convo.id,
        user_id=user.id,
        message_id=assistant_msg.id,
        snapshot_id=snap.id,
        title=convo.title,
        reply=generated["reply"],
    )
