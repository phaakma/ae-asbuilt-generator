import {
  ConfigStoreKind,
  DataStoreKind,
  OsFamily,
  StorageBackendKind,
  type ArcGISServerInstall,
  type ArcGISServerSite,
  type DataStoreGroup,
  type DataStoreInstall,
  type DeploymentBuildResult,
  type DeploymentModel,
  type DiskVolume,
  type InformationGap,
  type Machine,
  type NormalizedDeployment,
  type ObjectStoreConfig,
  type PortalComponent,
  type ServerConfigStore,
  type WebAdaptor
} from "@/domain/deployment-model";
import type { ParsedArcGisReport } from "@/parsers/arcgis-report-parser";

type AnyObject = Record<string, unknown>;

const GB_TO_BYTES = 1024 * 1024 * 1024;
const MB_TO_BYTES = 1024 * 1024;

function asObject(value: unknown): AnyObject {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as AnyObject) : {};
}

function asList(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asString(value: unknown): string {
  return value == null ? "" : String(value);
}

function nonEmpty(value: unknown): string | undefined {
  const v = asString(value).trim();
  return v ? v : undefined;
}

function normalizeToken(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "unknown";
}

function shortHostname(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "unknown-machine";
  const idx = trimmed.indexOf(".");
  return (idx >= 0 ? trimmed.slice(0, idx) : trimmed) || trimmed;
}

function inferOsFamily(osVersion?: string): OsFamily {
  if (!osVersion) return OsFamily.Unknown;
  const lower = osVersion.toLowerCase();
  if (lower.includes("windows")) return OsFamily.Windows;
  if (lower.includes("linux") || lower.includes("ubuntu") || lower.includes("rhel") || lower.includes("centos")) {
    return OsFamily.Linux;
  }
  return OsFamily.Unknown;
}

function toInteger(value: unknown): number | undefined {
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : undefined;
}

function toIsoUtc(value: unknown): string {
  const raw = nonEmpty(value);
  if (!raw) return new Date().toISOString();
  const asNumber = Number(raw);
  if (Number.isFinite(asNumber) && asNumber > 0) {
    const d = new Date(asNumber);
    return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
  }
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
}

function pathTail(urlLike: string, fallback: string): string {
  try {
    const u = new URL(urlLike);
    const tail = u.pathname.split("/").filter(Boolean).at(-1);
    return normalizeToken(tail || fallback);
  } catch {
    return normalizeToken(fallback);
  }
}

function inferDataStoreKind(input: string): DataStoreKind | undefined {
  const v = input.toLowerCase();
  if (v.includes("relational") || v.includes("postgres")) return DataStoreKind.Relational;
  if (v.includes("object") || v.includes("blob")) return DataStoreKind.Object;
  if (v.includes("tile")) return DataStoreKind.TileCache;
  if (v.includes("spatiotemporal") || v.includes("bigdata")) return DataStoreKind.Spatiotemporal;
  if (v.includes("graph") || v.includes("knowledge")) return DataStoreKind.Graph;
  return undefined;
}

function dedupePreserveOrder(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    if (!value || seen.has(value)) continue;
    seen.add(value);
    out.push(value);
  }
  return out;
}

function makeWebAdaptorId(scope: string, url: string, context: string, sourceId?: string): string {
  const source = nonEmpty(sourceId);
  if (source) return `wa:${normalizeToken(source)}`;
  return `wa:${normalizeToken(`${scope}|${url}|${context}`)}`;
}

function machineIdFromName(name: string): string {
  return `machine:${normalizeToken(name)}`;
}

function makeUnknownMachineId(scope: string): string {
  return `machine:unknown-${normalizeToken(scope)}`;
}

function makeServerInstallId(siteId: string, machineId: string): string {
  return `srvinst:${normalizeToken(siteId)}:${normalizeToken(machineId)}`;
}

function makeDataStoreGroupId(scope: string, store: string): string {
  return `dsg:${normalizeToken(scope)}:${normalizeToken(store)}`;
}

function makeDataStoreInstallId(groupId: string, machineId: string): string {
  return `dsi:${normalizeToken(groupId)}:${normalizeToken(machineId)}`;
}

function chooseDiskRecord(current: DiskVolume | undefined, candidate: DiskVolume): DiskVolume {
  if (!current) return candidate;
  if (candidate.total_bytes > current.total_bytes) return candidate;
  if (candidate.total_bytes === current.total_bytes && candidate.free_bytes > current.free_bytes) return candidate;
  return current;
}

function applyHardware(machine: Machine, hardwareValue: unknown, warnings: string[]): void {
  const hardware = asObject(hardwareValue);
  const os = nonEmpty(hardware.os);
  if (os && !machine.os_version) {
    machine.os_version = os;
    machine.os_family = inferOsFamily(os);
  }

  const cpu = nonEmpty(hardware.cpu);
  if (cpu && !machine.cpu_model) {
    machine.cpu_model = cpu.split(/\r?\n/)[0]?.trim() || cpu;
  }

  const physical = toInteger(hardware.numPhysicalProcessors);
  if (physical !== undefined && physical >= 0) machine.cpu_physical_cores = physical;
  const logical = toInteger(hardware.numLogicalProcessors);
  if (logical !== undefined && logical >= 0) machine.cpu_logical_cores = logical;

  const memoryMb = Number(hardware.systemMemoryMB);
  if (Number.isFinite(memoryMb) && memoryMb >= 0 && machine.memory_bytes == null) {
    machine.memory_bytes = Math.round(memoryMb * MB_TO_BYTES);
  }

  const diskByDesignation = new Map(machine.disks.map((d) => [d.designation.toLowerCase(), d]));
  for (const rawDisk of asList(hardware.localDiskUsage)) {
    const disk = asObject(rawDisk);
    const totalGb = Number(disk.diskTotalSpaceGB);
    const freeGb = Number(disk.diskUsableSpaceGB);
    if (!Number.isFinite(totalGb) || !Number.isFinite(freeGb) || totalGb < 0 || freeGb < 0) {
      warnings.push(`Skipping malformed disk entry on machine ${machine.machine_id}`);
      continue;
    }

    const designation = nonEmpty(disk.mount) || nonEmpty(disk.directory) || nonEmpty(disk.path) || "unknown";
    const totalBytes = Math.round(totalGb * GB_TO_BYTES);
    const freeBytes = Math.min(totalBytes, Math.round(freeGb * GB_TO_BYTES));
    const candidate: DiskVolume = {
      designation,
      total_bytes: totalBytes,
      free_bytes: freeBytes,
      filesystem: nonEmpty(disk.filesystem)
    };

    const key = designation.toLowerCase();
    diskByDesignation.set(key, chooseDiskRecord(diskByDesignation.get(key), candidate));
  }

  machine.disks = Array.from(diskByDesignation.values());
}

function getMachineName(record: unknown): string | undefined {
  if (typeof record === "string") return nonEmpty(record);
  const obj = asObject(record);
  return nonEmpty(obj.machineName) || nonEmpty(obj.name) || nonEmpty(obj.hostname) || nonEmpty(obj.fqdn);
}

function buildValidation(model: DeploymentModel): string[] {
  const messages: string[] = [];

  const machineIds = new Set<string>();
  for (const machine of model.machines) {
    if (!machine.machine_id) messages.push("Machine is missing machine_id");
    if (machine.machine_id && machineIds.has(machine.machine_id)) messages.push(`Duplicate machine_id: ${machine.machine_id}`);
    machineIds.add(machine.machine_id);
  }

  const serverInstallIds = new Set<string>();
  for (const install of model.server_installs) {
    if (!install.install_id) messages.push("Server install is missing install_id");
    if (install.install_id && serverInstallIds.has(install.install_id)) {
      messages.push(`Duplicate server install id: ${install.install_id}`);
    }
    serverInstallIds.add(install.install_id);
    if (!machineIds.has(install.machine_id)) {
      messages.push(`Server install ${install.install_id} references unknown machine ${install.machine_id}`);
    }
  }

  const dataStoreInstallIds = new Set<string>();
  for (const install of model.data_store_installs) {
    if (!install.install_id) messages.push("Data store install is missing install_id");
    if (install.install_id && dataStoreInstallIds.has(install.install_id)) {
      messages.push(`Duplicate data store install id: ${install.install_id}`);
    }
    dataStoreInstallIds.add(install.install_id);
    if (!machineIds.has(install.machine_id)) {
      messages.push(`Data store install ${install.install_id} references unknown machine ${install.machine_id}`);
    }
  }

  if (model.portal) {
    for (const machineId of model.portal.machine_ids) {
      if (!machineIds.has(machineId)) messages.push(`Portal references unknown machine ${machineId}`);
    }

    if (model.portal.primary_machine_id && !machineIds.has(model.portal.primary_machine_id)) {
      messages.push(`Portal primary machine ${model.portal.primary_machine_id} is unknown`);
    }
    if (model.portal.failover_machine_id && !machineIds.has(model.portal.failover_machine_id)) {
      messages.push(`Portal failover machine ${model.portal.failover_machine_id} is unknown`);
    }
    if (model.portal.is_high_availability && (!model.portal.primary_machine_id || !model.portal.failover_machine_id)) {
      messages.push("Portal HA is true but primary/failover machines are incomplete");
    }
  }

  for (const site of model.server_sites) {
    for (const installId of site.install_ids) {
      if (!serverInstallIds.has(installId)) {
        messages.push(`Server site ${site.site_id} references unknown install ${installId}`);
      }
    }
    if (site.install_ids.length > 1 && !site.config_store) {
      messages.push(`Server site ${site.site_id} has multiple installs but no config store`);
    }
  }

  for (const group of model.data_store_groups) {
    for (const installId of group.install_ids) {
      if (!dataStoreInstallIds.has(installId)) {
        messages.push(`Data store group ${group.group_id} references unknown install ${installId}`);
      }
    }
    if (group.primary_install_id && !dataStoreInstallIds.has(group.primary_install_id)) {
      messages.push(`Data store group ${group.group_id} has unknown primary install ${group.primary_install_id}`);
    }
    if (group.failover_install_id && !dataStoreInstallIds.has(group.failover_install_id)) {
      messages.push(`Data store group ${group.group_id} has unknown failover install ${group.failover_install_id}`);
    }
    if (group.kind === DataStoreKind.Spatiotemporal) {
      const nodes = group.spatiotemporal_cluster?.node_count;
      if (nodes !== undefined && nodes !== 1 && nodes !== 3) {
        messages.push(`Spatiotemporal node count for ${group.group_id} is atypical: ${nodes}`);
      }
    }
    if (group.kind === DataStoreKind.Object && !group.object_store) {
      messages.push(`Object data store group ${group.group_id} is missing object_store configuration`);
    }
  }

  return messages;
}

function dedupeById<T extends Record<string, unknown>>(
  items: T[],
  idField: keyof T,
  warnings: string[],
  label: string
): T[] {
  const out: T[] = [];
  const seen = new Set<string>();
  for (const item of items) {
    const id = nonEmpty(item[idField]);
    if (!id) {
      warnings.push(`Dropping ${label} with missing ${String(idField)}`);
      continue;
    }
    if (seen.has(id)) {
      warnings.push(`Duplicate ${label} id ignored: ${id}`);
      continue;
    }
    seen.add(id);
    out.push(item);
  }
  return out;
}

function computeInformationGaps(model: DeploymentModel, raw: AnyObject): InformationGap[] {
  const gaps: InformationGap[] = [];

  for (const machine of model.machines) {
    if (machine.memory_bytes == null) {
      gaps.push({
        field_path: `machines.${machine.machine_id}.memory_bytes`,
        message: `Missing machine memory for ${machine.hostname}`,
        suggested_endpoint_categories: ["portal.machines.hardware", "server.admin.machine_hardware"]
      });
    }
    if (!machine.disks.length) {
      gaps.push({
        field_path: `machines.${machine.machine_id}.disks`,
        message: `Missing machine disk inventory for ${machine.hostname}`,
        suggested_endpoint_categories: ["portal.machines.hardware", "server.admin.machine_hardware"]
      });
    }
    if (!machine.cpu_model || machine.cpu_physical_cores == null || machine.cpu_logical_cores == null) {
      gaps.push({
        field_path: `machines.${machine.machine_id}.cpu`,
        message: `Missing machine CPU details for ${machine.hostname}`,
        suggested_endpoint_categories: ["portal.machines.hardware", "server.admin.machine_hardware"]
      });
    }
    if (!machine.os_version) {
      gaps.push({
        field_path: `machines.${machine.machine_id}.os_version`,
        message: `Missing detailed OS version for ${machine.hostname}`,
        suggested_endpoint_categories: ["portal.machines.hardware", "server.admin.machine_hardware"]
      });
    }
  }

  const totalServerWebAdaptors = model.server_sites.reduce((sum, site) => sum + site.web_adaptors.length, 0);
  if (totalServerWebAdaptors === 0) {
    gaps.push({
      field_path: "server_sites[*].web_adaptors",
      message: "Missing server web adaptor mappings",
      suggested_endpoint_categories: ["server.admin.system.webadaptors"]
    });
  }

  if (model.data_store_groups.length === 0) {
    gaps.push({
      field_path: "data_store_groups",
      message: "Missing or unreachable datastore admin endpoints",
      suggested_endpoint_categories: ["server.data_store_admin", "refresh.dataStores"]
    });
  }

  const portal = asObject(raw.portal);
  if (!nonEmpty(asObject(portal.org_self).helperServices)) {
    gaps.push({
      field_path: "portal.helper_services",
      message: "Missing portal helper services",
      suggested_endpoint_categories: ["portal.org_self.helperServices"]
    });
  }

  return gaps;
}

export function normalizeReport(input: ParsedArcGisReport): DeploymentBuildResult {
  const raw = asObject(input);
  const warnings: string[] = [];

  const machineById = new Map<string, Machine>();
  const aliasToMachineId = new Map<string, string>();

  function getOrCreateMachine(nameOrAlias: string, scope: string): Machine {
    const sourceName = nonEmpty(nameOrAlias) || makeUnknownMachineId(scope);
    const machineId = machineIdFromName(sourceName);
    const existing = machineById.get(machineId);
    if (existing) return existing;

    const hostname = shortHostname(sourceName);
    const fqdn = sourceName.includes(".") ? sourceName : undefined;
    const machine: Machine = {
      machine_id: machineId,
      hostname,
      fqdn,
      os_family: OsFamily.Unknown,
      ip_addresses: [],
      disks: [],
      metadata: {}
    };

    machineById.set(machineId, machine);
    aliasToMachineId.set(sourceName.toUpperCase(), machineId);
    aliasToMachineId.set(hostname.toUpperCase(), machineId);
    if (fqdn) aliasToMachineId.set(fqdn.toUpperCase(), machineId);
    return machine;
  }

  function resolveMachineId(machineRef: unknown, scope: string): string {
    const name = getMachineName(machineRef);
    if (!name) return getOrCreateMachine(makeUnknownMachineId(scope), scope).machine_id;
    const alias = aliasToMachineId.get(name.toUpperCase());
    if (alias) return alias;
    return getOrCreateMachine(name, scope).machine_id;
  }

  function objectStoreForRefresh(storeName: string): ObjectStoreConfig {
    return {
      backend_kind: StorageBackendKind.LocalFilesystem,
      location: storeName,
      provider: "portal_about_refresh"
    };
  }

  const meta = asObject(raw.meta);
  const refreshCandidates = [
    raw.siteMap,
    asObject(raw.portal).about_refresh,
    asObject(asObject(raw.portal).about_refresh).siteMap,
    asObject(raw.refresh).siteMap,
    raw.refresh
  ];
  const refresh = asObject(refreshCandidates.find((v) => Object.keys(asObject(v)).length > 0));

  const portalBlock = asObject(raw.portal);
  const refreshPortal = asObject(refresh.portal);

  const portalAdminRoot = asObject(portalBlock.admin_root);
  const portalOrgSelf = asObject(portalBlock.org_self);

  const portalId =
    nonEmpty(portalAdminRoot.siteKey) ||
    nonEmpty(portalOrgSelf.id) ||
    nonEmpty(refreshPortal.organizationUrl) ||
    "portal";

  const portalMachineRaw =
    asList(refreshPortal.machines).length > 0
      ? asList(refreshPortal.machines)
      : asList(asObject(portalBlock.machines).machines).length > 0
        ? asList(asObject(portalBlock.machines).machines)
        : asList(portalBlock.machines);

  const portalMachineIds = portalMachineRaw.map((m) => resolveMachineId(m, "portal"));

  for (const machineRaw of portalMachineRaw) {
    const machineObj = asObject(machineRaw);
    const machine = getOrCreateMachine(getMachineName(machineRaw) || makeUnknownMachineId("portal"), "portal");
    applyHardware(machine, machineObj.hardware, warnings);
  }

  const portalWebAdaptors: WebAdaptor[] = [];
  const portalWebAdaptorsRaw = asList(asObject(asObject(portalBlock.system).webadaptors).webAdaptors);
  for (const item of portalWebAdaptorsRaw) {
    const wa = asObject(item);
    const url = nonEmpty(wa.url) || nonEmpty(wa.publicUrl);
    if (!url) {
      warnings.push("Skipped portal web adaptor without URL");
      continue;
    }
    const context = nonEmpty(wa.context) || pathTail(url, "portal");
    const machineId = nonEmpty(wa.machineName) ? resolveMachineId(wa.machineName, "portal-webadaptor") : undefined;
    const webAdaptor: WebAdaptor = {
      web_adaptor_id: makeWebAdaptorId(`portal:${portalId}`, url, context, nonEmpty(wa.id)),
      name: nonEmpty(wa.name) || `Portal ${context}`,
      url,
      context,
      target_component_id: portalId,
      machine_id: machineId,
      is_https: /^https:/i.test(url)
    };
    portalWebAdaptors.push(webAdaptor);
  }

  const portal: PortalComponent = {
    portal_id: portalId,
    machine_ids: dedupePreserveOrder(portalMachineIds),
    primary_machine_id: portalMachineIds[0],
    failover_machine_id: portalMachineIds[1],
    is_high_availability: dedupePreserveOrder(portalMachineIds).length > 1,
    web_adaptors: portalWebAdaptors,
    version:
      nonEmpty(refreshPortal.currentVersion) ||
      nonEmpty(portalAdminRoot.currentVersion) ||
      nonEmpty(portalAdminRoot.version) ||
      nonEmpty(portalOrgSelf.currentVersion) ||
      nonEmpty(portalOrgSelf.enterpriseVersion),
    admin_url: nonEmpty(portalAdminRoot.url) || nonEmpty(meta.portal_admin_url),
    org_url: nonEmpty(refreshPortal.organizationUrl) || nonEmpty(meta.portal_base_url)
  };

  const serverInstalls: ArcGISServerInstall[] = [];
  const serverSites: ArcGISServerSite[] = [];

  const refreshServerSites = asList(refresh.serverSites);
  const refreshServerById = new Map<string, AnyObject>();
  for (const entry of refreshServerSites) {
    const obj = asObject(entry);
    const serverId = nonEmpty(obj.serverId);
    if (serverId) refreshServerById.set(serverId, obj);
  }

  const federatedServers = asList(raw.federated_servers);
  const syntheticServerEntries = federatedServers.length
    ? federatedServers.map((entry) => asObject(entry))
    : refreshServerSites.map((entry) => {
        const site = asObject(entry);
        return {
          id: site.serverId,
          siteUrl: site.siteUrl,
          portal_record: {
            id: site.serverId,
            serverRole: site.serverRole,
            serverFunction: site.serverFunction,
            serverType: site.serverType
          },
          admin: {
            machines: site.machines,
            machine_hardware: site.machines
          }
        } as AnyObject;
      });

  for (const serverEntry of syntheticServerEntries) {
    const portalRecord = asObject(serverEntry.portal_record);
    const entryId = nonEmpty(serverEntry.id) || nonEmpty(serverEntry.serverId);
    const siteId = entryId || nonEmpty(portalRecord.id) || nonEmpty(portalRecord.name);
    if (!siteId) {
      warnings.push("Skipped server entry with missing site_id");
      continue;
    }

    const refreshSite = refreshServerById.get(siteId) || {};
    const admin = asObject(serverEntry.admin);

    const refreshMachines = asList(asObject(refreshSite).machines);
    const adminMachines = asList(admin.machines);
    const machineRefs = [...refreshMachines, ...adminMachines];
    const siteMachineIds = dedupePreserveOrder(machineRefs.map((m) => resolveMachineId(m, `server:${siteId}`)));

    for (const machineRaw of machineRefs) {
      const machineObj = asObject(machineRaw);
      const machineName = getMachineName(machineRaw) || makeUnknownMachineId(`server:${siteId}`);
      const machine = getOrCreateMachine(machineName, `server:${siteId}`);
      applyHardware(machine, machineObj.hardware, warnings);
    }

    const directoriesMap: Record<string, string> = {};
    const directories = asList(asObject(asObject(admin.system).directories).directories);
    for (const rawDir of directories) {
      const dir = asObject(rawDir);
      const key = (nonEmpty(dir.name) || "").toLowerCase();
      const path = nonEmpty(dir.physicalPath) || nonEmpty(dir.path);
      if (key && path) directoriesMap[key] = path;
    }

    const configStorePath = directoriesMap.arcgissystem || directoriesMap.system;
    let configStore: ServerConfigStore | undefined;
    if (configStorePath) {
      const shared = /^\\\\/.test(configStorePath) || /^[a-zA-Z]+:\/\//.test(configStorePath);
      configStore = {
        kind: shared ? ConfigStoreKind.NetworkShare : ConfigStoreKind.LocalPath,
        location: configStorePath,
        is_shared: shared
      };
    }

    const installIds: string[] = [];
    for (const machineId of siteMachineIds) {
      const installId = makeServerInstallId(siteId, machineId);
      installIds.push(installId);
      serverInstalls.push({
        install_id: installId,
        machine_id: machineId,
        version: nonEmpty(asObject(refreshSite).currentVersion) || nonEmpty(asObject(asObject(admin.root)).currentVersion),
        admin_url: nonEmpty(asObject(admin.root).url),
        services_url: nonEmpty(serverEntry.siteUrl) || nonEmpty(asObject(refreshSite).siteUrl),
        directories: directoriesMap
      });
    }

    const roleTags = dedupePreserveOrder(
      [
        nonEmpty(portalRecord.serverRole),
        nonEmpty(portalRecord.serverFunction),
        nonEmpty(portalRecord.serverType),
        nonEmpty(asObject(refreshSite).serverRole),
        nonEmpty(asObject(refreshSite).serverFunction),
        nonEmpty(asObject(refreshSite).serverType)
      ].filter((x): x is string => Boolean(x))
    );

    const serverWebAdaptors: WebAdaptor[] = [];
    const webAdaptorsRaw = asList(asObject(asObject(admin.system).webadaptors).webAdaptors);
    for (const rawWa of webAdaptorsRaw) {
      const wa = asObject(rawWa);
      const url = nonEmpty(wa.url) || nonEmpty(wa.webAdaptorURL);
      if (!url) {
        warnings.push(`Skipped malformed server web adaptor on site ${siteId}`);
        continue;
      }
      const context = nonEmpty(wa.context) || pathTail(url, "server");
      serverWebAdaptors.push({
        web_adaptor_id: makeWebAdaptorId(`server:${siteId}`, url, context, nonEmpty(wa.id)),
        name: nonEmpty(wa.name) || `${siteId} ${context}`,
        url,
        context,
        target_component_id: siteId,
        machine_id: nonEmpty(wa.machineName) ? resolveMachineId(wa.machineName, `server-wa:${siteId}`) : undefined,
        is_https: /^https:/i.test(url)
      });
    }

    const site: ArcGISServerSite = {
      site_id: siteId,
      admin_root: nonEmpty(asObject(admin.root).url) || "",
      install_ids: installIds,
      services_url: nonEmpty(serverEntry.siteUrl) || nonEmpty(asObject(refreshSite).siteUrl),
      role_tags: roleTags,
      config_store: configStore,
      web_adaptors: serverWebAdaptors
    };
    serverSites.push(site);
  }

  const dataStoreInstalls: DataStoreInstall[] = [];
  const dataStoreGroups: DataStoreGroup[] = [];

  const refreshDataStores = asList(refresh.dataStores);
  if (refreshDataStores.length > 0) {
    for (const rawStore of refreshDataStores) {
      const store = asObject(rawStore);
      const storeName = nonEmpty(store.store) || nonEmpty(asObject(store.store).type) || "unknown";
      const kind = inferDataStoreKind(storeName);
      if (!kind) {
        warnings.push(`Skipped refresh data store with unrecognized kind: ${storeName}`);
        continue;
      }

      const groupId = makeDataStoreGroupId("refresh", storeName);
      const machineRefs = asList(store.machines);
      const machineIds = machineRefs.length
        ? machineRefs.map((m) => resolveMachineId(m, `datastore:${storeName}`))
        : [resolveMachineId(undefined, `datastore:${storeName}`)];

      for (const machineRaw of machineRefs) {
        const machineObj = asObject(machineRaw);
        const machineName = getMachineName(machineRaw) || makeUnknownMachineId(`datastore:${storeName}`);
        const machine = getOrCreateMachine(machineName, `datastore:${storeName}`);
        applyHardware(machine, machineObj.hardware, warnings);
      }

      const installIds: string[] = [];
      for (const machineId of dedupePreserveOrder(machineIds)) {
        const installId = makeDataStoreInstallId(groupId, machineId);
        installIds.push(installId);
        dataStoreInstalls.push({
          install_id: installId,
          kind,
          machine_id: machineId,
          version: nonEmpty(store.currentVersion),
          metadata: {}
        });
      }

      const group: DataStoreGroup = {
        group_id: groupId,
        kind,
        install_ids: installIds,
        is_high_availability: installIds.length > 1,
        primary_install_id: installIds[0],
        failover_install_id: installIds[1],
        object_store: kind === DataStoreKind.Object ? objectStoreForRefresh(storeName) : undefined,
        spatiotemporal_cluster:
          kind === DataStoreKind.Spatiotemporal
            ? {
                node_count: installIds.length
              }
            : undefined,
        storage_backends: ["portal_about_refresh"],
        metadata: {}
      };
      dataStoreGroups.push(group);
    }
  } else {
    warnings.push("No refresh dataStores block found; server-admin data mode not available in this payload");
  }

  const inventory = asList(raw.machine_hardware_inventory);
  for (const rawEntry of inventory) {
    const entry = asObject(rawEntry);
    const machineName = getMachineName(entry);
    if (!machineName) continue;
    const machine = getOrCreateMachine(machineName, "inventory");
    applyHardware(machine, entry, warnings);
  }

  const machines = Array.from(machineById.values()).sort((a, b) => a.machine_id.localeCompare(b.machine_id));

  const dedupedServerInstalls = dedupeById(serverInstalls, "install_id", warnings, "server install");
  const dedupedServerSites = dedupeById(serverSites, "site_id", warnings, "server site");
  const dedupedDataStoreInstalls = dedupeById(dataStoreInstalls, "install_id", warnings, "data store install");
  const dedupedDataStoreGroups = dedupeById(dataStoreGroups, "group_id", warnings, "data store group");

  const discoveryNotes = Number(meta.api_error_count);
  const model: DeploymentModel = {
    title:
      nonEmpty(refreshPortal.orgName) ||
      nonEmpty(portalOrgSelf.name) ||
      (portal.org_url ? `ArcGIS Enterprise (${shortHostname(portal.org_url)})` : "ArcGIS Enterprise Deployment"),
    deployment_id: nonEmpty(portalAdminRoot.siteKey) || nonEmpty(portalOrgSelf.id),
    portal_org_url: nonEmpty(meta.portal_base_url),
    machines,
    portal,
    server_installs: dedupedServerInstalls,
    server_sites: dedupedServerSites,
    data_store_installs: dedupedDataStoreInstalls,
    data_store_groups: dedupedDataStoreGroups,
    discovery: {
      discovered_at_utc: toIsoUtc(meta.collected_at_utc || asObject(refreshPortal).lastUpdated),
      source_system: "ArcGIS Enterprise discovery report",
      source_endpoint: nonEmpty(meta.portal_base_url) || nonEmpty(meta.portal_admin_url),
      notes: Number.isFinite(discoveryNotes) ? `API error count: ${discoveryNotes}` : undefined
    }
  };

  warnings.push(...buildValidation(model));
  const informationGaps = computeInformationGaps(model, raw);

  return {
    model,
    warnings,
    information_gaps: informationGaps
  };
}

export function toNormalizedDeployment(input: ParsedArcGisReport): NormalizedDeployment {
  return normalizeReport(input).model;
}
