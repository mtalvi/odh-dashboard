import type { SecretKind, PersistentVolumeClaimKind } from '@odh-dashboard/internal/k8sTypes';
import { getSecret, updatePvc } from '@odh-dashboard/internal/api';
// eslint-disable-next-line @odh-dashboard/no-restricted-imports
import {
  createNIMSecret,
  createNIMPVC,
} from '@odh-dashboard/internal/pages/modelServing/screens/projects/utils';

export const NIM_SECRET_NAME = 'nvidia-nim-secrets';
export const NIM_NGC_SECRET_NAME = 'ngc-secret';

/**
 * Check if a secret exists in the namespace
 * Returns true if the secret needs to be created (doesn't exist)
 */
export const isSecretNeeded = async (namespace: string, secretName: string): Promise<boolean> => {
  try {
    await getSecret(namespace, secretName);
    return false; // Secret exists, no need to create
  } catch {
    return true; // Secret does not exist, needs to be created
  }
};

/**
 * Create the NVIDIA NIM API key secret
 */
export const createNIMAPISecret = async (
  namespace: string,
  opts?: { dryRun?: boolean },
): Promise<SecretKind> => {
  return createNIMSecret(namespace, 'apiKeySecret', false, opts?.dryRun ?? false);
};

/**
 * Create the NGC pull secret for pulling NIM container images
 */
export const createNGCPullSecret = async (
  namespace: string,
  opts?: { dryRun?: boolean },
): Promise<SecretKind> => {
  return createNIMSecret(namespace, 'nimPullSecret', true, opts?.dryRun ?? false);
};

/**
 * Handle NIM PVC creation or update
 * - For new deployments: creates a new PVC
 * - For existing deployments: updates the PVC size if changed
 */
export const handleNIMPVC = async (
  namespace: string,
  pvcName: string,
  pvcSize: string,
  storageClassName: string,
  existingPVC?: PersistentVolumeClaimKind,
  opts?: { dryRun?: boolean },
): Promise<PersistentVolumeClaimKind | undefined> => {
  // If no existing PVC, create a new one
  if (!existingPVC) {
    return createNIMPVC(namespace, pvcName, pvcSize, opts?.dryRun ?? false, storageClassName);
  }

  // If existing PVC has different size, update it
  if (existingPVC.spec.resources.requests.storage !== pvcSize) {
    const updatePvcData = {
      size: pvcSize,
      name: existingPVC.metadata.name,
      description: existingPVC.metadata.annotations?.description || '',
      storageClassName: existingPVC.spec.storageClassName,
    };

    return updatePvc(
      updatePvcData,
      existingPVC,
      namespace,
      { dryRun: opts?.dryRun ?? false },
      false,
      {
        'runtimes.opendatahub.io/force-redeploy': new Date().toISOString(),
      },
    );
  }

  // No changes needed
  return undefined;
};
