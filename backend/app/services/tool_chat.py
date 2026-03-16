"""Chat with tool use support via MCP servers.

When tools are available, the LLM can decide to call them.
This module handles the tool_use loop: LLM → tool call → result → LLM.
"""

from __future__ import annotations

import logging
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.services.llm_service import MODEL_MAP, LLMResponse
from app.services.mcp_client import (
    execute_tool,
    find_server_for_tool,
    get_all_tools,
    get_enabled_servers,
)

logger = logging.getLogger(__name__)

MAX_TOOL_ROUNDS = 5  # prevent infinite loops


async def chat_with_tools(
    *,
    db: AsyncSession,
    model: str,
    system_prompt: str | None,
    messages: list[dict[str, Any]],
    max_tokens: int = 4096,
) -> LLMResponse:
    """Chat with LLM, executing MCP tools as needed.

    Flow:
    1. Collect tools from all enabled MCP servers
    2. Send to Claude with tool definitions
    3. If Claude returns tool_use, execute it and feed result back
    4. Repeat until Claude returns text (or max rounds)
    """
    api_key = settings.anthropic_api_key
    if not api_key:
        return LLMResponse(
            text="[No API key configured]",
            model=model,
            input_tokens=0,
            output_tokens=0,
        )

    import anthropic

    client = anthropic.AsyncAnthropic(api_key=api_key)
    api_model = MODEL_MAP.get(model, model)

    # Collect tools from MCP servers
    all_tools = await get_all_tools(db)
    servers = await get_enabled_servers(db)

    anthropic_tools = [t.to_anthropic_tool() for t in all_tools]

    total_in = 0
    total_out = 0

    # Build conversation messages (need to handle mixed content types)
    conversation: list[dict[str, Any]] = list(messages)

    for _round in range(MAX_TOOL_ROUNDS):
        kwargs: dict[str, Any] = {
            "model": api_model,
            "max_tokens": max_tokens,
            "messages": conversation,
        }
        if system_prompt:
            kwargs["system"] = system_prompt
        if anthropic_tools:
            kwargs["tools"] = anthropic_tools

        try:
            response = await client.messages.create(**kwargs)
        except anthropic.APIError as e:
            logger.error("Anthropic API error: %s", e)
            return LLMResponse(
                text=f"[API Error] {e.message}",
                model=model,
                input_tokens=total_in,
                output_tokens=total_out,
            )

        total_in += response.usage.input_tokens
        total_out += response.usage.output_tokens

        # Check if the response contains tool use
        if response.stop_reason == "tool_use":
            # Execute tool calls
            tool_results = []
            for block in response.content:
                if block.type == "tool_use":
                    tool_name = block.name
                    tool_input = block.input if isinstance(block.input, dict) else {}

                    logger.info("Tool call: %s(%s)", tool_name, tool_input)

                    # Find the server and execute
                    match = find_server_for_tool(servers, tool_name)
                    if match:
                        server, actual_name = match
                        result_text = await execute_tool(
                            server, actual_name, tool_input
                        )
                    else:
                        result_text = f"[Error] Tool not found: {tool_name}"

                    logger.info(
                        "Tool result (%s): %s", tool_name, result_text[:100]
                    )

                    tool_results.append({
                        "type": "tool_result",
                        "tool_use_id": block.id,
                        "content": result_text,
                    })

            # Add assistant response + tool results to conversation
            conversation.append({
                "role": "assistant",
                "content": [b.model_dump() for b in response.content],
            })
            conversation.append({
                "role": "user",
                "content": tool_results,
            })
            continue

        # No tool use — extract text and return
        text_blocks = [
            block.text for block in response.content if hasattr(block, "text")
        ]
        text = "\n".join(text_blocks) if text_blocks else "[No response]"

        return LLMResponse(
            text=text,
            model=model,
            input_tokens=total_in,
            output_tokens=total_out,
        )

    # Max rounds exceeded
    return LLMResponse(
        text="[Max tool rounds reached]",
        model=model,
        input_tokens=total_in,
        output_tokens=total_out,
    )
