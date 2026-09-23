from fastapi import APIRouter, HTTPException, status

from app.core.deps import CurrentUser, DbSession
from app.schemas.assistant import ChatRequest, ChatResponse
from app.services.assistant import chat

router = APIRouter(prefix="/v1/assistant", tags=["assistant"])


@router.post("/chat", response_model=ChatResponse)
def assistant_chat(body: ChatRequest, user: CurrentUser, db: DbSession) -> ChatResponse:
    try:
        return chat(db, user, body)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc
