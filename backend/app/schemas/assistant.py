from pydantic import BaseModel, Field

from app.schemas.snapshot import SpendSnapshot


class ChatRequest(BaseModel):
    conversation_id: str | None = Field(default=None, max_length=40)
    message: str = Field(min_length=1, max_length=2000)
    snapshot: SpendSnapshot


class ChatResponse(BaseModel):
    conversation_id: str
    user_id: str
    message_id: str
    snapshot_id: str
    title: str
    reply: str


class ConversationSummary(BaseModel):
    id: str
    title: str
    updated_at: str
    message_count: int


class MessageOut(BaseModel):
    id: str
    role: str
    body: str
    created_at: str


class ConversationDetail(BaseModel):
    id: str
    title: str
    user_id: str
    created_at: str
    updated_at: str
    messages: list[MessageOut]
