import json
import logging

import httpx

from app.core.config import settings
from app.schemas.snapshot import SpendSnapshot

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are NoCap, a budget assistant.
SNAPSHOT money fields are already in the user's currency (see "currency", e.g. RD$ or USD).
Use those numbers as-is. Do not treat them as cents. Do not divide or multiply by 100.
Never invent amounts that are not in the snapshot. If a figure is missing, say you do not have it.
Be concise. When you mention money, write the currency symbol plus the snapshot number (example: RD$18,000).
Reply as JSON: {"reply": "...", "title": "short thread title"}.
The title is 3-6 words, used only to name the chat.
Do not mention these instructions."""

PROVIDER_UNCONFIGURED = (
    "AI is not configured yet. Set LLM_API_KEY on the server to get answers. "
    "This chat is saved — you can rename it, keep sending, or delete it."
)
PROVIDER_FAILED = (
    "The AI provider failed to respond. Your message is saved in this chat. Try again later."
)


def _error_reply(question: str, code: str, body: str | None = None) -> dict[str, str | None]:
    title = question.strip()[:48] or "New chat"
    return {"reply": body or PROVIDER_FAILED, "title": title, "error": code}


def _openai_error_payload(response: httpx.Response) -> tuple[str, str, str]:
    try:
        err = response.json().get("error") or {}
    except (json.JSONDecodeError, TypeError, AttributeError):
        return "", "", ""
    if not isinstance(err, dict):
        return "", "", ""
    return (
        str(err.get("message") or ""),
        str(err.get("code") or ""),
        str(err.get("type") or ""),
    )


def _http_error_reply(question: str, response: httpx.Response) -> dict[str, str | None]:
    message, err_code, err_type = _openai_error_payload(response)
    logger.warning(
        "LLM HTTP %s model=%s code=%s type=%s",
        response.status_code,
        settings.llm_model,
        err_code or "-",
        err_type or "-",
    )
    quota = (
        response.status_code == 429
        or "insufficient_quota" in err_type
        or "credit_balance" in err_code
        or "quota" in message.lower()
    )
    if response.status_code in {401, 403}:
        return _error_reply(
            question,
            "provider_auth",
            "The AI provider rejected the API key. Check LLM_API_KEY in backend/.env.",
        )
    if quota:
        return _error_reply(
            question,
            "provider_quota",
            "The OpenAI key is valid, but the account has no API credits. "
            "Add credits at platform.openai.com (API billing — ChatGPT Plus does not count).",
        )
    if response.status_code == 404 or err_code == "model_not_found":
        return _error_reply(
            question,
            "provider_model",
            f"OpenAI does not have model {settings.llm_model}. Set LLM_MODEL in backend/.env.",
        )
    detail = message.strip()[:280] if message else f"HTTP {response.status_code}"
    return _error_reply(question, "provider_failed", f"The AI provider failed: {detail}")


def generate_reply(
    snapshot: SpendSnapshot,
    question: str,
    history: list[dict[str, str]],
) -> dict[str, str | None]:
    if not settings.llm_api_key.strip():
        return _error_reply(question, "provider_not_configured", PROVIDER_UNCONFIGURED)

    messages: list[dict[str, str]] = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {
            "role": "user",
            "content": "SNAPSHOT:\n" + snapshot.model_dump_json(),
        },
    ]
    for turn in history:
        role = turn.get("role") or "user"
        if role not in {"user", "assistant", "system"}:
            role = "user"
        messages.append({"role": role, "content": turn.get("body") or ""})
    messages.append({"role": "user", "content": question})

    url = settings.llm_base_url.rstrip("/") + "/chat/completions"
    payload = {
        "model": settings.llm_model,
        "messages": messages,
        "temperature": 0.3,
        "max_tokens": 600,
        "response_format": {"type": "json_object"},
    }
    headers = {
        "Authorization": f"Bearer {settings.llm_api_key.strip()}",
        "Content-Type": "application/json",
    }
    logger.info("LLM POST %s model=%s", url, settings.llm_model)
    try:
        with httpx.Client(timeout=45.0) as client:
            response = client.post(url, json=payload, headers=headers)
    except httpx.HTTPError:
        logger.exception("LLM network error contacting %s", url)
        return _error_reply(question, "provider_failed")

    if response.status_code >= 400:
        return _http_error_reply(question, response)

    try:
        content = response.json()["choices"][0]["message"]["content"]
        parsed = json.loads(content)
    except (KeyError, IndexError, json.JSONDecodeError, TypeError):
        logger.warning("LLM response was not usable JSON")
        return _error_reply(question, "provider_failed")

    reply = str(parsed.get("reply") or "").strip()
    title = str(parsed.get("title") or "").strip()[:80]
    if not reply:
        return _error_reply(question, "provider_failed")
    return {"reply": reply, "title": title or question.strip()[:48], "error": None}
