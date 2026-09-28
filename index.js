import { StdioServerTransport } from '@modelcontextprotocol/server/stdio';
import { ScriptAuthenticationProvider } from './fptr.js';
import { createMcpServer } from './mcp.js';

const { FPTR_SITE_URL, FPTR_SCRIPT_NAME, FPTR_SCRIPT_KEY } = process.env;
if (!FPTR_SITE_URL || !FPTR_SCRIPT_NAME || !FPTR_SCRIPT_KEY) {
    console.error('FPTR_SITE_URL, FPTR_SCRIPT_NAME, and FPTR_SCRIPT_KEY environment variables are required.');
    process.exit(1);
}

const authenticationProvider = new ScriptAuthenticationProvider(FPTR_SITE_URL, FPTR_SCRIPT_NAME, FPTR_SCRIPT_KEY);
const server = createMcpServer(authenticationProvider);
const transport = new StdioServerTransport();
await server.connect(transport);
