---
name: fptr-weekly-update
description: Generates a summary of asset changes in a given Flow PTR project for the last 7 days, or for a specific date range if provided.
---

Generate a summary of recent asset changes in a Flow PTR project using the available MCP tools.

## Instructions

1. If the user has not specified a project, use `list-projects` to show available projects and ask which one to summarise.
2. Use `list-project-assets` to list the assets in the project.
3. Filter results to those modified within the requested time range:
   - Default: last 7 days from today
   - If the user provides a date range (e.g. "between May 1 and May 15"), use that range instead
4. Group results by assets. For each modified item, include:
   - Asset name
   - Asset type
   - Asset status
   - Who modified it
   - When it was modified
5. Present the output as a readable summary, for example:

```
## Weekly Update — [Project Name]
Period: [start date] to [end date]

- **[Asset Name]** ([Asset Type], [Asset Status]) — modified by [User] on [Date]
- ...
```

If no changes were found in the period, say so clearly.
