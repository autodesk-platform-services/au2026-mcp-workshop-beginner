import { SecureServiceAccountClient, Utils, Scopes } from '@aps_sdk/secure-service-account';
import { DataManagementClient } from '@aps_sdk/data-management';
import { readFileSync } from 'fs';

const SCOPES = [Scopes.DataRead];

export class AppAuthenticationProvider {
    constructor(clientId, clientSecret, serviceAccountId, keyId, privateKeyPath) {
        this.ssaClient = new SecureServiceAccountClient();
        this.clientId = clientId;
        this.clientSecret = clientSecret;
        this.serviceAccountId = serviceAccountId;
        this.keyId = keyId;
        this.privateKey = readFileSync(privateKeyPath, 'utf8');
        this.cache = {
            accessToken: null,
            expiresAt: 0,
        };
    }

    async getAccessToken() {
        if (this.cache.expiresAt < Date.now()) {
            const jwtAssertion = Utils.generateJwtAssertion(this.clientId, this.serviceAccountId, this.privateKey, this.keyId, SCOPES);
            const credentials = await this.ssaClient.exchangeJwtAssertion(jwtAssertion, this.clientId, this.clientSecret, { scope: SCOPES });
            this.cache.accessToken = credentials.access_token;
            this.cache.expiresAt = Date.now() + credentials.expires_in * 1000;
        }
        return this.cache.accessToken;
    }
}

export async function getHubsProjects(authenticationProvider) {
    const client = new DataManagementClient({ authenticationProvider });
    const { data: hubs = [] } = await client.getHubs();
    return Promise.all(hubs.map(async hub => {
        const { data: projects = [] } = await client.getHubProjects(hub.id);
        return {
            id: hub.id,
            name: hub.attributes.name,
            region: hub.attributes.region,
            projects: projects.map(p => ({ id: p.id, name: p.attributes.name }))
        };
    }));
}

export async function getFolderContents(hubId, projectId, folderId, authenticationProvider) {
    const client = new DataManagementClient({ authenticationProvider });
    const { data: items = [] } = folderId
        ? await client.getFolderContents(projectId, folderId)
        : await client.getProjectTopFolders(hubId, projectId);
    return items.map(item => ({
        type: item.type,
        id: item.id,
        name: item.attributes.displayName,
        modifiedAt: item.attributes.lastModifiedTime,
        modifiedBy: item.attributes.lastModifiedUserName
    }));
}
