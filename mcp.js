import { McpServer } from '@modelcontextprotocol/server';
import { z } from 'zod';
import { getProjects, getProjectAssets } from './fptr.js';

export function createMcpServer(authenticationProvider) {
    const server = new McpServer({
        name: 'fptr-mcp-server',
        title: 'Flow PTR MCP Server',
        version: '1.0.0'
    });

    server.registerTool(
        'list-projects',
        {
            title: 'List projects',
            description: 'Lists all projects available to the Flow PTR Script.',
            annotations: { readOnlyHint: true }
        },
        async () => {
            const projects = await getProjects(authenticationProvider);
            return { content: [{ type: 'text', text: JSON.stringify(projects, null, 2) }] };
        }
    );

    server.registerTool(
        'list-project-assets',
        {
            title: 'List project assets',
            description: 'Lists the assets in a Flow PTR project.',
            inputSchema: z.object({
                projectId: z.string().describe('Project ID.'),
            }),
            annotations: { readOnlyHint: true }
        },
        async ({ projectId }) => {
            const assets = await getProjectAssets(authenticationProvider, projectId);
            return { content: [{ type: 'text', text: JSON.stringify(assets, null, 2) }] };
        }
    );

    return server;
}
