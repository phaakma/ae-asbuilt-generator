import { format } from "date-fns";
import { toDeploymentSlug } from "@/utils/slug";

export function buildZipFilename(deploymentName: string, engineShortId: string, at = new Date()): string {
  const deploymentSlug20 = toDeploymentSlug(deploymentName, 20);
  const localYYYYMMDDHHmm = format(at, "yyyyMMddHHmm");
  return `${deploymentSlug20}__${engineShortId}_${localYYYYMMDDHHmm}.zip`;
}
