import type { WizardFormData } from '@odh-dashboard/model-serving/types';
import { ModelLocationType } from '@odh-dashboard/model-serving/types';

/**
 * Determines if NIM deployment should be active based on wizard state
 * Returns true when user has selected NIM as the model location type
 */
export const isNIMDeployActive = (wizardState: WizardFormData['state']): boolean => {
  const modelLocation = wizardState.modelLocationData.data;
  return modelLocation?.type === ModelLocationType.NIM;
};
