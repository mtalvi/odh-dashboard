import type { ModelLocationData } from '@odh-dashboard/model-serving/types/form-data';
import { ModelLocationType } from '@odh-dashboard/model-serving/types/form-data';
import type { SupportedModelFormats } from '@odh-dashboard/internal/k8sTypes';
import type { useHardwareProfileConfig } from '@odh-dashboard/internal/concepts/hardwareProfiles/useHardwareProfileConfig';
import {
  getExistingHardwareProfileData,
  getExistingResources,
  MODEL_SERVING_VISIBILITY,
  INFERENCE_SERVICE_HARDWARE_PROFILE_PATHS,
} from '@odh-dashboard/internal/concepts/hardwareProfiles/const';
import type { ModelServerOption } from '@odh-dashboard/model-serving/components/deploymentWizard/fields/ModelServerTemplateSelectField';
import type { NIMDeployment } from '../types';

/**
 * Extract NIM model location data from InferenceService and ServingRuntime
 * This is used for edit mode to pre-populate the wizard with existing deployment data
 */
export const extractModelLocationData = (
  nimDeployment: NIMDeployment,
): ModelLocationData | null => {
  const inferenceService = nimDeployment.model;
  const servingRuntime = nimDeployment.server;

  // Extract NIM model from model format
  const modelFormat = inferenceService.spec.predictor.model?.modelFormat;
  const nimModel = modelFormat?.name
    ? {
        name: modelFormat.name,
        displayName: modelFormat.name,
        version: modelFormat.version || '1',
      }
    : undefined;

  // Extract PVC name from ServingRuntime volumes
  const volumes = servingRuntime.spec.volumes || [];
  const nimVolume = volumes.find((vol) => vol.persistentVolumeClaim && vol.name.includes('pvc'));
  const pvcName = nimVolume?.persistentVolumeClaim?.claimName;

  // Extract PVC size from ServingRuntime annotations (stored during deployment)
  // This is the NVIDIA NIM storage size field value
  const annotations = servingRuntime.metadata.annotations || {};
  const nimPvcSize = annotations['opendatahub.io/nim-pvc-size'] || '30Gi';
  const nimPvcMode = annotations['opendatahub.io/nim-pvc-mode'] || 'use-existing';
  const nimStorageClassName = annotations['opendatahub.io/nim-storage-class'];

  // Extract mount path and subPath from container volume mounts
  let modelPath = '/mnt/models/cache';
  let pvcSubPath: string | undefined;

  const containers = servingRuntime.spec.containers || [];
  for (const container of containers) {
    const volumeMounts = container.volumeMounts || [];
    for (const mount of volumeMounts) {
      if (mount.mountPath === '/mnt/models/cache' || mount.name === nimVolume?.name) {
        modelPath = mount.mountPath;
        pvcSubPath = mount.subPath;
        break;
      }
    }
  }

  return {
    type: ModelLocationType.NIM,
    fieldValues: {},
    additionalFields: {
      nimModel,
      nimPvcMode: (nimPvcMode === 'create-new' || nimPvcMode === 'use-existing') ? nimPvcMode : 'use-existing',
      nimPvcSize,
      nimExistingPvcName: pvcName,
      nimModelPath: modelPath,
      nimPvcSubPath: pvcSubPath,
      nimStorageClassName,
      nimOperatorReady: true,
    },
  };
};

// ===========================
// Standard extraction functions required by ModelServingDeploymentFormDataExtension
// ===========================

/**
 * Extract hardware profile configuration from NIM deployment
 * Returns parameters that can be passed to useHardwareProfileConfig
 */
export const extractHardwareProfileConfig = (
  nimDeployment: NIMDeployment,
): Parameters<typeof useHardwareProfileConfig> => {
  const { name, namespace: hardwareProfileNamespace } = getExistingHardwareProfileData(
    nimDeployment.model,
  );
  const { existingContainerResources, existingTolerations, existingNodeSelector } =
    getExistingResources(nimDeployment.model, INFERENCE_SERVICE_HARDWARE_PROFILE_PATHS);
  return [
    name,
    existingContainerResources,
    existingTolerations,
    existingNodeSelector,
    MODEL_SERVING_VISIBILITY,
    nimDeployment.model.metadata.namespace,
    hardwareProfileNamespace,
  ];
};

/**
 * Extract model format from NIM deployment
 * NIM doesn't use the standard model format field, so we return null
 */
export const extractModelFormat = (): SupportedModelFormats | null => {
  // NIM model format is stored as part of nimModel in ModelLocationData
  // The wizard hides the model format field for NIM, so return null
  return null;
};

/**
 * Extract replica count from NIM deployment
 */
export const extractReplicas = (nimDeployment: NIMDeployment): number | null => {
  return nimDeployment.model.spec.predictor.minReplicas ?? 1;
};

/**
 * Extract runtime args from NIM deployment
 */
export const extractRuntimeArgs = (): { enabled: boolean; args: string[] } | null => {
  // NIM doesn't currently use runtime args in the same way as LLMd
  // If we add support in the future, extract from ServingRuntime containers
  return { enabled: false, args: [] };
};

/**
 * Extract environment variables from NIM deployment
 */
export const extractEnvironmentVariables = (
  nimDeployment: NIMDeployment,
): { enabled: boolean; variables: { name: string; value: string }[] } | null => {
  const containers = nimDeployment.server?.spec.containers || [];
  const mainContainer = containers[0]; // NIM typically has one main container

  if (!mainContainer.env || mainContainer.env.length === 0) {
    return { enabled: false, variables: [] };
  }

  // Filter out system env vars, only return user-defined ones
  const userEnvVars = mainContainer.env
    .filter((env) => env.name && env.value)
    .map((env) => ({
      name: env.name,
      value: env.value || '',
    }));

  return {
    enabled: userEnvVars.length > 0,
    variables: userEnvVars,
  };
};

/**
 * Extract model availability data from NIM deployment
 */
export const extractModelAvailabilityData = (
  nimDeployment: NIMDeployment,
): { saveAsAiAsset: boolean; saveAsMaaS?: boolean; useCase?: string } | null => {
  // Check for AI asset annotation
  const saveAsAiAsset =
    nimDeployment.model.metadata.annotations?.['ai.opendatahub.io/model-asset'] === 'true';

  return {
    saveAsAiAsset,
    saveAsMaaS: false, // NIM doesn't support MaaS
  };
};

/**
 * Extract deployment strategy from NIM deployment
 */
export const extractDeploymentStrategy = (): 'rolling' | 'recreate' | null => {
  // NIM typically uses rolling deployment
  return 'rolling';
};

/**
 * Extract model server template from NIM deployment
 * Returns the ModelServerOption that should be selected in the wizard
 */
export const extractModelServerTemplate = (
  nimDeployment: NIMDeployment,
): ModelServerOption | null => {
  // Get the template name from annotations
  const templateName = nimDeployment.server?.metadata.annotations?.['opendatahub.io/template-name'];
  const templateDisplayName =
    nimDeployment.server?.metadata.annotations?.['opendatahub.io/template-display-name'];

  if (!templateName) {
    return null;
  }

  return {
    name: templateName,
    label: templateDisplayName || 'NVIDIA NIM',
  };
};
