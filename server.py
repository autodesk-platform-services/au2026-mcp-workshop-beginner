import json
from typing import Annotated

from mcp.server.fastmcp import FastMCP
from pydantic import Field

from aps import get_hubs_projects, get_folder_contents


def create_mcp_server(authentication_provider):
    mcp = FastMCP(name='aps-mcp-server', instructions='MCP server for Autodesk Platform Services')

    @mcp.tool(
        name='list-hubs-projects',
        description='Lists all hubs and their projects available to the APS application.',
        structured_output=False,
    )
    def list_hubs_projects() -> str:
        hubs = get_hubs_projects(authentication_provider)
        return json.dumps(hubs, indent=2)

    @mcp.tool(
        name='list-folder-contents',
        description='Lists the contents of a folder in a project, or top-level folders if no folder ID is provided.',
        structured_output=False,
    )
    def list_folder_contents(
        hub_id: Annotated[str, Field(description='Hub ID.')],
        project_id: Annotated[str, Field(description='Project ID.')],
        folder_id: Annotated[str | None, Field(description='Folder ID. Omit to list top-level folders.')] = None,
    ) -> str:
        items = get_folder_contents(hub_id, project_id, folder_id, authentication_provider)
        return json.dumps(items, indent=2)

    return mcp
