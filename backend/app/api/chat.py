from __future__ import annotations

import json
import uuid
from collections.abc import AsyncGenerator

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import async_session_factory, get_session
from app.core.security import verify_token
from app.models.agent import Agent
from app.schemas.chat import ChatRequest, ChatResponse
from app.services.activity_logger import log_activity
from app.services.cost_tracker import record_usage
from app.services.llm_service import chat_with_llm_tracked, stream_chat_with_llm

router = APIRouter(prefix="/chat", tags=["chat"], dependencies=[Depends(verify_token)])

# In-memory chat history per session
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

    if session_id not in _chat_histories:
        _chat_histories[session_id] = []
    history = _chat_histories[session_id]
    history.append({"role": "user", "content": request.message})

    llm_result = await chat_with_llm_tracked(
        model=agent.model,
        system_prompt=agent.system_prompt or agent.description,
        messages=history,
    )

    response_text = llm_result.text
    history.append({"role": "assistant", "content": response_text})
    if len(history) > 20:
        _chat_histories[session_id] = history[-20:]

    await log_activity(
        session,
        agent_id=agent_id,
        action="chat.message",
        payload={"message": request.message[:100], "session_id": session_id},
    )

    # Record actual token usage and cost
    if llm_result.input_tokens > 0 or llm_result.output_tokens > 0:
        await record_usage(
            session,
            agent_id=agent_id,
            model=llm_result.model,
            tokens_in=llm_result.input_tokens,
            tokens_out=llm_result.output_tokens,
        )

    await session.commit()

    return ChatResponse(
        response=response_text,
        session_id=session_id,
        agent_id=str(agent_id),
        agent_name=agent.name,
    )


@router.post("/{agent_id}/stream")
async def chat_stream(
    agent_id: uuid.UUID,
    request: ChatRequest,
    _token: str = Depends(verify_token),
) -> StreamingResponse:
    """Stream chat response token by token via SSE."""
    async with async_session_factory() as session:
        agent = await session.get(Agent, agent_id)
        if agent is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Agent not found")

        agent_name = agent.name
        agent_model = agent.model
        agent_prompt = agent.system_prompt or agent.description

    session_id = request.session_id or str(uuid.uuid4())

    if session_id not in _chat_histories:
        _chat_histories[session_id] = []
    history = _chat_histories[session_id]
    history.append({"role": "user", "content": request.message})

    async def event_stream() -> AsyncGenerator[str, None]:
        full_response: list[str] = []
        async for chunk in stream_chat_with_llm(
            model=agent_model,
            system_prompt=agent_prompt,
            messages=history,
        ):
            full_response.append(chunk)
            yield f"data: {json.dumps({'token': chunk})}\n\n"

        response_text = "".join(full_response)
        history.append({"role": "assistant", "content": response_text})
        if len(history) > 20:
            _chat_histories[session_id] = history[-20:]

        # Log activity in background
        async with async_session_factory() as session:
            await log_activity(
                session,
                agent_id=agent_id,
                action="chat.message",
                payload={"message": request.message[:100], "session_id": session_id},
            )
            await session.commit()

        done_data = {"done": True, "session_id": session_id, "agent_name": agent_name}
        yield f"data: {json.dumps(done_data)}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
