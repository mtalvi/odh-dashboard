import type { InferenceServiceKind, ServingRuntimeKind } from '@odh-dashboard/internal/k8sTypes';
import type {
  ModelLocationData,
  RuntimeArgsFieldData,
  EnvironmentVariablesFieldData,
} from '@odh-dashboard/model-serving/types/form-data';
import type { HardwareProfileConfig } from '@odh-dashboard/internal/concepts/hardwareProfiles/useHardwareProfileConfig';
import { applyHardwareProfileConfig } from '@odh-dashboard/internal/concepts/hardwareProfiles/utils';
// eslint-disable-next-line @odh-dashboard/no-restricted-imports
import { INFERENCE_SERVICE_HARDWARE_PROFILE_PATHS } from '@odh-dashboard/internal/concepts/hardwareProfiles/const';

export type AssembleNIMResourcesParams = {
  projectName: string;
  k8sName: string;
  displayName?: string;
  description?: string;
  hardwareProfile: HardwareProfileConfig;
  modelLocationData: ModelLocationData;
  replicas?: number;
  runtimeArgs?: RuntimeArgsFieldData;
  environmentVariables?: EnvironmentVariablesFieldData;
  // NIM-specific
  servingRuntime: ServingRuntimeKind;
  servingRuntimeName: string;
  pvcName: string;
  modelPath: string;
};

/**
 * Assembles a NIM InferenceService from wizard data
 * This is a pure function that builds the desired state of the InferenceService
 */
export const assembleNIMInferenceService = (
  params: AssembleNIMResourcesParams,
  existingInferenceService?: InferenceServiceKind,
  transformData?: { metadata?: { labels?: Record<string, string> } },
): InferenceServiceKind => {
  const {
    projectName,
    k8sName,
    displayName,
    description,
    hardwareProfile,
    modelLocationData,
    replicas = 1,
    environmentVariables,
    servingRuntimeName,
    modelPath,
  } = params;

  // Get the NIM model name for the format
  const { nimModel } = modelLocationData.additionalFields;
  const modelFormat = nimModel?.name || 'unknown';

  // Start with existing or create new base structure
  let inferenceService: InferenceServiceKind = existingInferenceService
    ? { ...existingInferenceService }
    : {
        apiVersion: 'serving.kserve.io/v1beta1',
        kind: 'InferenceService',
        metadata: {
          name: k8sName,
          namespace: projectName,
          annotations: {
            ...(displayName && { 'openshift.io/display-name': displayName }),
            ...(description && { 'openshift.io/description': description }),
            'opendatahub.io/model-type': 'generative',
          },
          labels: {
            'opendatahub.io/dashboard': 'true',
          },
        },
        spec: {
          predictor: {
            minReplicas: replicas,
            maxReplicas: replicas,
            model: {
              modelFormat: {
                name: modelFormat,
              },
              runtime: servingRuntimeName,
              storage: {
                key: 'aws-connection-nim-models',
                path: modelPath,
              },
            },
          },
        },
      };

  // Apply display name and description
  if (displayName && inferenceService.metadata.annotations) {
    inferenceService.metadata.annotations['openshift.io/display-name'] = displayName;
  }
  if (description && inferenceService.metadata.annotations) {
    inferenceService.metadata.annotations['openshift.io/description'] = description;
  }

  // Apply dashboard resource label
  if (!inferenceService.metadata.labels) {
    inferenceService.metadata.labels = {};
  }
  inferenceService.metadata.labels['opendatahub.io/dashboard'] = 'true';

  // Apply hardware profile (tolerations, resources, node selectors)
  inferenceService = applyHardwareProfileConfig(
    inferenceService,
    hardwareProfile,
    INFERENCE_SERVICE_HARDWARE_PROFILE_PATHS,
  );

  // Apply replicas
  inferenceService.spec.predictor.minReplicas = replicas;
  inferenceService.spec.predictor.maxReplicas = replicas;

  // Apply environment variables
  if (environmentVariables?.enabled && environmentVariables.variables.length > 0) {
    if (!inferenceService.spec.predictor.model) {
      inferenceService.spec.predictor.model = {
        modelFormat: { name: '' },
        runtime: '',
      };
    }
    inferenceService.spec.predictor.model.env = environmentVariables.variables.map((envVar) => ({
      name: envVar.name,
      value: envVar.value,
    }));
  }

  // Update storage configuration for NIM (always uses PVC path)
  if (inferenceService.spec.predictor.model) {
    inferenceService.spec.predictor.model.storage = {
      key: 'aws-connection-nim-models',
      path: modelPath,
    };
    inferenceService.spec.predictor.model.modelFormat = {
      name: modelFormat,
    };
    inferenceService.spec.predictor.model.runtime = servingRuntimeName;
  }

  // Apply transform data (additional labels, etc.)
  if (transformData?.metadata?.labels && inferenceService.metadata.labels) {
    inferenceService.metadata.labels = {
      ...inferenceService.metadata.labels,
      ...transformData.metadata.labels,
    };
  }

  return inferenceService;
};

/**
 * Assembles a NIM ServingRuntime from wizard data
 * Applies hardware profile and environment variables to the base runtime
 */
export const assembleNIMServingRuntime = (
  params: AssembleNIMResourcesParams,
  existingServingRuntime?: ServingRuntimeKind,
): ServingRuntimeKind => {
  const { hardwareProfile, environmentVariables, servingRuntime } = params;

  // Start with the provided serving runtime (already configured with PVC)
  let finalServingRuntime: ServingRuntimeKind = existingServingRuntime || { ...servingRuntime };

  // Apply hardware profile to the serving runtime
  finalServingRuntime = applyHardwareProfileConfig(
    finalServingRuntime,
    hardwareProfile,
    INFERENCE_SERVICE_HARDWARE_PROFILE_PATHS,
  );

  // Apply environment variables to all containers
  if (
    environmentVariables?.enabled &&
    environmentVariables.variables.length > 0 &&
    finalServingRuntime.spec.containers?.length
  ) {
    finalServingRuntime.spec.containers = finalServingRuntime.spec.containers.map((container) => ({
      ...container,
      env: [
        ...(container.env || []),
        ...environmentVariables.variables.map((envVar) => ({
          name: envVar.name,
          value: envVar.value,
        })),
      ],
    }));
  }

  // Store NIM PVC configuration in annotations for form data extraction during edit mode
  if (!finalServingRuntime.metadata.annotations) {
    finalServingRuntime.metadata.annotations = {};
  }
  finalServingRuntime.metadata.annotations['opendatahub.io/nim-pvc-size'] =
    params.modelLocationData.additionalFields.nimPvcSize || '30Gi';
  finalServingRuntime.metadata.annotations['opendatahub.io/nim-pvc-mode'] =
    params.modelLocationData.additionalFields.nimPvcMode || 'create-new';
  if (params.modelLocationData.additionalFields.nimStorageClassName) {
    finalServingRuntime.metadata.annotations['opendatahub.io/nim-storage-class'] =
      params.modelLocationData.additionalFields.nimStorageClassName;
  }

  return finalServingRuntime;
};
