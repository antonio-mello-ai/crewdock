"""Telegram bot integration for CrewDock.

Routes messages to agents. Commands:
  /atlas <message>   → Route to Atlas agent
  /bernard <message> → Route to Bernard agent
  /nexus <message>   → Route to Nexus agent
  /pulse <message>   → Route to Pulse agent
  (no command)       → Route to default agent (configurable)
  /agents            → List available agents
  /help              → Show available commands
"""

from __future__ import annotations

import logging
from collections.abc import Callable, Coroutine
from typing import Any

from telegram import Update
from telegram.ext import (
    Application,
    CommandHandler,
    ContextTypes,
    MessageHandler,
    filters,
)

from app.core.config import settings

logger = logging.getLogger(__name__)

_app: Application | None = None  # type: ignore[type-arg]


async def _get_agent_by_name(name: str) -> tuple[str, str, str | None] | None:
    """Find an agent by name (case-insensitive). Returns (id, name, model)."""
    from sqlalchemy import select

    from app.core.database import async_session_factory
    from app.models.agent import Agent

    async with async_session_factory() as session:
        result = await session.execute(select(Agent))
        agents = result.scalars().all()
        for agent in agents:
            if agent.name.lower() == name.lower():
                return str(agent.id), agent.name, agent.model
    return None


async def _chat_with_agent(agent_id: str, message: str, session_id: str) -> str:
    """Send a message to an agent and get a response."""
    from app.core.database import async_session_factory
    from app.services.chat_history import append_message
    from app.services.knowledge_context import build_enhanced_prompt, get_relevant_context
    from app.services.llm_service import chat_with_llm
    from app.services.mcp_client import get_enabled_servers
    from app.services.tool_chat import chat_with_tools

    async with async_session_factory() as db:
        import uuid

        from app.models.agent import Agent

        agent = await db.get(Agent, uuid.UUID(agent_id))
        if agent is None:
            return "[Agent not found]"

        # Build context
        history = await append_message(session_id, "user", message)
        knowledge = await get_relevant_context(message)
        enhanced_prompt = build_enhanced_prompt(agent.system_prompt or agent.description, knowledge)

        # Use tools if available
        mcp_servers = await get_enabled_servers(db)
        if mcp_servers:
            result = await chat_with_tools(
                db=db,
                model=agent.model,
                system_prompt=enhanced_prompt,
                messages=history,
            )
            response = result.text
        else:
            response = await chat_with_llm(
                model=agent.model,
                system_prompt=enhanced_prompt,
                messages=history,
            )

        await append_message(session_id, "assistant", response)
        return response


async def _handle_agent_command(
    update: Update, context: ContextTypes.DEFAULT_TYPE, agent_name: str
) -> None:
    """Handle /agentname <message> commands."""
    if not update.message or not update.message.text:
        return

    # Extract message after command
    parts = update.message.text.split(maxsplit=1)
    message = parts[1] if len(parts) > 1 else "Hello!"

    agent = await _get_agent_by_name(agent_name)
    if not agent:
        await update.message.reply_text(f"Agent '{agent_name}' not found.")
        return

    agent_id, name, _ = agent
    chat_id = update.effective_chat.id if update.effective_chat else 0
    session_id = f"telegram_{chat_id}_{name.lower()}"

    await update.message.chat.send_action("typing")
    response = await _chat_with_agent(agent_id, message, session_id)

    # Telegram has a 4096 char limit
    if len(response) > 4000:
        for i in range(0, len(response), 4000):
            await update.message.reply_text(response[i : i + 4000])
    else:
        await update.message.reply_text(response)


async def _handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Handle plain messages — route to default agent."""
    if not update.message or not update.message.text:
        return

    default_name = settings.telegram_default_agent
    agent = await _get_agent_by_name(default_name)
    if not agent:
        await update.message.reply_text(
            f"Default agent '{default_name}' not configured. Use /agents to see available agents."
        )
        return

    agent_id, name, _ = agent
    chat_id = update.effective_chat.id if update.effective_chat else 0
    session_id = f"telegram_{chat_id}_{name.lower()}"

    await update.message.chat.send_action("typing")
    response = await _chat_with_agent(agent_id, update.message.text, session_id)

    if len(response) > 4000:
        for i in range(0, len(response), 4000):
            await update.message.reply_text(response[i : i + 4000])
    else:
        await update.message.reply_text(response)


async def _handle_agents_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """List available agents."""
    from sqlalchemy import select

    from app.core.database import async_session_factory
    from app.models.agent import Agent

    async with async_session_factory() as session:
        result = await session.execute(select(Agent))
        agents = result.scalars().all()

    if not agents:
        if update.message:
            await update.message.reply_text("No agents configured.")
        return

    lines = ["Available agents:\n"]
    for agent in agents:
        lines.append(f"/{agent.name.lower()} <message> — {agent.description or agent.model}")
    lines.append(f"\nDefault: messages without a command go to {settings.telegram_default_agent}")

    if update.message:
        await update.message.reply_text("\n".join(lines))


async def _handle_help(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Show help."""
    if update.message:
        await update.message.reply_text(
            "CrewDock Bot\n\n"
            "/agents — List available agents\n"
            "/<agent> <message> — Chat with a specific agent\n"
            "(any message) — Chat with default agent\n\n"
            "Example: /atlas What's on my calendar today?"
        )


async def start_telegram_bot() -> None:
    """Start the Telegram bot (called from FastAPI lifespan)."""
    global _app

    if not settings.telegram_bot_token:
        logger.info("Telegram bot token not configured, skipping")
        return

    logger.info("Starting Telegram bot...")

    _app = Application.builder().token(settings.telegram_bot_token).build()

    # Register commands
    _app.add_handler(CommandHandler("help", _handle_help))
    _app.add_handler(CommandHandler("start", _handle_help))
    _app.add_handler(CommandHandler("agents", _handle_agents_command))

    # Dynamic agent commands — register known agents
    from sqlalchemy import select

    from app.core.database import async_session_factory
    from app.models.agent import Agent

    async with async_session_factory() as session:
        result = await session.execute(select(Agent))
        agents = result.scalars().all()
        for agent in agents:
            cmd = agent.name.lower()

            def _make_handler(
                agent_name: str,
            ) -> Callable[[Update, ContextTypes.DEFAULT_TYPE], Coroutine[Any, Any, None]]:
                async def _handler(u: Update, c: ContextTypes.DEFAULT_TYPE) -> None:
                    await _handle_agent_command(u, c, agent_name)

                return _handler

            _app.add_handler(CommandHandler(cmd, _make_handler(agent.name)))
            logger.info("Registered Telegram command: /%s", cmd)

    # Default handler for plain messages
    _app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, _handle_message))

    await _app.initialize()
    await _app.start()
    await _app.updater.start_polling(drop_pending_updates=True)  # type: ignore[union-attr]

    logger.info("Telegram bot started")


async def stop_telegram_bot() -> None:
    """Stop the Telegram bot."""
    global _app

    if _app is None:
        return

    logger.info("Stopping Telegram bot...")
    await _app.updater.stop()  # type: ignore[union-attr]
    await _app.stop()
    await _app.shutdown()
    _app = None
    logger.info("Telegram bot stopped")
