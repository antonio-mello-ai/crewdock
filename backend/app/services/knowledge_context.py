from __future__ import annotations

import logging

from app.core.config import settings
from app.services.qmd_client import qmd_client

logger = logging.getLogger(__name__)


async def get_relevant_context(query: str, max_results: int = 3) -> str | None:
    """Search the knowledge base and return relevant context for the LLM.

    Returns a formatted string of relevant document snippets,
    or None if QMD is not configured or no results found.
    """
    if not settings.qmd_base_url:
        return None

    try:
        data = await qmd_client.search(query=query, limit=max_results)
        results = data.get("results", [])

        if not results:
            return None

        context_parts: list[str] = []
        for result in results[:max_results]:
            title = result.get("title", "")
            snippet = result.get("snippet", "")
            file = result.get("file", "")

            # Clean up the snippet
            clean_snippet = snippet
            if clean_snippet.startswith("@@ "):
                # Remove the diff-style header
                lines = clean_snippet.split("\n", 1)
                clean_snippet = lines[1] if len(lines) > 1 else clean_snippet

            context_parts.append(f"### {title}\nSource: {file}\n{clean_snippet}\n")

        return (
            "## Relevant Knowledge Base Context\n\n"
            "Use the following information from the knowledge base to inform your response. "
            "Reference specific documents when relevant.\n\n" + "\n---\n".join(context_parts)
        )
    except Exception as e:
        logger.warning("Knowledge context retrieval failed: %s", e)
        return None


def build_enhanced_prompt(
    system_prompt: str | None,
    knowledge_context: str | None,
) -> str:
    """Combine the agent's system prompt with knowledge context."""
    parts: list[str] = []

    if system_prompt:
        parts.append(system_prompt)

    if knowledge_context:
        parts.append(knowledge_context)

    return "\n\n".join(parts) if parts else "You are a helpful AI assistant."
