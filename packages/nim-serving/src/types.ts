import type { InferenceServiceKind, ServingRuntimeKind } from '@odh-dashboard/internal/k8sTypes';
import type { Deployment } from '@odh-dashboard/model-serving/extension-points';

export type NIMDeployment = Deployment<InferenceServiceKind, ServingRuntimeKind>;

export type NIMModel = {
  name: string;
  displayName: string;
  versions: string[];
};

export type NIMData = {
  selectedModel: string;
  modelVersion: string;
  apiKey: string;
  pvcMode: 'create-new' | 'use-existing';
  existingPvcName?: string;
  pvcSize: string;
  storageClassName: string;
};
