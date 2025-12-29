import { ModelLocationData, ModelLocationType } from '@odh-dashboard/model-serving/types';
import type { InferenceServiceKind, ServingRuntimeKind } from '@odh-dashboard/internal/k8sTypes';

/**
 * Extract model location data from existing NIM deployment for editing
 * Extracts NIM-specific configuration from InferenceService and ServingRuntime
 */
export const extractModelLocationData = (
  inferenceService: InferenceServiceKind,
  servingRuntime: ServingRuntimeKind,
): ModelLocationData | undefined => {
  // Extract NIM model information from annotations
  const modelName = inferenceService.metadata.annotations?.['opendatahub.io/nim-model'];
  const modelVersion =
    inferenceService.metadata.annotations?.['opendatahub.io/nim-model-version'] || '1';

  if (!modelName) {
    return undefined;
  }

  // Extract PVC information from ServingRuntime volumes
  const pvcVolume = servingRuntime.spec.volumes?.find(
    (vol) => vol.persistentVolumeClaim !== undefined,
  );
  const pvcName = pvcVolume?.persistentVolumeClaim?.claimName || '';

  // Extract storage class from PVC (would need to fetch PVC resource for this)
  // For now, use default or empty string
  const storageClassName = '';

  // Extract PVC size (would need to fetch PVC resource for this)
  const pvcSize = '100Gi'; // Default placeholder

  // Note: API key cannot be extracted from secrets for security reasons
  const apiKey = ''; // User will need to re-enter if editing

  const modelLocationData: ModelLocationData = {
    type: ModelLocationType.NIM,
    fieldValues: {},
    additionalFields: {
      nimData: {
        selectedModel: modelName,
        modelVersion,
        apiKey, // Empty - user must re-enter
        pvcMode: 'use-existing',
        existingPvcName: pvcName,
        pvcSize,
        storageClassName,
      },
    },
  };

  return modelLocationData;
};
