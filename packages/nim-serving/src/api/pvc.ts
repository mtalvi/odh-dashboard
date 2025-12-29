import type { PersistentVolumeClaimKind, K8sAPIOptions } from '@odh-dashboard/internal/k8sTypes';
import { createPvc as k8sCreatePvc } from '@odh-dashboard/internal/api';

/**
 * Create a PVC for NIM model storage
 * NIM uses PVCs to cache downloaded models for faster startup
 *
 * @param projectName - Kubernetes namespace/project name
 * @param pvcName - Name for the PVC
 * @param size - Storage size (e.g., "100Gi")
 * @param storageClassName - Storage class to use
 * @param opts - API options (e.g., dryRun)
 */
export const createNIMPVC = async (
  projectName: string,
  pvcName: string,
  size: string,
  storageClassName: string,
  opts?: K8sAPIOptions,
): Promise<PersistentVolumeClaimKind> => {
  return k8sCreatePvc(
    {
      name: pvcName,
      description: 'Storage for NIM model cache',
      size,
      storageClassName,
    },
    projectName,
    opts,
    false, // createForNotebook: false (not a notebook PVC)
    undefined, // existingPvc: undefined (creating new)
    {
      'opendatahub.io/managed': 'true',
      'opendatahub.io/nim-model-cache': 'true',
    },
  );
};

/**
 * Get the default PVC name for a NIM deployment
 * Format: {modelName}-nim-pvc
 */
export const getDefaultNIMPVCName = (deploymentName: string): string => {
  return `${deploymentName}-nim-pvc`;
};
