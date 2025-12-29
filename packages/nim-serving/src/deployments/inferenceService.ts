import type { InferenceServiceKind } from '@odh-dashboard/internal/k8sTypes';
import type { ModelFormat } from '@odh-dashboard/model-serving/src/components/deploymentWizard/types';

/**
 * Create a basic NIM InferenceService structure
 *
 * @param projectName - Kubernetes namespace
 * @param k8sName - Kubernetes resource name
 * @param displayName - Human-readable name
 * @param description - Description
 * @param modelName - NIM model identifier (e.g., "meta/llama-3.1-8b-instruct")
 * @param modelVersion - Model version
 * @returns Basic InferenceService object
 */
export const assembleNIMInferenceService = (
  projectName: string,
  k8sName: string,
  displayName: string,
  description: string,
  modelName: string,
  modelVersion: string,
): InferenceServiceKind => {
  const inferenceService: InferenceServiceKind = {
    apiVersion: 'serving.kserve.io/v1beta1',
    kind: 'InferenceService',
    metadata: {
      name: k8sName,
      namespace: projectName,
      annotations: {
        'openshift.io/display-name': displayName,
        ...(description && { 'openshift.io/description': description }),
        'serving.kserve.io/deploymentMode': 'RawDeployment',
        'opendatahub.io/nim-model': modelName,
        'opendatahub.io/nim-model-version': modelVersion,
      },
      labels: {
        'opendatahub.io/dashboard': 'true',
        'opendatahub.io/nim-deployment': 'true',
      },
    },
    spec: {
      predictor: {
        model: {
          modelFormat: {
            name: modelName.split('/').pop() || modelName,
            version: modelVersion,
          },
          runtime: k8sName, // References the ServingRuntime
        },
      },
    },
  };

  return inferenceService;
};

/**
 * Apply model format information to an InferenceService
 *
 * @param inferenceService - The InferenceService to modify
 * @param modelFormat - Model format details
 * @returns Modified InferenceService
 */
export const applyModelFormat = (
  inferenceService: InferenceServiceKind,
  modelFormat?: ModelFormat,
): InferenceServiceKind => {
  const result = structuredClone(inferenceService);

  if (modelFormat && result.spec.predictor.model) {
    result.spec.predictor.model.modelFormat = {
      name: modelFormat.name,
      ...(modelFormat.version && { version: modelFormat.version }),
    };
  }

  return result;
};
