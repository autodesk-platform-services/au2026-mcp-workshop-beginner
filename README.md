# APS MCP Server

An [MCP (Model Context Protocol)](https://modelcontextprotocol.io) server that exposes Autodesk Forma project data via the [APS Data Management API](https://aps.autodesk.com/en/docs/data/v2/reference/http/). Built for the AU2026 beginner workshop.

## What it does

The server connects GitHub Copilot (or any MCP-compatible client) to your APS hubs and projects, letting an AI assistant browse folder structures and generate activity summaries without leaving the chat.

### MCP tools

| Tool | Inputs | Description |
| --- | --- | --- |
| `list-hubs-projects` | — | Lists all hubs and their projects accessible to the APS application |
| `list-folder-contents` | `hub_id`, `project_id`, `folder_id?` | Lists folder contents; omit `folder_id` to get top-level folders |

### Agent skill

`.github/skills/forma-weekly-update/SKILL.md` defines a GitHub Copilot agent skill (`forma-weekly-update`) that uses the two tools above to produce a weekly summary of file changes in a given project.

## Prerequisites

- Python 3.10+
- An APS application with `data:read` scope ([create one here](https://aps.autodesk.com/myapps))
- Admin access to an Autodesk Forma hub

## Setup

```bash
pip install -r requirements.txt
```

## VS Code integration

`.vscode/mcp.json` registers the server as **APS MCP Server** using the STDIO transport. To use the server from Copilot, you must provide `APS_CLIENT_ID` and `APS_CLIENT_SECRET` to that MCP process, typically by specifying them in a `.env` file and pointing the MCP server to it with the `envFile` field in `.vscode/mcp.json`. Once those variables are available, open the repo in VS Code (or a GitHub Codespace) and the server will be available to Copilot.

## Architecture

```text
main.py            Entry point — wires credentials → auth provider → MCP server → STDIO transport
server.py          MCP server factory — registers tools, never calls mcp.run()
aps.py             APS layer — 2-legged OAuth provider + Data Management helpers
```

`AppAuthenticationProvider` (in `aps.py`) caches tokens in memory and exposes a single `get_access_token()` method. The Data Management helpers call it internally — raw tokens never leave the class. The advanced workshop session swaps in a 3-legged provider without changing any other file.

## Tutorial

Step-by-step instructions for building this server from scratch are in the `docs/` folder. Serve them locally with:

```bash
npx serve docs
```

Then open `http://localhost:3000`.
