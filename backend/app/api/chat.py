import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.core.security import verify_token
from app.models.agent import Agent
from app.schemas.chat import ChatRequest, ChatResponse
from app.services.activity_logger import log_activity
from app.services.llm_service import chat_with_llm

router = APIRouter(prefix="/chat", tags=["chat"], dependencies=[Depends(verify_token)])

# In-memory chat history per session (simple, replace with DB/Redis later)
_chat_histories: dict[str, list[dict[str, str]]] = {}


@router.post("/{agent_id}", response_model=ChatResponse)
async def chat_with_agent(
    agent_id: uuid.UUID,
    request: ChatRequest,
    session: AsyncSession = Depends(get_session),
) -> ChatResponse:
    agent = await session.get(Agent, agent_id)
    if agent is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Agent not found")

    session_id = request.session_id or str(uuid.uuid4())

    # Get or create chat history for this session
    if session_id not in _chat_histories:
        _chat_histories[session_id] = []

    history = _chat_histories[session_id]

    # Add user message to history
    history.append({"role": "user", "content": request.message})

    # Call LLM with full conversation history
    response_text = await chat_with_llm(
        model=agent.model,
        system_prompt=agent.system_prompt or agent.description,
        messages=history,
    )

    # Add assistant response to history
    history.append({"role": "assistant", "content": response_text})

    # Keep history manageable (last 20 messages)
    if len(history) > 20:
        _chat_histories[session_id] = history[-20:]

    # Log activity
    await log_activity(
        session,
        agent_id=agent_id,
        action="chat.message",
        payload={"message": request.message[:100], "session_id": session_id},
    )

    # Track cost (estimate — actual usage comes from API response in future)
    # For now just log the activity
    await session.commit()

    return ChatResponse(
        response=response_text,
        session_id=session_id,
        agent_id=str(agent_id),
        agent_name=agent.name,
    )
