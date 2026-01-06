import type {
  WizardFormData,
  InitialWizardFormData,
} from '@odh-dashboard/model-serving/types/form-data';
import { ModelLocationType } from '@odh-dashboard/model-serving/types/form-data';
import type { ServingRuntimeKind } from '@odh-dashboard/internal/k8sTypes';
import { getUniqueId } from '@patternfly/react-core';
// eslint-disable-next-line @odh-dashboard/no-restricted-imports
import { translateDisplayNameForK8s } from '@odh-dashboard/internal/concepts/k8s/utils';
// eslint-disable-next-line @odh-dashboard/no-restricted-imports
import { patchInferenceServiceStoppedStatus } from '@odh-dashboard/internal/api';
import {
  isSecretNeeded,
  createNIMAPISecret,
  createNGCPullSecret,
  handleNIMPVC,
  NIM_SECRET_NAME,
  NIM_NGC_SECRET_NAME,
} from './secrets';
import { assembleNIMInferenceService, assembleNIMServingRuntime } from './resources';
import type { NIMDeployment } from '../types';
import { NIM_SERVING_ID } from '../types';
import {
  createServingRuntime,
  patchServingRuntime,
  updateServingRuntime,
} from '../api/ServingRuntime';
import {
  createInferenceService,
  patchInferenceService,
  updateInferenceService,
} from '../api/InferenceService';
import {
  fetchNIMTemplateName,
  fetchNIMTemplate,
  convertTemplateToServingRuntime,
  configureNIMServingRuntime,
} from '../utils/templates';

const DEFAULT_MODEL_PATH = '/mnt/models/cache';
const DEFAULT_DASHBOARD_NAMESPACE = 'opendatahub';

/**
 * Main entry point for deploying a NIM deployment from wizard data.
 * This function orchestrates the entire deployment process:
 * 1. Extracts NIM-specific configuration from wizard state
 * 2. Fetches and configures the NIM serving runtime template
 * 3. Assembles InferenceService and ServingRuntime resources
 * 4. Creates/updates K8s resources (with dry-run validation)
 * 5. Handles secrets and PVC creation
 */
export const deployNIMDeployment = async (
  wizardData: WizardFormData['state'],
  projectName: string,
  existingDeployment?: NIMDeployment,
  serverResource?: NIMDeployment['server'],
  serverResourceTemplateName?: string,
  dryRun?: boolean,
  connectionSecretName?: string, // Not used for NIM
  overwrite?: boolean,
  initialWizardData?: InitialWizardFormData,
): Promise<NIMDeployment> => {
  // ========================================================================
  // STEP 1: EXTRACT AND VALIDATE WIZARD DATA
  // ========================================================================

  const modelLocationData = wizardData.modelLocationData.data;

  if (!modelLocationData || modelLocationData.type !== ModelLocationType.NIM) {
    throw new Error(
      'Invalid model location type for NIM deployment. Expected ModelLocationType.NIM',
    );
  }

  const { additionalFields } = modelLocationData;
  const {
    nimModel,
    nimPvcMode,
    nimPvcSize,
    nimExistingPvcName,
    nimModelPath,
    nimPvcSubPath,
    nimStorageClassName,
  } = additionalFields;

  if (!nimModel) {
    throw new Error('NIM model selection is required');
  }

  if (!nimPvcMode) {
    throw new Error('NIM PVC mode is required');
  }

  if (nimPvcMode === 'create-new' && !nimPvcSize) {
    throw new Error('PVC size is required when creating a new PVC');
  }

  if (nimPvcMode === 'use-existing' && (!nimExistingPvcName || !nimModelPath)) {
    throw new Error('PVC name and model path are required when using an existing PVC');
  }

  // ========================================================================
  // STEP 2: FETCH NIM SERVING RUNTIME TEMPLATE (Match original modal logic)
  // ========================================================================

  const dashboardNamespace = DEFAULT_DASHBOARD_NAMESPACE;

  let baseServingRuntime: ServingRuntimeKind | undefined;

  // PRIORITY 1: Use existing serving runtime if editing (same as original modal)
  if (existingDeployment?.server) {
    baseServingRuntime = existingDeployment.server;
  } else {
    // PRIORITY 2: Fetch template for new deployments (same as original modal)
    const templateName = await fetchNIMTemplateName(dashboardNamespace);

    if (templateName) {
      const nimTemplate = await fetchNIMTemplate(dashboardNamespace, templateName);
      if (nimTemplate) {
        baseServingRuntime = convertTemplateToServingRuntime(nimTemplate);
      }
    }
  }

  // If we still don't have a serving runtime, we can't proceed
  // This matches the original modal's behavior where submit would be disabled
  if (!baseServingRuntime) {
    throw new Error(
      'NIM serving runtime template not found. Please ensure the NIM operator is properly configured, ' +
        'or contact your administrator to set up NIM support for this cluster.',
    );
  }

  // ========================================================================
  // STEP 3: DETERMINE RESOURCE NAMES
  // ========================================================================

  const k8sName = wizardData.k8sNameDesc.data.k8sName.value;
  const displayName = wizardData.k8sNameDesc.data.name;
  const { description } = wizardData.k8sNameDesc.data;

  // Serving runtime name: use existing or generate with nim- prefix
  const servingRuntimeName =
    existingDeployment?.server?.metadata.name ||
    translateDisplayNameForK8s(displayName || k8sName, { safeK8sPrefix: 'nim-' });

  // PVC name: generate unique ID for new, or use existing name
  const pvcName = nimPvcMode === 'create-new' ? getUniqueId('nim-pvc') : nimExistingPvcName || '';

  // Model path: use specified path for existing PVC, or default for new
  const modelPath =
    nimPvcMode === 'use-existing' ? nimModelPath || DEFAULT_MODEL_PATH : DEFAULT_MODEL_PATH;

  // ========================================================================
  // STEP 4: CONFIGURE SERVING RUNTIME
  // ========================================================================

  // For new deployments, configure the runtime with PVC information
  // For edit mode, the baseServingRuntime is already the existing one
  const configuredServingRuntime = !existingDeployment
    ? configureNIMServingRuntime(baseServingRuntime, pvcName, nimPvcSubPath)
    : baseServingRuntime;

  // Assemble the final serving runtime with hardware profile and env vars
  const finalServingRuntime = assembleNIMServingRuntime(
    {
      projectName,
      k8sName: servingRuntimeName,
      displayName,
      description,
      hardwareProfile: wizardData.hardwareProfileConfig.formData,
      modelLocationData,
      replicas: wizardData.numReplicas.data,
      runtimeArgs: wizardData.runtimeArgs.data,
      environmentVariables: wizardData.environmentVariables.data,
      servingRuntime: configuredServingRuntime,
      servingRuntimeName,
      pvcName,
      modelPath,
    },
    existingDeployment?.server,
  );

  // ========================================================================
  // STEP 5: ASSEMBLE INFERENCE SERVICE
  // ========================================================================

  const inferenceService = assembleNIMInferenceService(
    {
      projectName,
      k8sName,
      displayName,
      description,
      hardwareProfile: wizardData.hardwareProfileConfig.formData,
      modelLocationData,
      replicas: wizardData.numReplicas.data,
      runtimeArgs: wizardData.runtimeArgs.data,
      environmentVariables: wizardData.environmentVariables.data,
      servingRuntime: finalServingRuntime,
      servingRuntimeName,
      pvcName,
      modelPath,
    },
    existingDeployment?.model,
    initialWizardData?.transformData,
  );

  // ========================================================================
  // STEP 6: DRY RUN VALIDATION
  // ========================================================================

  if (!dryRun) {
    await Promise.all([
      existingDeployment?.server
        ? Promise.resolve()
        : createServingRuntime(finalServingRuntime, { dryRun: true }),
      existingDeployment?.model
        ? Promise.resolve()
        : createInferenceService(inferenceService, { dryRun: true }),
    ]);
  }

  // ========================================================================
  // STEP 7: DEPLOY RESOURCES
  // ========================================================================

  const deploymentPromises: Promise<unknown>[] = [];

  // Deploy ServingRuntime
  if (existingDeployment?.server) {
    deploymentPromises.push(
      overwrite
        ? patchServingRuntime(existingDeployment.server, finalServingRuntime, { dryRun })
        : updateServingRuntime(finalServingRuntime, { dryRun }),
    );
  } else {
    deploymentPromises.push(createServingRuntime(finalServingRuntime, { dryRun }));
  }

  // Deploy InferenceService
  if (existingDeployment?.model) {
    deploymentPromises.push(
      overwrite
        ? patchInferenceService(existingDeployment.model, inferenceService, { dryRun })
        : updateInferenceService(inferenceService, { dryRun }),
    );
  } else {
    deploymentPromises.push(createInferenceService(inferenceService, { dryRun }));
  }

  // ========================================================================
  // STEP 8: HANDLE SECRETS & PVC (NEW DEPLOYMENTS ONLY)
  // ========================================================================

  if (!existingDeployment && !dryRun) {
    // Create NIM API key secret if needed
    if (await isSecretNeeded(projectName, NIM_SECRET_NAME)) {
      deploymentPromises.push(createNIMAPISecret(projectName, { dryRun }));
    }

    // Create NGC pull secret if needed
    if (await isSecretNeeded(projectName, NIM_NGC_SECRET_NAME)) {
      deploymentPromises.push(createNGCPullSecret(projectName, { dryRun }));
    }

    // Create PVC if in create-new mode
    if (nimPvcMode === 'create-new' && nimPvcSize) {
      deploymentPromises.push(
        handleNIMPVC(projectName, pvcName, nimPvcSize, nimStorageClassName || '', undefined, {
          dryRun,
        }),
      );
    }
  }
  // ========================================================================
  // STEP 9: HANDLE PVC UPDATE (EDIT MODE)
  // ========================================================================
  else if (existingDeployment && nimPvcSize) {
    // Note: In edit mode, existing PVC should be passed in via a future parameter
    // For now, we'll skip PVC updates in edit mode
    // TODO: Add existingPVC to InitialWizardFormData or pass as separate parameter
  }

  // ========================================================================
  // STEP 10: EXECUTE ALL DEPLOYMENTS
  // ========================================================================

  await Promise.all(deploymentPromises);

  // ========================================================================
  // STEP 11: RESTART IF STOPPED (EDIT MODE)
  // ========================================================================

  if (existingDeployment?.model && !dryRun) {
    await patchInferenceServiceStoppedStatus(existingDeployment.model, 'false');
  }

  // ========================================================================
  // STEP 12: RETURN DEPLOYMENT
  // ========================================================================

  return {
    modelServingPlatformId: NIM_SERVING_ID,
    model: inferenceService,
    server: finalServingRuntime,
  };
};
