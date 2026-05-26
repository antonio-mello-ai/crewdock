from __future__ import annotations

import logging
from collections.abc import AsyncIterator
from dataclasses import dataclass
from typing import Any

from app.core.config import settings

logger = logging.getLogger(__name__)

MODEL_MAP: dict[str, str] = {
    "claude-opus-4-6": "claude-opus-4-20250514",
    "claude-sonnet-4-6": "claude-sonnet-4-20250514",
    "claude-sonnet-4": "claude-sonnet-4-20250514",
    "claude-haiku-4-5": "claude-haiku-4-5-20251001",
}


@dataclass
class LLMResponse:
    text: str
    model: str
    input_tokens: int
    output_tokens: int


async def chat_with_llm(
    *,
    model: str,
    system_prompt: str | None,
    messages: list[dict[str, str]],
    max_tokens: int = 2048,
) -> str:
    """Send a message to an LLM and get a response."""
    result = await chat_with_llm_tracked(
        model=model,
        system_prompt=system_prompt,
        messages=messages,
        max_tokens=max_tokens,
    )
    return result.text


async def chat_with_llm_tracked(
    *,
    model: str,
    system_prompt: str | None,
    messages: list[dict[str, str]],
    max_tokens: int = 2048,
) -> LLMResponse:
    """Send a message to an LLM and get response with usage data."""
    api_key = settings.anthropic_api_key
    if not api_key:
        return LLMResponse(
            text="[No API key configured] Set ANTHROPIC_API_KEY in .env",
            model=model,
            input_tokens=0,
            output_tokens=0,
        )

    import anthropic

    client = anthropic.AsyncAnthropic(api_key=api_key)
    api_model = MODEL_MAP.get(model, model)

    kwargs: dict[str, Any] = {
        "model": api_model,
        "max_tokens": max_tokens,
        "messages": messages,
    }
    if system_prompt:
        kwargs["system"] = system_prompt

    try:
        response = await client.messages.create(**kwargs)
        text_blocks = [block.text for block in response.content if hasattr(block, "text")]
        text = "\n".join(text_blocks) if text_blocks else "[No response]"

        return LLMResponse(
            text=text,
            model=model,
            input_tokens=response.usage.input_tokens,
            output_tokens=response.usage.output_tokens,
        )
    except anthropic.APIError as e:
        logger.error("Anthropic API error: %s", e)
        return LLMResponse(
            text=f"[API Error] {e.message}", model=model, input_tokens=0, output_tokens=0
        )
    except Exception as e:
        logger.error("LLM service error: %s", e)
        return LLMResponse(text=f"[Error] {e}", model=model, input_tokens=0, output_tokens=0)


async def stream_chat_with_llm(
    *,
    model: str,
    system_prompt: str | None,
    messages: list[dict[str, str]],
    max_tokens: int = 2048,
) -> AsyncIterator[str]:
    """Stream a response from an LLM."""
    api_key = settings.anthropic_api_key
    if not api_key:
        yield "[No API key configured] Set ANTHROPIC_API_KEY in .env"
        return

    import anthropic

    client = anthropic.AsyncAnthropic(api_key=api_key)
    api_model = MODEL_MAP.get(model, model)

    kwargs: dict[str, Any] = {
        "model": api_model,
        "max_tokens": max_tokens,
        "messages": messages,
    }
    if system_prompt:
        kwargs["system"] = system_prompt

    try:
        async with client.messages.stream(**kwargs) as stream:
            async for text in stream.text_stream:
                yield text
    except Exception as e:
        logger.error("LLM stream error: %s", e)
        yield f"[Error] {e}"
