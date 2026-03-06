export type RuntimeConfig = {
  krokiEndpoint: string;
  diagramOptions: Record<string, { active: boolean }>;
};

const fallback: RuntimeConfig = {
  krokiEndpoint: "https://kroki.io",
  diagramOptions: {
    structurizr: { active: true },
    mermaid: { active: true }
  }
};

export async function loadRuntimeConfig(): Promise<RuntimeConfig> {
  try {
    const response = await fetch(`${import.meta.env.BASE_URL}config.json`);
    if (!response.ok) {
      return fallback;
    }
    return (await response.json()) as RuntimeConfig;
  } catch {
    return fallback;
  }
}
