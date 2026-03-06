const deploymentNameRegex = /^[A-Za-z0-9\- ]+$/;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateDeploymentName(value: string): string | null {
  if (!value.trim()) {
    return "Deployment Name is required.";
  }
  if (value.length > 100) {
    return "Deployment Name must be 100 characters or fewer.";
  }
  if (!deploymentNameRegex.test(value)) {
    return "Deployment Name may only contain letters, numbers, spaces, and hyphens.";
  }
  return null;
}

export function validateEmail(value: string): string | null {
  if (!value) {
    return null;
  }
  if (!emailRegex.test(value)) {
    return "Email format is invalid.";
  }
  return null;
}
