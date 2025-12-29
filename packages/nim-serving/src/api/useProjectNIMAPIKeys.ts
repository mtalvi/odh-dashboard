import { useWatchSecrets } from '@odh-dashboard/internal/api/k8s/secrets';
import type { SecretKind } from '@odh-dashboard/internal/k8sTypes';
import { NIM_API_KEY_SECRET_NAME } from './secrets';

/**
 * Hook to fetch existing NIM API keys from the project
 * Returns secrets labeled with 'opendatahub.io/nim-api-key': 'true'
 * or the standard nvidia-nim-secrets secret
 */
export const useProjectNIMAPIKeys = (projectName?: string): SecretKind[] => {
  const [secrets, loaded, error] = useWatchSecrets(projectName);

  if (!loaded || error) {
    return [];
  }

  // Filter for NIM API key secrets
  const nimSecrets = secrets.filter(
    (secret) =>
      secret.metadata.labels?.['opendatahub.io/nim-api-key'] === 'true' ||
      secret.metadata.name === NIM_API_KEY_SECRET_NAME,
  );

  return nimSecrets;
};
