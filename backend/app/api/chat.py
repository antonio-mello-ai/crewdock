import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.core.security import verify_token
from app.models.agent import Agent
from app.schemas.chat import ChatRequest, ChatResponse
from app.services.activity_logger import log_activity
from app.services.gateway.registry import gateway_registry

router = APIRouter(prefix="/chat", tags=["chat"], dependencies=[Depends(verify_token)])


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

    # Send message via gateway adapter
    gateway = gateway_registry.default
    if gateway is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="No gateway configured",
        )

    # Collect streamed response
    response_parts: list[str] = []
    async for chunk in gateway.send_message(
        agent_id=str(agent_id),
        message=request.message,
        session_id=session_id,
    ):
        response_parts.append(chunk)

    full_response = "".join(response_parts)

    await log_activity(
        session,
        agent_id=agent_id,
        action="chat.message",
        payload={"message": request.message[:100], "session_id": session_id},
    )
    await session.commit()

    return ChatResponse(
        response=full_response,
        session_id=session_id,
        agent_id=str(agent_id),
        agent_name=agent.name,
    )
