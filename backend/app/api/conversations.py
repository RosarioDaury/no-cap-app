from fastapi import APIRouter, HTTPException, status

from app.core.deps import CurrentUser, DbSession
from app.schemas.assistant import ConversationDetail, ConversationSummary, MessageOut
from app.services import assistant as assistant_service

router = APIRouter(prefix="/v1/conversations", tags=["conversations"])


@router.get("", response_model=list[ConversationSummary])
def list_conversations(user: CurrentUser, db: DbSession) -> list[ConversationSummary]:
    rows = assistant_service.list_conversations(db, user)
    return [
        ConversationSummary(
            id=c.id,
            title=c.title,
            updated_at=assistant_service.isoformat_dt(c.updated_at),
            message_count=assistant_service.message_count(db, c.id),
        )
        for c in rows
    ]


@router.get("/{conversation_id}", response_model=ConversationDetail)
def get_conversation(conversation_id: str, user: CurrentUser, db: DbSession) -> ConversationDetail:
    convo = assistant_service.get_conversation(db, user, conversation_id)
    if convo is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")
    return ConversationDetail(
        id=convo.id,
        title=convo.title,
        user_id=convo.user_id,
        created_at=assistant_service.isoformat_dt(convo.created_at),
        updated_at=assistant_service.isoformat_dt(convo.updated_at),
        messages=[
            MessageOut(
                id=m.id,
                role=m.role,
                body=m.body,
                created_at=assistant_service.isoformat_dt(m.created_at),
            )
            for m in convo.messages
        ],
    )
