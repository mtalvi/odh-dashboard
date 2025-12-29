import type { ServingRuntimeKind } from '@odh-dashboard/internal/k8sTypes';
import { NIM_API_KEY_SECRET_NAME, NIM_PULL_SECRET_NAME } from '../api/secrets';

const NIM_MODEL_MOUNT_PATH = '/mnt/models/cache';

/**
 * Apply PVC configuration to a NIM ServingRuntime
 * NIM requires a PVC mounted at /mnt/models/cache for model caching
 *
 * @param servingRuntime - The base ServingRuntime to modify
 * @param pvcName - Name of the PVC to mount
 * @returns Modified ServingRuntime with PVC configured
 */
export const applyNIMPVCToServingRuntime = (
  servingRuntime: ServingRuntimeKind,
  pvcName: string,
): ServingRuntimeKind => {
  const result = structuredClone(servingRuntime);

  // Update volume mounts in containers
  if (result.spec.containers?.length) {
    result.spec.containers = result.spec.containers.map((container) => {
      // Find or create volumeMounts array
      const volumeMounts = container.volumeMounts || [];

      // Update or add the NIM cache volume mount
      const nimMountIndex = volumeMounts.findIndex(
        (mount) => mount.mountPath === NIM_MODEL_MOUNT_PATH,
      );

      if (nimMountIndex >= 0) {
        // Update existing mount
        volumeMounts[nimMountIndex] = {
          ...volumeMounts[nimMountIndex],
          name: pvcName,
        };
      } else {
        // Add new mount
        volumeMounts.push({
          name: pvcName,
          mountPath: NIM_MODEL_MOUNT_PATH,
        });
      }

      return {
        ...container,
        volumeMounts,
      };
    });
  }

  // Update volumes
  const volumes = result.spec.volumes || [];

  // Find existing NIM PVC volume or add new one
  const nimVolumeIndex = volumes.findIndex(
    (vol) =>
      vol.persistentVolumeClaim !== undefined ||
      vol.name.includes('nim-pvc') ||
      vol.name === pvcName,
  );

  const pvcVolume = {
    name: pvcName,
    persistentVolumeClaim: {
      claimName: pvcName,
    },
  };

  if (nimVolumeIndex >= 0) {
    volumes[nimVolumeIndex] = pvcVolume;
  } else {
    volumes.push(pvcVolume);
  }

  result.spec.volumes = volumes;

  return result;
};

/**
 * Apply NIM secrets to a ServingRuntime
 * Adds NGC API key as environment variable and NGC pull secret for image pulling
 *
 * @param servingRuntime - The base ServingRuntime to modify
 * @returns Modified ServingRuntime with secrets configured
 */
export const applyNIMSecretsToServingRuntime = (
  servingRuntime: ServingRuntimeKind,
): ServingRuntimeKind => {
  const result = structuredClone(servingRuntime);

  // Add NGC_API_KEY environment variable to containers
  if (result.spec.containers?.length) {
    result.spec.containers = result.spec.containers.map((container) => {
      const env = container.env || [];

      // Check if NGC_API_KEY already exists
      const apiKeyEnvIndex = env.findIndex((e) => e.name === 'NGC_API_KEY');

      const apiKeyEnv = {
        name: 'NGC_API_KEY',
        valueFrom: {
          secretKeyRef: {
            name: NIM_API_KEY_SECRET_NAME,
            key: 'NGC_API_KEY',
          },
        },
      };

      if (apiKeyEnvIndex >= 0) {
        env[apiKeyEnvIndex] = apiKeyEnv;
      } else {
        env.push(apiKeyEnv);
      }

      return {
        ...container,
        env,
      };
    });
  }

  // Add imagePullSecrets for NGC registry authentication
  const imagePullSecrets = result.spec.imagePullSecrets || [];

  if (!imagePullSecrets.some((secret) => secret.name === NIM_PULL_SECRET_NAME)) {
    imagePullSecrets.push({
      name: NIM_PULL_SECRET_NAME,
    });
  }

  result.spec.imagePullSecrets = imagePullSecrets;

  return result;
};

/**
 * Apply model-specific annotations and labels to a ServingRuntime
 *
 * @param servingRuntime - The base ServingRuntime to modify
 * @param displayName - Display name for the deployment
 * @param description - Description for the deployment
 * @param modelName - NIM model name (e.g., "meta/llama-3.1-8b-instruct")
 * @returns Modified ServingRuntime with metadata
 */
export const applyNIMMetadata = (
  servingRuntime: ServingRuntimeKind,
  displayName: string,
  description: string,
  modelName: string,
): ServingRuntimeKind => {
  const result = structuredClone(servingRuntime);

  result.metadata.annotations = {
    ...result.metadata.annotations,
    'openshift.io/display-name': displayName,
    ...(description && { 'openshift.io/description': description }),
    'opendatahub.io/nim-model': modelName,
  };

  result.metadata.labels = {
    ...result.metadata.labels,
    'opendatahub.io/dashboard': 'true',
    'opendatahub.io/nim-deployment': 'true',
  };

  return result;
};
