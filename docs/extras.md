# Extras

## Vibe-Code Additional Features

Use GitHub Copilot to add a new feature to your MCP server. Some ideas:

- **Search project by name**: update the hub/project listing tool so that it accepts an optional project name to search for
- **List issues**: add a tool that lists issues in a project using the [Forma Issues API](https://aps.autodesk.com/en/docs/acc/v1/overview/field-guide/issues/)
- **Search by name**: add a tool that searches for files by name across all folders in a project
- **Recent changes skill**: extend the `forma-weekly-update` skill to send the summary as a formatted email draft

### Suggested approach

1. Describe the feature to Copilot in plain language.
2. Let Copilot suggest the implementation.
3. Review the code, ask follow-up questions, iterate.
4. Test with GitHub Copilot Chat (and restart the MCP server after edits so the new tool is registered).

This is intentionally open-ended — the goal is to get comfortable using AI to extend the server you've built.

### Example prompts

Vibe coding works best when the prompt names the file you want changed, the shape of the new tool, and the API to call. A few patterns that work well with the beginner project:

- **Search project by name** (extend an existing tool):

  > In `mcp.js`, add an optional `nameFilter` string parameter to the `list-projects` tool. When provided, only return projects whose `attributes.name` contains the filter (case-insensitive). Keep the existing behaviour when it's omitted, and update the tool description so Copilot Chat knows when to pass the filter.

- **List issues** (new tool against a new API):

  > Add a new MCP tool `list-issues` in `mcp.js`. It takes a `projectId` (string) and returns open issues from the ACC Issues API: `GET https://developer.api.autodesk.com/construction/issues/v1/projects/{projectId}/issues?filter[status]=open`. Reuse the existing authentication provider in `aps.js`. Return an array of `{ id, title, status, assignedTo }`. Add a short JSDoc-style description so Copilot Chat can discover it.

- **Search files by name** (recursive folder walk):

  > Add a `find-items` tool in `mcp.js` that takes `hubId`, `projectId`, and `query` (string). Walk the project's top folders with the Data Management API and return items whose `displayName` contains `query` (case-insensitive). Cap the recursion depth at 5 and the total results at 50 so the tool stays responsive.

- **Recent changes skill** (extend the skill, not the server):

  > Update `.github/skills/forma-weekly-update/SKILL.md` so the final step produces a Markdown email draft with a subject line, a one-paragraph summary, and a bulleted list of changes grouped by folder. Keep the existing data-collection steps unchanged.

#### Tips for getting good results

- Point Copilot at the exact file (`mcp.js`, `aps.js`, the prompt file) instead of asking for "the server".
- Include the APS endpoint URL and the fields you care about — Copilot can't guess the schema.
- After it generates code, ask follow-ups like *"what happens if the token expires mid-request?"* or *"add input validation for projectId"* to harden it.
- If a generated tool doesn't show up in Copilot Chat, reload the MCP server and check the tool name matches the schema.

## Production checklist

You've built a working MCP server. Here's what you'd need to address before shipping it as a real product.

| Area | Workshop state | Production requirement |
|---|---|---|
| Transport | STDIO (local process only) | Switch to Streamable HTTP (covered in the advanced session) |
| Credentials | Codespace secrets | Proper secret manager (e.g. Azure Key Vault, AWS Secrets Manager) |
| Token caching | In-memory, process lifetime | Persistent cache; handle expiry and refresh across restarts |
| APS app provisioning | Single Forma project | Provision the app to every project it needs; consider automation |
| Error handling | Minimal | Structured error responses, logging, and alerting |
| MCP client access | Anyone with the binary | Restrict to authorised users; consider authentication at the client layer |

> **Next step:** Join the advanced session to add Streamable HTTP transport, user authentication, and an embedded design viewer.
