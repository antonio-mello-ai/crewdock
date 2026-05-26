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
from app.services.chat_history import append_message
from app.services.cost_tracker import record_usage
from app.services.knowledge_context import build_enhanced_prompt, get_relevant_context
from app.services.llm_service import chat_with_llm_tracked, stream_chat_with_llm
from app.services.mcp_client import get_enabled_servers
from app.services.tool_chat import chat_with_tools

router = APIRouter(prefix="/chat", tags=["chat"], dependencies=[Depends(verify_token)])


@router.get("/history/{session_id}")
async def get_chat_history(session_id: str) -> list[dict[str, str]]:
    """Get chat history for a session."""
    from app.services.chat_history import get_history

    return await get_history(session_id)


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

    # Get history and add user message
    history = await append_message(session_id, "user", request.message)

    # Retrieve relevant knowledge context
    knowledge = await get_relevant_context(request.message)
    enhanced_prompt = build_enhanced_prompt(agent.system_prompt or agent.description, knowledge)

    # Use tool-enabled chat if MCP servers are configured
    mcp_servers = await get_enabled_servers(session)
    if mcp_servers:
        llm_result = await chat_with_tools(
            db=session,
            model=agent.model,
            system_prompt=enhanced_prompt,
            messages=history,
        )
    else:
        llm_result = await chat_with_llm_tracked(
            model=agent.model,
            system_prompt=enhanced_prompt,
            messages=history,
        )

    # Save assistant response
    await append_message(session_id, "assistant", llm_result.text)

    await log_activity(
        session,
        agent_id=agent_id,
        action="chat.message",
        payload={"message": request.message[:100], "session_id": session_id},
    )

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
        response=llm_result.text,
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

    # Get history and add user message
    history = await append_message(session_id, "user", request.message)

    # Retrieve knowledge context
    knowledge = await get_relevant_context(request.message)
    enhanced_prompt = build_enhanced_prompt(agent_prompt, knowledge)

    # Check if MCP tools are available
    async with async_session_factory() as db_check:
        mcp_servers = await get_enabled_servers(db_check)
    has_tools = len(mcp_servers) > 0

    async def event_stream() -> AsyncGenerator[str, None]:
        if has_tools:
            # Use non-streaming with tool support
            async with async_session_factory() as tool_db:
                llm_result = await chat_with_tools(
                    db=tool_db,
                    model=agent_model,
                    system_prompt=enhanced_prompt,
                    messages=history,
                )
            # Send the full response as a single chunk
            yield f"data: {json.dumps({'token': llm_result.text})}\n\n"
            response_text = llm_result.text
        else:
            # Stream normally
            full_response: list[str] = []
            async for chunk in stream_chat_with_llm(
                model=agent_model,
                system_prompt=enhanced_prompt,
                messages=history,
            ):
                full_response.append(chunk)
                yield f"data: {json.dumps({'token': chunk})}\n\n"
            response_text = "".join(full_response)

        # Save to persistent history
        await append_message(session_id, "assistant", response_text)

        # Log activity and costs
        async with async_session_factory() as db:
            await log_activity(
                db,
                agent_id=agent_id,
                action="chat.message",
                payload={
                    "message": request.message[:100],
                    "session_id": session_id,
                },
            )
            est_in = len(request.message) // 4 + 50
            est_out = len(response_text) // 4
            if est_in > 0 or est_out > 0:
                await record_usage(
                    db,
                    agent_id=agent_id,
                    model=agent_model,
                    tokens_in=est_in,
                    tokens_out=est_out,
                )
            await db.commit()

        done_data = {
            "done": True,
            "session_id": session_id,
            "agent_name": agent_name,
        }
        yield f"data: {json.dumps(done_data)}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
