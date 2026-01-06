import type { InferenceServiceKind, K8sAPIOptions } from '@odh-dashboard/internal/k8sTypes';
import type { K8sModelCommon } from '@openshift/dynamic-plugin-sdk-utils';
import {
  k8sCreateResource,
  k8sPatchResource,
  k8sUpdateResource,
} from '@openshift/dynamic-plugin-sdk-utils';
import { applyK8sAPIOptions } from '@odh-dashboard/internal/api/apiMergeUtils';
import { createPatchesFromDiff } from '@odh-dashboard/internal/api/k8sUtils';

const InferenceServiceModel: K8sModelCommon = {
  apiVersion: 'v1beta1',
  apiGroup: 'serving.kserve.io',
  kind: 'InferenceService',
  plural: 'inferenceservices',
};

/**
 * Create a new InferenceService resource
 */
export const createInferenceService = async (
  inferenceService: InferenceServiceKind,
  opts?: K8sAPIOptions,
): Promise<InferenceServiceKind> => {
  return k8sCreateResource<InferenceServiceKind>(
    applyK8sAPIOptions(
      {
        model: InferenceServiceModel,
        resource: inferenceService,
      },
      opts,
    ),
  );
};

/**
 * Patch an existing InferenceService using JSON Patch
 * Preferred method for updates when overwrite=true as it's less prone to conflicts
 */
export const patchInferenceService = async (
  existing: InferenceServiceKind,
  updated: InferenceServiceKind,
  opts?: K8sAPIOptions,
): Promise<InferenceServiceKind> => {
  // Generate patches based on the differences
  const patches = createPatchesFromDiff(existing, updated);

  // If no patches needed, return the updated resource
  if (patches.length === 0) {
    return Promise.resolve(updated);
  }

  return k8sPatchResource<InferenceServiceKind>(
    applyK8sAPIOptions(
      {
        model: InferenceServiceModel,
        queryOptions: {
          name: updated.metadata.name,
          ns: updated.metadata.namespace,
        },
        patches,
      },
      opts,
    ),
  );
};

/**
 * Update an existing InferenceService using merge patch
 * Used when overwrite=false to preserve fields not in the update
 */
export const updateInferenceService = async (
  inferenceService: InferenceServiceKind,
  opts?: K8sAPIOptions,
): Promise<InferenceServiceKind> => {
  return k8sUpdateResource<InferenceServiceKind>(
    applyK8sAPIOptions(
      {
        model: InferenceServiceModel,
        resource: inferenceService,
      },
      opts,
    ),
  );
};
