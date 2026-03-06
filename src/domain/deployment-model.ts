export enum OsFamily {
  Windows = "windows",
  Linux = "linux",
  Unknown = "unknown"
}

export enum DataStoreKind {
  Relational = "relational",
  Object = "object",
  TileCache = "tile_cache",
  Spatiotemporal = "spatiotemporal",
  Graph = "graph"
}

export enum StorageBackendKind {
  LocalFilesystem = "local_filesystem",
  NetworkShare = "network_share",
  CloudObjectStore = "cloud_object_store",
  BlobStorage = "blob_storage"
}

export enum ConfigStoreKind {
  LocalPath = "local_path",
  NetworkShare = "network_share",
  CloudObjectStore = "cloud_object_store"
}

export type DiskVolume = {
  designation: string;
  total_bytes: number;
  free_bytes: number;
  filesystem?: string;
};

export type Machine = {
  machine_id: string;
  hostname: string;
  fqdn?: string;
  os_family: OsFamily;
  os_version?: string;
  cpu_model?: string;
  cpu_physical_cores?: number;
  cpu_logical_cores?: number;
  memory_bytes?: number;
  ip_addresses: string[];
  disks: DiskVolume[];
  metadata: Record<string, unknown>;
};

export type WebAdaptor = {
  web_adaptor_id: string;
  name: string;
  url: string;
  context: string;
  target_component_id: string;
  machine_id?: string;
  is_https: boolean;
};

export type ArcGISServerInstall = {
  install_id: string;
  machine_id: string;
  version?: string;
  admin_url?: string;
  services_url?: string;
  directories: Record<string, string>;
};

export type ServerConfigStore = {
  kind: ConfigStoreKind;
  location: string;
  provider?: string;
  is_shared: boolean;
};

export type SpatiotemporalClusterConfig = {
  node_count: number;
  coordinator_count?: number;
};

export type ObjectStoreConfig = {
  backend_kind: StorageBackendKind;
  location: string;
  provider?: string;
  endpoint_url?: string;
};

export type DataStoreInstall = {
  install_id: string;
  kind: DataStoreKind;
  machine_id: string;
  version?: string;
  admin_url?: string;
  metadata: Record<string, unknown>;
};

export type PortalComponent = {
  portal_id: string;
  machine_ids: string[];
  primary_machine_id?: string;
  failover_machine_id?: string;
  is_high_availability: boolean;
  web_adaptors: WebAdaptor[];
  version?: string;
  admin_url?: string;
  org_url?: string;
};

export type ArcGISServerSite = {
  site_id: string;
  admin_root: string;
  install_ids: string[];
  services_url?: string;
  role_tags: string[];
  config_store?: ServerConfigStore;
  web_adaptors: WebAdaptor[];
};

export type DataStoreGroup = {
  group_id: string;
  kind: DataStoreKind;
  install_ids: string[];
  is_high_availability: boolean;
  primary_install_id?: string;
  failover_install_id?: string;
  object_store?: ObjectStoreConfig;
  spatiotemporal_cluster?: SpatiotemporalClusterConfig;
  storage_backends: string[];
  metadata: Record<string, unknown>;
};

export type DiscoveryMetadata = {
  discovered_at_utc: string;
  source_system?: string;
  source_endpoint?: string;
  notes?: string;
};

export type DeploymentModel = {
  title: string;
  deployment_id?: string;
  portal_org_url?: string;
  machines: Machine[];
  portal?: PortalComponent;
  server_installs: ArcGISServerInstall[];
  server_sites: ArcGISServerSite[];
  data_store_installs: DataStoreInstall[];
  data_store_groups: DataStoreGroup[];
  discovery?: DiscoveryMetadata;
};

export type InformationGap = {
  field_path: string;
  message: string;
  suggested_endpoint_categories: string[];
};

export type DeploymentBuildResult = {
  model: DeploymentModel;
  warnings: string[];
  information_gaps: InformationGap[];
};

// Keep existing app surfaces intact while generators migrate to DeploymentModel naming.
export type NormalizedDeployment = DeploymentModel;
