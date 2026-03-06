export function toDeploymentSlug(value: string, maxLength = 20): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\- ]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, maxLength);
}
