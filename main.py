import os
import sys

from aps import AppAuthenticationProvider
from server import create_mcp_server

APS_CLIENT_ID = os.environ.get('APS_CLIENT_ID')
APS_CLIENT_SECRET = os.environ.get('APS_CLIENT_SECRET')
if not APS_CLIENT_ID or not APS_CLIENT_SECRET:
    print('APS_CLIENT_ID and APS_CLIENT_SECRET environment variables are required.', file=sys.stderr)
    sys.exit(1)

authentication_provider = AppAuthenticationProvider(APS_CLIENT_ID, APS_CLIENT_SECRET)
mcp_server = create_mcp_server(authentication_provider)
mcp_server.run(transport='stdio')
