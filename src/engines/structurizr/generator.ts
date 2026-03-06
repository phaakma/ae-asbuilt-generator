import type { DiagramArtifact } from "@/domain/diagram";
import { DataStoreKind, type DeploymentModel, type Machine, type WebAdaptor } from "@/domain/deployment-model";

function appendTheme(lines: string[], themeId: string): void {
  lines.push(`    theme default`);

  if (themeId !== "enterprise") {
    return;
  }

  lines.push(`    styles {`);
  lines.push(`      element "Person" {`);
  lines.push(`        background "#1E3A8A"`);
  lines.push(`        color "#FFFFFF"`);
  lines.push(`        shape Person`);
  lines.push(`      }`);
  lines.push(``);
  lines.push(`      element "Software System" {`);
  lines.push(`        background "#0B3C5D"`);
  lines.push(`        color "#FFFFFF"`);
  lines.push(`        shape RoundedBox`);
  lines.push(`      }`);
  lines.push(``);
  lines.push(`      element "Container" {`);
  lines.push(`        background "#1F6B75"`);
  lines.push(`        color "#FFFFFF"`);
  lines.push(`        stroke "#0A2F4A"`);
  lines.push(`        strokeWidth 2`);
  lines.push(`        shape RoundedBox`);
  lines.push(`      }`);
  lines.push(``);
  lines.push(`      element "Deployment Node" {`);
  lines.push(`        background "#E5EEF5"`);
  lines.push(`        color "#102A43"`);
  lines.push(`        stroke "#486581"`);
  lines.push(`        strokeWidth 2`);
  lines.push(`        shape RoundedBox`);
  lines.push(`      }`);
  lines.push(``);
  lines.push(`      relationship "Relationship" {`);
  lines.push(`        color "#102A43"`);
  lines.push(`        thickness 2`);
  lines.push(`      }`);
  lines.push(`    }`);
}

function replaceViewsBlock(dsl: string, mode: "container" | "deployment", themeId: string): string {
  const start = dsl.indexOf("\n  views {\n");
  if (start < 0) return dsl;

  const themeCommentIndex = dsl.indexOf("\n// theme=");
  const endBoundary = themeCommentIndex >= 0 ? themeCommentIndex : dsl.length;
  const body = dsl.slice(0, start);
  const trailer = dsl.slice(endBoundary);

  const lines: string[] = [];
  lines.push(`  views {`);
  if (mode === "container") {
    lines.push(`    container arcgis containerView {`);
    lines.push(`      include *`);
    lines.push(`      autolayout lr`);
    lines.push(`    }`);
  } else {
    lines.push(`    deployment arcgis production deploymentView {`);
    lines.push(`      include *`);
    lines.push(`      autolayout lr`);
    lines.push(`    }`);
  }
  lines.push(``);
  appendTheme(lines, themeId);
  lines.push(`  }`);
  lines.push(`}`);

  return `${body}\n${lines.join("\n")}${trailer}`;
}

function alias(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "node";
}

function cleanLabel(value: string): string {
  return value.replace(/"/g, "'").trim();
}

function uniqueName(base: string, used: Set<string>): string {
  let candidate = base;
  let n = 2;
  while (used.has(candidate.toLowerCase())) {
    candidate = `${base} ${n}`;
    n += 1;
  }
  used.add(candidate.toLowerCase());
  return candidate;
}

function kindLabel(kind: DataStoreKind): string {
  switch (kind) {
    case DataStoreKind.Object:
      return "Object";
    case DataStoreKind.Relational:
      return "Relational";
    case DataStoreKind.TileCache:
      return "Tile Cache";
    case DataStoreKind.Spatiotemporal:
      return "Spatiotemporal";
    case DataStoreKind.Graph:
      return "Graph";
    default:
      return "Data Store";
  }
}

function machineName(machine: Machine): string {
  return cleanLabel(machine.fqdn || machine.hostname || machine.machine_id);
}

function appendWebAdaptorContainers(
  lines: string[],
  usedContainerNames: Set<string>,
  webAdaptors: WebAdaptor[],
  targetAliasById: Map<string, string>,
  containerAliasByWebAdaptorId: Map<string, string>
): void {
  for (const adaptor of webAdaptors) {
    const name = uniqueName(`${adaptor.name} (${adaptor.context})`, usedContainerNames);
    const waAlias = alias(`wa_${adaptor.web_adaptor_id}`);
    lines.push(
      `      ${waAlias} = container "${cleanLabel(name)}" "IIS Application" "Routes /${cleanLabel(adaptor.context)} traffic"`
    );
    containerAliasByWebAdaptorId.set(adaptor.web_adaptor_id, waAlias);
    const target = targetAliasById.get(adaptor.target_component_id);
    if (target) {
      lines.push(`      ${waAlias} -> ${target} "Routes /${cleanLabel(adaptor.context)}"`);
    }
  }
}

export function generateStructurizr(input: unknown, themeId: string): DiagramArtifact {
  const deployment = input as DeploymentModel;

  const lines: string[] = [];
  const title = cleanLabel(deployment.title || "ArcGIS Enterprise");
  lines.push(`workspace "${title}" "AsBuilt" {`);
  lines.push(`  model {`);
  lines.push(`    user = person "GIS User" {`);
  lines.push(`      description "Uses web GIS applications"`);
  lines.push(`    }`);
  lines.push(``);
  lines.push(`    arcgis = softwareSystem "ArcGIS Enterprise" {`);

  const usedContainerNames = new Set<string>();
  const componentAliasById = new Map<string, string>();

  if (deployment.portal) {
    const portalAlias = alias(`portal_${deployment.portal.portal_id}`);
    componentAliasById.set(deployment.portal.portal_id, portalAlias);
    lines.push(`      ${portalAlias} = container "Portal for ArcGIS" "Portal" "Enterprise portal"`);
  }

  for (const site of deployment.server_sites) {
    const role = site.role_tags.join(", ");
    const name = uniqueName(`ArcGIS Server ${site.site_id}`, usedContainerNames);
    const siteAlias = alias(`site_${site.site_id}`);
    componentAliasById.set(site.site_id, siteAlias);
    lines.push(
      `      ${siteAlias} = container "${cleanLabel(name)}" "ArcGIS Server" "${cleanLabel(role || "Federated server site")}"`
    );
  }

  for (const group of deployment.data_store_groups) {
    const name = uniqueName(`${kindLabel(group.kind)} Data Store`, usedContainerNames);
    const groupAlias = alias(`dsg_${group.group_id}`);
    componentAliasById.set(group.group_id, groupAlias);
    lines.push(`      ${groupAlias} = container "${cleanLabel(name)}" "Data Store" "ArcGIS managed data"`);
  }

  const webAdaptorAliasById = new Map<string, string>();
  appendWebAdaptorContainers(
    lines,
    usedContainerNames,
    deployment.portal?.web_adaptors || [],
    componentAliasById,
    webAdaptorAliasById
  );
  for (const site of deployment.server_sites) {
    appendWebAdaptorContainers(lines, usedContainerNames, site.web_adaptors, componentAliasById, webAdaptorAliasById);
  }

  lines.push(`    }`);
  lines.push(``);

  if (deployment.portal) {
    const portalAlias = componentAliasById.get(deployment.portal.portal_id);
    if (portalAlias) {
      lines.push(`    user -> ${portalAlias} "Uses over HTTPS"`);
      for (const adaptor of deployment.portal.web_adaptors) {
        const waAlias = webAdaptorAliasById.get(adaptor.web_adaptor_id);
        if (waAlias) lines.push(`    user -> ${waAlias} "Uses /${cleanLabel(adaptor.context)}"`);
      }
      for (const site of deployment.server_sites) {
        const siteAlias = componentAliasById.get(site.site_id);
        if (siteAlias) lines.push(`    ${portalAlias} -> ${siteAlias} "Federates"`);
      }
    }
  }

  for (const group of deployment.data_store_groups) {
    const groupAlias = componentAliasById.get(group.group_id);
    if (!groupAlias) continue;
    for (const site of deployment.server_sites) {
      const isHosting = site.role_tags.some((role) => role.toUpperCase().includes("HOSTING"));
      if (!isHosting) continue;
      const siteAlias = componentAliasById.get(site.site_id);
      if (siteAlias) {
        lines.push(`    ${siteAlias} -> ${groupAlias} "Reads/Writes managed data"`);
      }
    }
  }

  lines.push(``);
  lines.push(`    production = deploymentEnvironment "Production" {`);

  const machineById = new Map(deployment.machines.map((m) => [m.machine_id, m]));
  const orderedMachineIds: string[] = [];
  const seenMachineIds = new Set<string>();

  const addMachineId = (machineId: string | undefined) => {
    if (!machineId || seenMachineIds.has(machineId)) return;
    seenMachineIds.add(machineId);
    orderedMachineIds.push(machineId);
  };

  for (const machine of deployment.machines) addMachineId(machine.machine_id);
  for (const machineId of deployment.portal?.machine_ids || []) addMachineId(machineId);
  for (const install of deployment.server_installs) addMachineId(install.machine_id);
  for (const install of deployment.data_store_installs) addMachineId(install.machine_id);
  for (const wa of deployment.portal?.web_adaptors || []) addMachineId(wa.machine_id);
  for (const site of deployment.server_sites) {
    for (const wa of site.web_adaptors) addMachineId(wa.machine_id);
  }

  for (const machineId of orderedMachineIds) {
    const machine = machineById.get(machineId);
    const nodeName = machine ? machineName(machine) : cleanLabel(machineId);
    const instanceAliases: string[] = [];
    const seenAliases = new Set<string>();

    const pushInstance = (instanceAlias: string | undefined) => {
      if (!instanceAlias || seenAliases.has(instanceAlias)) return;
      seenAliases.add(instanceAlias);
      instanceAliases.push(instanceAlias);
    };

    for (const wa of deployment.portal?.web_adaptors || []) {
      if (wa.machine_id !== machineId) continue;
      pushInstance(webAdaptorAliasById.get(wa.web_adaptor_id));
    }
    for (const site of deployment.server_sites) {
      for (const wa of site.web_adaptors) {
        if (wa.machine_id !== machineId) continue;
        pushInstance(webAdaptorAliasById.get(wa.web_adaptor_id));
      }
    }

    if (deployment.portal?.machine_ids.includes(machineId)) {
      pushInstance(componentAliasById.get(deployment.portal.portal_id));
    }

    for (const install of deployment.server_installs) {
      if (install.machine_id !== machineId) continue;
      const site = deployment.server_sites.find((s) => s.install_ids.includes(install.install_id));
      if (!site) continue;
      pushInstance(componentAliasById.get(site.site_id));
    }

    for (const install of deployment.data_store_installs) {
      if (install.machine_id !== machineId) continue;
      const group = deployment.data_store_groups.find((g) => g.install_ids.includes(install.install_id));
      if (!group) continue;
      pushInstance(componentAliasById.get(group.group_id));
    }

    lines.push(`      deploymentNode "${nodeName}" {`);
    for (const instanceAlias of instanceAliases) {
      lines.push(`        containerInstance ${instanceAlias}`);
    }
    lines.push(`      }`);
  }

  lines.push(`    }`);
  lines.push(`  }`);
  lines.push(``);
  lines.push(`  views {`);
  lines.push(`    systemContext arcgis systemContextView {`);
  lines.push(`      include *`);
  lines.push(`      autolayout lr`);
  lines.push(`    }`);
  lines.push(``);
  lines.push(`    container arcgis containerView {`);
  lines.push(`      include *`);
  lines.push(`      autolayout lr`);
  lines.push(`    }`);
  lines.push(``);
  lines.push(`    deployment arcgis production deploymentView {`);
  lines.push(`      include *`);
  lines.push(`      autolayout lr`);
  lines.push(`    }`);
  lines.push(``);
  appendTheme(lines, themeId);
  lines.push(`  }`);
  lines.push(`}`);
  lines.push(`// theme=${themeId}`);

  const fullDsl = lines.join("\n");

  return {
    engineId: "structurizr",
    fileExtension: ".dsl",
    mimeType: "text/plain",
    content: fullDsl,
    defaultView: "container",
    viewContents: {
      container: replaceViewsBlock(fullDsl, "container", themeId),
      deployment: replaceViewsBlock(fullDsl, "deployment", themeId)
    },
    files: [{ name: "diagram.dsl", mimeType: "text/plain", content: fullDsl }]
  };
}
