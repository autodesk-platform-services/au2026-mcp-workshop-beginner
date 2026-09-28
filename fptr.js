export class ScriptAuthenticationProvider {
    constructor(siteUrl, scriptName, scriptKey) {
        this.siteUrl = siteUrl;
        this.scriptName = scriptName;
        this.scriptKey = scriptKey;
        this.cache = {
            accessToken: null,
            expiresAt: 0,
        };
    }

    async getAccessToken() {
        if (this.cache.expiresAt < Date.now() + 60 * 1000) { // refresh a minute early to absorb clock skew and request latency
            const response = await fetch(`${this.siteUrl}/api/v1.1/auth/access_token`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    client_id: this.scriptName,
                    client_secret: this.scriptKey,
                    grant_type: 'client_credentials',
                }),
            });
            if (!response.ok) {
                throw new Error(`Flow PTR authentication failed: ${response.status} ${response.statusText}`);
            }
            const credentials = await response.json();
            this.cache.accessToken = credentials.access_token;
            this.cache.expiresAt = Date.now() + credentials.expires_in * 1000;
        }
        return this.cache.accessToken;
    }
}

export async function getProjects(authenticationProvider) {
    const token = await authenticationProvider.getAccessToken();
    const response = await fetch(`${authenticationProvider.siteUrl}/api/v1.1/entity/projects?fields=name`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    });
    const { data: projects = [] } = await response.json();
    return projects.map(p => ({ id: p.id, name: p.attributes.name }));
}

export async function getProjectAssets(authenticationProvider, projectId) {
    const token = await authenticationProvider.getAccessToken();
    // TODO: only the first page of results is returned; projects with more than 500 assets need pagination via links.next
    const response = await fetch(`${authenticationProvider.siteUrl}/api/v1.1/entity/assets?filter[project]=${projectId}&fields=code,sg_asset_type`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    });
    const { data: assets = [] } = await response.json();
    return assets.map(a => ({ id: a.id, name: a.attributes.code, type: a.attributes.sg_asset_type }));
}
