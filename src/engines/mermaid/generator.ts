import type { DiagramArtifact } from "@/domain/diagram";
import { DataStoreKind, type DeploymentModel, type Machine } from "@/domain/deployment-model";

function nodeId(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "n";
}

function label(value: string): string {
  return value.replace(/[\[\]"']/g, "").trim();
}

function machineLabel(machine: Machine): string {
  return label(machine.fqdn || machine.hostname || machine.machine_id);
}

function dataStoreLabel(kind: DataStoreKind): string {
  switch (kind) {
    case DataStoreKind.Object:
      return "Object Store";
    case DataStoreKind.Relational:
      return "Relational Store";
    case DataStoreKind.TileCache:
      return "Tile Cache Store";
    case DataStoreKind.Spatiotemporal:
      return "Spatiotemporal Store";
    case DataStoreKind.Graph:
      return "Graph Store";
    default:
      return "Data Store";
  }
}

function mermaidTheme(themeId: string): string {
  return themeId === "neutral" ? "neutral" : "default";
}

function buildContainerDiagram(deployment: DeploymentModel, themeId: string): string {
  const lines: string[] = [];
  lines.push(`%%{init: {'theme': '${mermaidTheme(themeId)}'}}%%`);
  lines.push(`flowchart LR`);
  lines.push(`  user([GIS User])`);

  const siteNodeById = new Map<string, string>();
  const dataStoreNodeById = new Map<string, string>();
  const webAdaptorNodeById = new Map<string, string>();

  lines.push(`  subgraph WEB_TIER[Web Tier]`);
  for (const adaptor of deployment.portal?.web_adaptors || []) {
    const id = nodeId(`wa_${adaptor.web_adaptor_id}`);
    webAdaptorNodeById.set(adaptor.web_adaptor_id, id);
    lines.push(`    ${id}[${label(`${adaptor.name} /${adaptor.context}`)}]`);
  }
  for (const site of deployment.server_sites) {
    for (const adaptor of site.web_adaptors) {
      const id = nodeId(`wa_${adaptor.web_adaptor_id}`);
      webAdaptorNodeById.set(adaptor.web_adaptor_id, id);
      lines.push(`    ${id}[${label(`${adaptor.name} /${adaptor.context}`)}]`);
    }
  }
  lines.push(`  end`);

  lines.push(`  subgraph APP_TIER[App Tier]`);
  if (deployment.portal) {
    lines.push(`    portal[Portal for ArcGIS]`);
  }
  for (const site of deployment.server_sites) {
    const id = nodeId(`site_${site.site_id}`);
    siteNodeById.set(site.site_id, id);
    lines.push(`    ${id}[${label(`ArcGIS Server ${site.site_id}`)}]`);
  }
  lines.push(`  end`);

  lines.push(`  subgraph DATA_TIER[Data Tier]`);
  for (const group of deployment.data_store_groups) {
    const id = nodeId(`dsg_${group.group_id}`);
    dataStoreNodeById.set(group.group_id, id);
    lines.push(`    ${id}[${label(dataStoreLabel(group.kind))}]`);
  }
  lines.push(`  end`);

  if (deployment.portal) {
    lines.push(`  user --> portal`);
    for (const adaptor of deployment.portal.web_adaptors) {
      const waId = webAdaptorNodeById.get(adaptor.web_adaptor_id);
      if (!waId) continue;
      lines.push(`  user --> ${waId}`);
      lines.push(`  ${waId} --> portal`);
    }
  }

  for (const site of deployment.server_sites) {
    const siteId = siteNodeById.get(site.site_id);
    if (!siteId) continue;
    lines.push(`  portal --> ${siteId}`);
    for (const adaptor of site.web_adaptors) {
      const waId = webAdaptorNodeById.get(adaptor.web_adaptor_id);
      if (!waId) continue;
      lines.push(`  user --> ${waId}`);
      lines.push(`  ${waId} --> ${siteId}`);
    }
  }

  for (const group of deployment.data_store_groups) {
    const dsgId = dataStoreNodeById.get(group.group_id);
    if (!dsgId) continue;
    for (const site of deployment.server_sites) {
      const isHosting = site.role_tags.some((role) => role.toUpperCase().includes("HOSTING"));
      if (!isHosting) continue;
      const siteId = siteNodeById.get(site.site_id);
      if (siteId) lines.push(`  ${siteId} --> ${dsgId}`);
    }
  }

  return lines.join("\n");
}

function buildDeploymentDiagram(deployment: DeploymentModel, themeId: string): string {
  const lines: string[] = [];
  lines.push(`%%{init: {'theme': '${mermaidTheme(themeId)}'}}%%`);
  lines.push(`flowchart LR`);
  lines.push(`  user([GIS User])`);

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

  const portalInstanceByMachineId = new Map<string, string>();
  const siteInstancesBySiteId = new Map<string, string[]>();
  const dataStoreInstancesByGroupId = new Map<string, string[]>();
  const webAdaptorInstancesById = new Map<string, string[]>();

  const pushMapValue = (map: Map<string, string[]>, key: string, value: string) => {
    const current = map.get(key);
    if (current) current.push(value);
    else map.set(key, [value]);
  };

  for (const machineId of orderedMachineIds) {
    const machine = machineById.get(machineId);
    const machineNodeId = nodeId(`machine_${machineId}`);
    const machineNodeLabel = label(machine ? machineLabel(machine) : machineId);
    const instanceLines: string[] = [];
    const seenInstanceIds = new Set<string>();

    const addInstance = (instanceId: string, instanceLabel: string, shape: "box" | "round" = "box") => {
      if (seenInstanceIds.has(instanceId)) return;
      seenInstanceIds.add(instanceId);
      if (shape === "round") {
        instanceLines.push(`    ${instanceId}(${instanceLabel})`);
        return;
      }
      instanceLines.push(`    ${instanceId}[${instanceLabel}]`);
    };

    for (const wa of deployment.portal?.web_adaptors || []) {
      if (wa.machine_id !== machineId) continue;
      const instanceId = nodeId(`wa_${wa.web_adaptor_id}_${machineId}`);
      addInstance(instanceId, label(`${wa.name} /${wa.context}`));
      pushMapValue(webAdaptorInstancesById, wa.web_adaptor_id, instanceId);
    }
    for (const site of deployment.server_sites) {
      for (const wa of site.web_adaptors) {
        if (wa.machine_id !== machineId) continue;
        const instanceId = nodeId(`wa_${wa.web_adaptor_id}_${machineId}`);
        addInstance(instanceId, label(`${wa.name} /${wa.context}`));
        pushMapValue(webAdaptorInstancesById, wa.web_adaptor_id, instanceId);
      }
    }

    if (deployment.portal?.machine_ids.includes(machineId)) {
      const instanceId = nodeId(`portal_${machineId}`);
      addInstance(instanceId, "Portal for ArcGIS", "round");
      portalInstanceByMachineId.set(machineId, instanceId);
    }

    for (const install of deployment.server_installs) {
      if (install.machine_id !== machineId) continue;
      const site = deployment.server_sites.find((s) => s.install_ids.includes(install.install_id));
      if (!site) continue;
      const instanceId = nodeId(`site_${site.site_id}_${machineId}`);
      addInstance(instanceId, label(`ArcGIS Server ${site.site_id}`));
      pushMapValue(siteInstancesBySiteId, site.site_id, instanceId);
    }

    for (const install of deployment.data_store_installs) {
      if (install.machine_id !== machineId) continue;
      const group = deployment.data_store_groups.find((g) => g.install_ids.includes(install.install_id));
      if (!group) continue;
      const instanceId = nodeId(`dsg_${group.group_id}_${machineId}`);
      addInstance(instanceId, label(dataStoreLabel(group.kind)));
      pushMapValue(dataStoreInstancesByGroupId, group.group_id, instanceId);
    }

    if (instanceLines.length === 0) continue;

    lines.push(`  subgraph ${machineNodeId}[${machineNodeLabel}]`);
    lines.push(...instanceLines);
    lines.push(`  end`);
  }

  const pushLink = (sourceId: string | undefined, targetId: string | undefined) => {
    if (!sourceId || !targetId) return;
    lines.push(`  ${sourceId} --> ${targetId}`);
  };

  if (deployment.portal) {
    for (const machineId of deployment.portal.machine_ids) {
      const portalId = portalInstanceByMachineId.get(machineId);
      pushLink("user", portalId);
    }
    for (const adaptor of deployment.portal.web_adaptors) {
      const waInstances = webAdaptorInstancesById.get(adaptor.web_adaptor_id) || [];
      for (const waId of waInstances) {
        pushLink("user", waId);
        if (adaptor.target_component_id === deployment.portal.portal_id) {
          const portalId = portalInstanceByMachineId.get(deployment.portal.primary_machine_id || deployment.portal.machine_ids[0]);
          pushLink(waId, portalId);
          continue;
        }
        const siteTargets = siteInstancesBySiteId.get(adaptor.target_component_id) || [];
        for (const targetId of siteTargets) pushLink(waId, targetId);
      }
    }
  }

  for (const site of deployment.server_sites) {
    const siteInstances = siteInstancesBySiteId.get(site.site_id) || [];

    for (const portalId of portalInstanceByMachineId.values()) {
      for (const siteId of siteInstances) pushLink(portalId, siteId);
    }

    for (const adaptor of site.web_adaptors) {
      const waInstances = webAdaptorInstancesById.get(adaptor.web_adaptor_id) || [];
      for (const waId of waInstances) {
        pushLink("user", waId);
        for (const siteId of siteInstances) pushLink(waId, siteId);
      }
    }

    const isHosting = site.role_tags.some((role) => role.toUpperCase().includes("HOSTING"));
    if (!isHosting) continue;

    for (const group of deployment.data_store_groups) {
      const dsgInstances = dataStoreInstancesByGroupId.get(group.group_id) || [];
      for (const siteId of siteInstances) {
        for (const dsgId of dsgInstances) pushLink(siteId, dsgId);
      }
    }
  }

  return lines.join("\n");
}

function buildPreviewMarkdown(containerContent: string, deploymentContent: string): string {
  return [
    "# Mermaid Diagram Preview",
    "",
    "## Container View",
    "```mermaid",
    containerContent,
    "```",
    "",
    "## Deployment View",
    "```mermaid",
    deploymentContent,
    "```",
    ""
  ].join("\n");
}

export function generateMermaid(input: unknown, themeId: string): DiagramArtifact {
  const deployment = input as DeploymentModel;
  const containerView = buildContainerDiagram(deployment, themeId);
  const deploymentView = buildDeploymentDiagram(deployment, themeId);
  const previewMd = buildPreviewMarkdown(containerView, deploymentView);

  return {
    engineId: "mermaid",
    fileExtension: ".mmd",
    mimeType: "text/plain",
    content: containerView,
    defaultView: "container",
    viewContents: {
      container: containerView,
      deployment: deploymentView
    },
    files: [
      { name: "diagram-container.mmd", mimeType: "text/plain", content: containerView },
      { name: "diagram-deployment.mmd", mimeType: "text/plain", content: deploymentView },
      { name: "diagram-preview.md", mimeType: "text/markdown", content: previewMd }
    ]
  };
}
