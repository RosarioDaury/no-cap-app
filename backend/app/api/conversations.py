from fastapi import APIRouter, HTTPException, Response, status

from app.core.deps import CurrentUser, DbSession
from app.schemas.assistant import (
    ConversationDetail,
    ConversationSummary,
    MessageOut,
    RenameConversationRequest,
)
from app.services import assistant as assistant_service
from app.models import Conversation

router = APIRouter(prefix="/v1/conversations", tags=["conversations"])


def _summary(db: DbSession, convo: Conversation) -> ConversationSummary:
    return ConversationSummary(
        id=convo.id,
        title=convo.title,
        updated_at=assistant_service.isoformat_dt(convo.updated_at),
        message_count=assistant_service.message_count(db, convo.id),
    )


@router.get("", response_model=list[ConversationSummary])
def list_conversations(user: CurrentUser, db: DbSession) -> list[ConversationSummary]:
    rows = assistant_service.list_conversations(db, user)
    return [_summary(db, c) for c in rows]


@router.patch("/{conversation_id}", response_model=ConversationSummary)
def rename_conversation(
    conversation_id: str,
    body: RenameConversationRequest,
    user: CurrentUser,
    db: DbSession,
) -> ConversationSummary:
    convo = assistant_service.rename_conversation(db, user, conversation_id, body.title)
    if convo is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")
    return _summary(db, convo)


@router.delete("/{conversation_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_conversation(conversation_id: str, user: CurrentUser, db: DbSession) -> Response:
    if not assistant_service.delete_conversation(db, user, conversation_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")
    return Response(status_code=status.HTTP_204_NO_CONTENT)


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
