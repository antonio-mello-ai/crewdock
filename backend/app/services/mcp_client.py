from __future__ import annotations

import json
import logging
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.mcp_server import McpServer

logger = logging.getLogger(__name__)


class McpToolDefinition:
    """A tool exposed by an MCP server, formatted for the Anthropic API."""

    def __init__(
        self,
        *,
        server_name: str,
        name: str,
        description: str,
        input_schema: dict[str, Any],
    ) -> None:
        self.server_name = server_name
        self.name = name
        self.description = description
        self.input_schema = input_schema

    @property
    def qualified_name(self) -> str:
        """Unique name: server__tool."""
        return f"mcp__{self.server_name}__{self.name}"

    def to_anthropic_tool(self) -> dict[str, Any]:
        """Format for Anthropic API tool_use."""
        return {
            "name": self.qualified_name,
            "description": f"[{self.server_name}] {self.description}",
            "input_schema": self.input_schema,
        }


async def get_enabled_servers(session: AsyncSession) -> list[McpServer]:
    """Get all enabled MCP servers from DB."""
    result = await session.execute(
        select(McpServer).where(McpServer.enabled.is_(True))
    )
    return list(result.scalars().all())


async def list_tools_from_server(server: McpServer) -> list[McpToolDefinition]:
    """Connect to an MCP server and list its tools."""
    tools: list[McpToolDefinition] = []

    try:
        if server.transport == "stdio":
            tools = await _list_tools_stdio(server)
        elif server.transport == "sse":
            tools = await _list_tools_sse(server)
        else:
            logger.warning("Unknown transport %s for server %s", server.transport, server.name)
    except Exception as e:
        logger.error("Failed to list tools from %s: %s", server.name, e)

    return tools


async def execute_tool(
    server: McpServer, tool_name: str, arguments: dict[str, Any]
) -> str:
    """Execute a tool on an MCP server and return the result as text."""
    try:
        if server.transport == "stdio":
            return await _execute_tool_stdio(server, tool_name, arguments)
        elif server.transport == "sse":
            return await _execute_tool_sse(server, tool_name, arguments)
        else:
            return f"[Error] Unknown transport: {server.transport}"
    except Exception as e:
        logger.error("Tool execution failed (%s/%s): %s", server.name, tool_name, e)
        return f"[Error] {e}"


async def _list_tools_stdio(server: McpServer) -> list[McpToolDefinition]:
    """List tools from a stdio MCP server."""
    from mcp import ClientSession, StdioServerParameters
    from mcp.client.stdio import stdio_client

    params = StdioServerParameters(
        command=server.command or "",
        args=server.args or [],
        env=server.env,
    )

    async with stdio_client(params) as (read, write), ClientSession(read, write) as mcp_session:
        await mcp_session.initialize()
        result = await mcp_session.list_tools()

        return [
            McpToolDefinition(
                server_name=server.name,
                name=tool.name,
                description=tool.description or "",
                input_schema=tool.inputSchema if hasattr(tool, "inputSchema") else {},
            )
            for tool in result.tools
        ]


async def _list_tools_sse(server: McpServer) -> list[McpToolDefinition]:
    """List tools from an SSE MCP server."""
    from mcp import ClientSession
    from mcp.client.sse import sse_client

    async with (
        sse_client(server.url or "") as (read, write),
        ClientSession(read, write) as mcp_session,
    ):
        await mcp_session.initialize()
        result = await mcp_session.list_tools()

        return [
            McpToolDefinition(
                server_name=server.name,
                name=tool.name,
                description=tool.description or "",
                input_schema=tool.inputSchema if hasattr(tool, "inputSchema") else {},
            )
            for tool in result.tools
        ]


async def _execute_tool_stdio(
    server: McpServer, tool_name: str, arguments: dict[str, Any]
) -> str:
    """Execute a tool on a stdio MCP server."""
    from mcp import ClientSession, StdioServerParameters
    from mcp.client.stdio import stdio_client

    params = StdioServerParameters(
        command=server.command or "",
        args=server.args or [],
        env=server.env,
    )

    async with stdio_client(params) as (read, write), ClientSession(read, write) as mcp_session:
        await mcp_session.initialize()
        result = await mcp_session.call_tool(tool_name, arguments)

        # Extract text from result content
        texts = []
        for content in result.content:
            if hasattr(content, "text"):
                texts.append(content.text)
            else:
                texts.append(json.dumps(content.model_dump(), default=str))
        return "\n".join(texts) if texts else "[No output]"


async def _execute_tool_sse(
    server: McpServer, tool_name: str, arguments: dict[str, Any]
) -> str:
    """Execute a tool on an SSE MCP server."""
    from mcp import ClientSession
    from mcp.client.sse import sse_client

    async with (
        sse_client(server.url or "") as (read, write),
        ClientSession(read, write) as mcp_session,
    ):
        await mcp_session.initialize()
        result = await mcp_session.call_tool(tool_name, arguments)

        texts = []
        for content in result.content:
            if hasattr(content, "text"):
                texts.append(content.text)
            else:
                texts.append(json.dumps(content.model_dump(), default=str))
        return "\n".join(texts) if texts else "[No output]"


async def get_all_tools(session: AsyncSession) -> list[McpToolDefinition]:
    """Get all tools from all enabled MCP servers."""
    servers = await get_enabled_servers(session)
    all_tools: list[McpToolDefinition] = []
    for server in servers:
        tools = await list_tools_from_server(server)
        all_tools.extend(tools)
    return all_tools


def find_server_for_tool(
    servers: list[McpServer], qualified_tool_name: str
) -> tuple[McpServer, str] | None:
    """Find which server owns a tool by its qualified name."""
    # Format: mcp__servername__toolname
    parts = qualified_tool_name.split("__", 2)
    if len(parts) != 3 or parts[0] != "mcp":
        return None

    server_name = parts[1]
    tool_name = parts[2]

    for server in servers:
        if server.name == server_name:
            return server, tool_name
    return None
