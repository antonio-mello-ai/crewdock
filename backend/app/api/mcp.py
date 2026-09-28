from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.core.security import verify_token
from app.models.mcp_server import McpServer
from app.services.mcp_client import get_all_tools, list_tools_from_server

router = APIRouter(prefix="/mcp", tags=["mcp"], dependencies=[Depends(verify_token)])


class McpServerCreate(BaseModel):
    name: str
    transport: str  # "stdio" or "sse"
    command: str | None = None
    args: list[str] | None = None
    url: str | None = None
    env: dict[str, str] | None = None
    description: str | None = None
    enabled: bool = True


class McpServerResponse(BaseModel):
    id: str
    name: str
    transport: str
    command: str | None
    args: list[str] | None
    url: str | None
    description: str | None
    enabled: bool


class McpToolResponse(BaseModel):
    server: str
    name: str
    qualified_name: str
    description: str


@router.get("/servers", response_model=list[McpServerResponse])
async def list_servers(
    session: AsyncSession = Depends(get_session),
) -> list[McpServerResponse]:
    result = await session.execute(select(McpServer))
    servers = result.scalars().all()
    return [
        McpServerResponse(
            id=str(s.id),
            name=s.name,
            transport=s.transport,
            command=s.command,
            args=s.args,
            url=s.url,
            description=s.description,
            enabled=s.enabled,
        )
        for s in servers
    ]


@router.post("/servers", response_model=McpServerResponse, status_code=201)
async def create_server(
    data: McpServerCreate,
    session: AsyncSession = Depends(get_session),
) -> McpServerResponse:
    server = McpServer(
        name=data.name,
        transport=data.transport,
        command=data.command,
        args=data.args,
        url=data.url,
        env=data.env,
        description=data.description,
        enabled=data.enabled,
    )
    session.add(server)
    await session.commit()
    await session.refresh(server)
    return McpServerResponse(
        id=str(server.id),
        name=server.name,
        transport=server.transport,
        command=server.command,
        args=server.args,
        url=server.url,
        description=server.description,
        enabled=server.enabled,
    )


@router.delete("/servers/{server_id}", status_code=204)
async def delete_server(
    server_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
) -> None:
    server = await session.get(McpServer, server_id)
    if server is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    await session.delete(server)
    await session.commit()


@router.get("/servers/{server_id}/tools", response_model=list[McpToolResponse])
async def list_server_tools(
    server_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
) -> list[McpToolResponse]:
    """List tools from a specific MCP server (connects in real-time)."""
    server = await session.get(McpServer, server_id)
    if server is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)

    tools = await list_tools_from_server(server)
    return [
        McpToolResponse(
            server=t.server_name,
            name=t.name,
            qualified_name=t.qualified_name,
            description=t.description,
        )
        for t in tools
    ]


@router.get("/tools", response_model=list[McpToolResponse])
async def list_all_tools(
    session: AsyncSession = Depends(get_session),
) -> list[McpToolResponse]:
    """List all tools from all enabled MCP servers."""
    tools = await get_all_tools(session)
    return [
        McpToolResponse(
            server=t.server_name,
            name=t.name,
            qualified_name=t.qualified_name,
            description=t.description,
        )
        for t in tools
    ]
