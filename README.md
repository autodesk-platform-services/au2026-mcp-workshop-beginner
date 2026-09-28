# Flow PTR MCP Server

An [MCP (Model Context Protocol)](https://modelcontextprotocol.io) server that exposes Flow Production Tracking project and asset data via its [REST API](https://developers.shotgridsoftware.com/rest-api/). Built for the beginner workshop.

## What it does

The server connects GitHub Copilot (or any MCP-compatible client) to your Flow PTR projects and their assets, letting an AI assistant browse them and generate activity summaries without leaving the chat.

### MCP tools

| Tool | Inputs | Description |
| --- | --- | --- |
| `list-projects` | — | Lists all projects accessible to the Flow PTR Script |
| `list-project-assets` | `projectId` | Lists the assets in a project |

### Agent skill

`.github/skills/fptr-weekly-update/SKILL.md` defines a GitHub Copilot agent skill (`fptr-weekly-update`) that uses the two tools above to produce a weekly summary of asset changes in a given project.

## Prerequisites

- Node.js 20+
- A Flow PTR Script with read-only access ([see the prerequisites](docs/0-prerequisites.md))
- The Script's permission group provisioned to at least one project

## Setup

```bash
npm install
```

## VS Code integration

`.vscode/mcp.json` registers the server as **Flow PTR MCP Server** using the STDIO transport. VS Code launches `node index.js` as a child process, so `FPTR_SITE_URL`, `FPTR_SCRIPT_NAME`, and `FPTR_SCRIPT_KEY` have to be present in that process's environment. In a GitHub Codespace they already are — the workshop stores them as Codespace secrets. Running locally, export them in your shell before launching VS Code, or add an `envFile` entry to `.vscode/mcp.json` pointing at a gitignored `.env`.

## Architecture

```text
index.js          Entry point — wires credentials → auth provider → MCP server → STDIO transport
mcp.js            MCP server factory — registers tools, never calls server.connect()
fptr.js           Flow PTR layer — Script authentication provider + REST API helpers
```

`ScriptAuthenticationProvider` (in `fptr.js`) caches tokens in memory and exposes a single `getAccessToken()` method. The data helpers call it internally — raw tokens never leave the class. The advanced workshop session swaps in a user-level provider without changing any other file.

## Tutorial

Step-by-step instructions for building this server from scratch are in the `docs/` folder. Serve them locally with:

```bash
npx serve docs
```

Then open `http://localhost:3000`.
