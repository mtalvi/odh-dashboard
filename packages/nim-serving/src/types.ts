import type { InferenceServiceKind, ServingRuntimeKind } from '@odh-dashboard/internal/k8sTypes';
import type { Deployment } from '@odh-dashboard/model-serving/extension-points';

export const NIM_SERVING_ID = 'nim-serving';

export type NIMDeployment = Deployment<InferenceServiceKind, ServingRuntimeKind>;

export const isNIMDeployment = (deployment: Deployment): deployment is NIMDeployment =>
  deployment.modelServingPlatformId === NIM_SERVING_ID;

// NIM-specific model selection data
export type NIMModelSelection = {
  name: string;
  displayName: string;
  version: string;
};

// NIM PVC configuration
export type NIMPVCConfig = {
  mode: 'create-new' | 'use-existing';
  size?: string;
  existingPvcName?: string;
  modelPath?: string;
  subPath?: string;
  storageClassName?: string;
};

// NIM deployment metadata
export type NIMDeploymentMetadata = {
  model: NIMModelSelection;
  pvcConfig: NIMPVCConfig;
  apiKey?: string; // For future use when API key moves to project namespace
};
