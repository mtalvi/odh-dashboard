import type { ServingRuntimeKind, K8sAPIOptions } from '@odh-dashboard/internal/k8sTypes';
import type { K8sModelCommon } from '@openshift/dynamic-plugin-sdk-utils';
import {
  k8sCreateResource,
  k8sPatchResource,
  k8sUpdateResource,
} from '@openshift/dynamic-plugin-sdk-utils';
import { applyK8sAPIOptions } from '@odh-dashboard/internal/api/apiMergeUtils';
import { createPatchesFromDiff } from '@odh-dashboard/internal/api/k8sUtils';

const ServingRuntimeModel: K8sModelCommon = {
  apiVersion: 'v1alpha1',
  apiGroup: 'serving.kserve.io',
  kind: 'ServingRuntime',
  plural: 'servingruntimes',
};

/**
 * Create a new ServingRuntime resource
 */
export const createServingRuntime = async (
  servingRuntime: ServingRuntimeKind,
  opts?: K8sAPIOptions,
): Promise<ServingRuntimeKind> => {
  return k8sCreateResource<ServingRuntimeKind>(
    applyK8sAPIOptions(
      {
        model: ServingRuntimeModel,
        resource: servingRuntime,
      },
      opts,
    ),
  );
};

/**
 * Patch an existing ServingRuntime using JSON Patch
 * Preferred method for updates when overwrite=true as it's less prone to conflicts
 */
export const patchServingRuntime = async (
  existing: ServingRuntimeKind,
  updated: ServingRuntimeKind,
  opts?: K8sAPIOptions,
): Promise<ServingRuntimeKind> => {
  // Generate patches based on the differences
  const patches = createPatchesFromDiff(existing, updated);

  // If no patches needed, return the updated resource
  if (patches.length === 0) {
    return Promise.resolve(updated);
  }

  return k8sPatchResource<ServingRuntimeKind>(
    applyK8sAPIOptions(
      {
        model: ServingRuntimeModel,
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
 * Update an existing ServingRuntime using merge patch
 * Used when overwrite=false to preserve fields not in the update
 */
export const updateServingRuntime = async (
  servingRuntime: ServingRuntimeKind,
  opts?: K8sAPIOptions,
): Promise<ServingRuntimeKind> => {
  return k8sUpdateResource<ServingRuntimeKind>(
    applyK8sAPIOptions(
      {
        model: ServingRuntimeModel,
        resource: servingRuntime,
      },
      opts,
    ),
  );
};
