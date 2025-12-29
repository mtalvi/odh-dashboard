// eslint-disable-next-line import/no-extraneous-dependencies -- False positive: @odh-dashboard/model-serving is in dependencies
import type { WizardFormData } from '@odh-dashboard/model-serving/types';
// eslint-disable-next-line import/no-extraneous-dependencies -- False positive: @odh-dashboard/model-serving is in dependencies
import { ModelLocationType } from '@odh-dashboard/model-serving/types';
import type { ServingRuntimeKind } from '@odh-dashboard/internal/k8sTypes';
// eslint-disable-next-line import/no-extraneous-dependencies -- False positive: @odh-dashboard/internal is in dependencies
import { createServingRuntime, createInferenceService } from '@odh-dashboard/internal/api';
import {
  applyNIMPVCToServingRuntime,
  applyNIMSecretsToServingRuntime,
  applyNIMMetadata,
} from './servingRuntime';
import { assembleNIMInferenceService } from './inferenceService';
import { getDefaultNIMPVCName, createNIMPVC } from '../api/pvc';
import { createNIMAPIKeySecret, createNGCPullSecret } from '../api/secrets';
import type { NIMDeployment } from '../types';
import { NIM_SERVING_ID } from '../../extensions/extensions';

/**
 * Fetch or use a base NIM ServingRuntime template
 * For now, we'll create a minimal structure - in a full implementation,
 * this would fetch from a NIMAccount CRD or template
 */
const getNIMBaseServingRuntime = (namespace: string, name: string): ServingRuntimeKind => {
  // Minimal NIM ServingRuntime structure
  // In production, this would come from a template or NIMAccount
  return {
    apiVersion: 'serving.kserve.io/v1alpha1',
    kind: 'ServingRuntime',
    metadata: {
      name,
      namespace,
    },
    spec: {
      supportedModelFormats: [
        {
          name: 'nim',
          version: '1',
        },
      ],
      containers: [
        {
          name: 'kserve-container',
          image: 'nvcr.io/nim/meta/llama-3.1-8b-instruct:latest', // Will be updated based on model
          env: [],
          volumeMounts: [],
        },
      ],
      volumes: [],
      imagePullSecrets: [],
    },
  };
};

/**
 * Main deployment function for NIM deployments
 * Creates all necessary resources for a NIM model deployment
 */
export const deployNIMDeployment = async (
  wizardState: WizardFormData['state'],
  projectName: string,
): Promise<NIMDeployment> => {
  const modelLocationData = wizardState.modelLocationData.data;

  if (!modelLocationData || modelLocationData.type !== ModelLocationType.NIM) {
    throw new Error('Invalid model location data for NIM deployment');
  }

  const { nimData } = modelLocationData.additionalFields;
  if (!nimData) {
    throw new Error('NIM data is required for NIM deployment');
  }

  const k8sName = wizardState.k8sNameDesc.data.k8sName.value;
  const displayName = wizardState.k8sNameDesc.data.name;
  const description = wizardState.k8sNameDesc.data.description || '';

  // Step 1: Create secrets (API key and pull secret)
  // Check if secrets already exist, if not create them
  try {
    await createNIMAPIKeySecret(projectName, nimData.apiKey, { dryRun: true });
    await createNGCPullSecret(projectName, nimData.apiKey, { dryRun: true });

    // Dry run succeeded, now create for real
    await createNIMAPIKeySecret(projectName, nimData.apiKey);
    await createNGCPullSecret(projectName, nimData.apiKey);
  } catch (error) {
    // Secrets might already exist, which is fine
    console.log('Secrets may already exist:', error);
  }

  // Step 2: Create or reuse PVC
  let pvcName: string;

  if (nimData.pvcMode === 'use-existing' && nimData.existingPvcName) {
    pvcName = nimData.existingPvcName;
  } else {
    // Create new PVC
    pvcName = getDefaultNIMPVCName(k8sName);
    try {
      await createNIMPVC(projectName, pvcName, nimData.pvcSize, nimData.storageClassName, {
        dryRun: true,
      });

      // Dry run succeeded, create for real
      await createNIMPVC(projectName, pvcName, nimData.pvcSize, nimData.storageClassName);
    } catch (error) {
      // PVC might already exist
      console.log('PVC may already exist:', error);
    }
  }

  // Step 3: Create ServingRuntime
  let servingRuntime = getNIMBaseServingRuntime(projectName, k8sName);
  servingRuntime = applyNIMPVCToServingRuntime(servingRuntime, pvcName);
  servingRuntime = applyNIMSecretsToServingRuntime(servingRuntime);
  servingRuntime = applyNIMMetadata(
    servingRuntime,
    displayName,
    description,
    nimData.selectedModel,
  );

  // Create the ServingRuntime
  const createdServingRuntime = await createServingRuntime(servingRuntime);

  // Step 4: Create InferenceService
  const inferenceService = assembleNIMInferenceService(
    projectName,
    k8sName,
    displayName,
    description,
    nimData.selectedModel,
    nimData.modelVersion,
  );

  const createdInferenceService = await createInferenceService(inferenceService);

  // Step 5: Return the deployment object
  return {
    modelServingPlatformId: NIM_SERVING_ID,
    model: createdInferenceService,
    server: createdServingRuntime,
  };
};
