import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { AppAuthenticationProvider } from './aps.js';
import { createMcpServer } from './mcp.js';

const { APS_CLIENT_ID, APS_CLIENT_SECRET, APS_SERVICE_ACCOUNT_ID, APS_KEY_ID } = process.env;
if (!APS_CLIENT_ID || !APS_CLIENT_SECRET || !APS_SERVICE_ACCOUNT_ID || !APS_KEY_ID) {
    console.error('APS_CLIENT_ID, APS_CLIENT_SECRET, APS_SERVICE_ACCOUNT_ID, and APS_KEY_ID environment variables are required.');
    process.exit(1);
}
console.log('APS_CLIENT_ID:', APS_CLIENT_ID);

const authenticationProvider = new AppAuthenticationProvider(APS_CLIENT_ID, APS_CLIENT_SECRET, APS_SERVICE_ACCOUNT_ID, APS_KEY_ID, './service-account-key.pem');
const server = createMcpServer(authenticationProvider);
const transport = new StdioServerTransport();
await server.connect(transport);
