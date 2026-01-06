import type { WizardFormData } from '@odh-dashboard/model-serving/types/form-data';
import { ModelLocationType } from '@odh-dashboard/model-serving/types/form-data';

/**
 * Determines if NIM deployment should be active based on wizard state
 */
export const isNIMDeployActive = (wizardData: WizardFormData['state']): boolean => {
  return wizardData.modelLocationData.data?.type === ModelLocationType.NIM;
};

/**
 * Validates NIM-specific requirements before deployment
 */
export const validateNIMDeployment = (wizardData: WizardFormData['state']): boolean => {
  const { modelLocationData } = wizardData;

  if (!modelLocationData.data || modelLocationData.data.type !== ModelLocationType.NIM) {
    return false;
  }

  const { additionalFields } = modelLocationData.data;

  // Validate model selection
  if (!additionalFields.nimModel) {
    return false;
  }

  // Validate PVC configuration
  const { nimPvcMode, nimPvcSize, nimExistingPvcName, nimModelPath } = additionalFields;

  if (nimPvcMode === 'create-new') {
    return !!nimPvcSize;
  }
  if (nimPvcMode === 'use-existing') {
    return !!nimExistingPvcName && !!nimModelPath;
  }

  return false;
};

// Re-export the main deployment function
export { deployNIMDeployment } from './deploy';
