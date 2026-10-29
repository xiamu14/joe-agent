"""Independent MCP adapter. Agent Reach is installed separately, never in backend."""
import asyncio
import json
import os
import re
from mcp.server.fastmcp import FastMCP

mcp = FastMCP("external-data", host=os.getenv("DATA_MCP_HOST", "127.0.0.1"),
              port=int(os.getenv("DATA_MCP_PORT", "4120")))
slots = asyncio.Semaphore(2)


async def reach(action: str, target: str, *args: str) -> dict:
    if action != "search" and not re.fullmatch(r"[A-Za-z0-9_-]{11}", target):
        raise ValueError("Invalid video id")
    async with slots:
        proc = await asyncio.create_subprocess_exec(
            os.getenv("AGENT_REACH_BIN", "agent-reach"), "youtube", action,
            target, *args, "--timeout", "45",
            stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.DEVNULL)
        try:
            stdout, _ = await asyncio.wait_for(proc.communicate(), timeout=50)
            result = json.loads(stdout)
            if not result.get("ok"):
                error = result.get("error") or {}
                raise ValueError(f"{error.get('code')}: {error.get('message')}")
            return result
        finally:
            if proc.returncode is None:
                proc.kill()
                await proc.wait()


@mcp.tool()
async def youtube_search(query: str, limit: int = 10) -> dict:
    """Search YouTube videos. Metadata may be missing; do not invent it."""
    if not query.strip() or len(query) > 200 or not 1 <= limit <= 20:
        raise ValueError("Invalid query or limit")
    return await reach("search", query, "--limit", str(limit))


@mcp.tool()
async def youtube_get_video(video_id: str) -> dict:
    """Read video metadata."""
    return await reach("read", video_id)


@mcp.tool()
async def youtube_get_subtitles(video_id: str) -> dict:
    """Read available video subtitles as text."""
    return await reach("subtitle", video_id)


if __name__ == "__main__":
    mcp.run(transport="streamable-http")
