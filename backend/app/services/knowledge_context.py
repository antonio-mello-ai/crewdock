from __future__ import annotations

import logging

from app.core.config import settings
from app.services.qmd_client import qmd_client

logger = logging.getLogger(__name__)


async def get_relevant_context(query: str, max_results: int = 5) -> str | None:
    """Search the knowledge base using keyword + vector search.

    Combines both methods for better coverage — keyword for exact matches,
    vector for semantic similarity.
    """
    if not settings.qmd_base_url:
        return None

    try:
        # Run both searches for better coverage
        keyword_data = await qmd_client.search(query=query, limit=max_results)
        keyword_results = keyword_data.get("results", [])

        vector_results: list[dict[str, object]] = []
        try:
            vector_data = await qmd_client.vector_search(
                query=query, limit=max_results, min_score=0.3
            )
            vector_results = vector_data.get("results", [])
        except Exception:
            pass  # Vector search is optional

        # Merge and deduplicate by file
        seen_files: set[str] = set()
        merged: list[dict[str, object]] = []
        for result in keyword_results + vector_results:
            file = str(result.get("file", ""))
            if file not in seen_files:
                seen_files.add(file)
                merged.append(result)

        if not merged:
            return None

        context_parts: list[str] = []
        for result in merged[:max_results]:
            title = str(result.get("title", ""))
            snippet = str(result.get("snippet", ""))
            file = str(result.get("file", ""))

            # Clean up the snippet
            if snippet.startswith("@@ "):
                lines = snippet.split("\n", 1)
                snippet = lines[1] if len(lines) > 1 else snippet

            context_parts.append(f"### {title}\nSource: {file}\n{snippet}\n")

        return (
            "## Knowledge Base Context\n\n"
            "IMPORTANT: The following information comes from the user's private "
            "knowledge base. Use it to answer the question. If the information "
            "is relevant, reference it directly. Do NOT say you don't have "
            "information if context is provided below.\n\n" + "\n---\n".join(context_parts)
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
