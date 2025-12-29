import type { SecretKind, K8sAPIOptions } from '@odh-dashboard/internal/k8sTypes';
import { createSecret as k8sCreateSecret } from '@odh-dashboard/internal/api';

const NIM_API_KEY_SECRET_NAME = 'nvidia-nim-secrets';
const NIM_PULL_SECRET_NAME = 'ngc-secret';

/**
 * Create the NVIDIA NIM API key secret in a project
 * This secret stores the user's NVIDIA API key for model downloads
 */
export const createNIMAPIKeySecret = async (
  projectName: string,
  apiKey: string,
  opts?: K8sAPIOptions,
): Promise<SecretKind> => {
  const secret: SecretKind = {
    apiVersion: 'v1',
    kind: 'Secret',
    metadata: {
      name: NIM_API_KEY_SECRET_NAME,
      namespace: projectName,
      labels: {
        'opendatahub.io/managed': 'true',
      },
    },
    type: 'Opaque',
    stringData: {
      NGC_API_KEY: apiKey,
    },
  };

  return k8sCreateSecret(secret, opts);
};

/**
 * Create the NGC pull secret for pulling NIM container images
 * This secret provides authentication for pulling images from NGC registry
 */
export const createNGCPullSecret = async (
  projectName: string,
  apiKey: string,
  opts?: K8sAPIOptions,
): Promise<SecretKind> => {
  // NGC pull secret uses dockerconfigjson format
  const dockerConfig = {
    auths: {
      'nvcr.io': {
        username: '$oauthtoken',
        password: apiKey,
        auth: Buffer.from(`$oauthtoken:${apiKey}`).toString('base64'),
      },
    },
  };

  const secret: SecretKind = {
    apiVersion: 'v1',
    kind: 'Secret',
    metadata: {
      name: NIM_PULL_SECRET_NAME,
      namespace: projectName,
      labels: {
        'opendatahub.io/managed': 'true',
      },
    },
    type: 'kubernetes.io/dockerconfigjson',
    stringData: {
      '.dockerconfigjson': JSON.stringify(dockerConfig),
    },
  };

  return k8sCreateSecret(secret, opts);
};

export { NIM_API_KEY_SECRET_NAME, NIM_PULL_SECRET_NAME };
