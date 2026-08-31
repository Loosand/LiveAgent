import type { CustomProvider, ProviderId } from "../../lib/settings";

export type ProviderWorkspaceGroups = {
  enabled: CustomProvider[];
  inactive: CustomProvider[];
  missingTypes: ProviderId[];
};

export function isProviderConnectionEnabled(provider: CustomProvider) {
  const configured =
    provider.baseUrl.trim().length > 0 &&
    (provider.apiKey.trim().length > 0 || provider.apiKeyConfigured === true);
  return configured && provider.activeModels.length > 0;
}

export function groupProviderWorkspace(
  providers: CustomProvider[],
  providerTypes: readonly ProviderId[],
): ProviderWorkspaceGroups {
  const enabled: CustomProvider[] = [];
  const inactive: CustomProvider[] = [];
  const configuredTypes = new Set<ProviderId>();

  for (const provider of providers) {
    configuredTypes.add(provider.type);
    if (isProviderConnectionEnabled(provider)) enabled.push(provider);
    else inactive.push(provider);
  }

  return {
    enabled,
    inactive,
    missingTypes: providerTypes.filter((type) => !configuredTypes.has(type)),
  };
}

export function providerMatchesQuery(
  provider: Pick<CustomProvider, "baseUrl" | "name" | "type">,
  query: string,
  vendorLabel: string,
) {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  if (!normalizedQuery) return true;
  return `${provider.name} ${provider.baseUrl} ${provider.type} ${vendorLabel}`
    .toLocaleLowerCase()
    .includes(normalizedQuery);
}
