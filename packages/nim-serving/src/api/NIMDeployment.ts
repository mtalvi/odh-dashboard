// eslint-disable-next-line import/no-extraneous-dependencies -- False positive: @odh-dashboard/internal is in dependencies
import { deleteInferenceService, deleteServingRuntime } from '@odh-dashboard/internal/api';
import type { NIMDeployment } from '../types';

/**
 * Delete a NIM deployment
 * Deletes the InferenceService and ServingRuntime
 * Note: Secrets and PVCs are not deleted as they may be shared across deployments
 */
export const deleteDeployment = async (deployment: NIMDeployment): Promise<void> => {
  const { model, server } = deployment;
  const { namespace } = model.metadata;
  const modelName = model.metadata.name;

  // Delete InferenceService
  await deleteInferenceService(namespace, modelName);

  // Delete ServingRuntime if it exists
  if (server) {
    await deleteServingRuntime(namespace, server.metadata.name);
  }

  // Note: We intentionally do NOT delete:
  // - PVCs: They may be reused by other deployments or contain cached models
  // - Secrets: nvidia-nim-secrets and ngc-secret are project-scoped and shared
  // Users can manually delete these resources if needed
};
