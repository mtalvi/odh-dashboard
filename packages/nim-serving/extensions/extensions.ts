import type {
  DeployedModelServingDetails,
  DeploymentWizardFieldExtension,
  ModelServingDeploy,
  ModelServingDeploymentFormDataExtension,
  ModelServingPlatformWatchDeploymentsExtension,
  ModelServingDeleteModal,
} from '@odh-dashboard/model-serving/extension-points';
import type { SupportedArea } from '@odh-dashboard/internal/concepts/areas/types';
import type { AreaExtension } from '@odh-dashboard/plugin-core/extension-points';
import type { NIMDeployment } from '../src/types';

export const NIM_SERVING_ID = 'nim-serving';

const extensions: (
  | AreaExtension
  | ModelServingPlatformWatchDeploymentsExtension<NIMDeployment>
  | DeployedModelServingDetails<NIMDeployment>
  | ModelServingDeploymentFormDataExtension<NIMDeployment>
  | ModelServingDeleteModal<NIMDeployment>
  | ModelServingDeploy<NIMDeployment>
  | DeploymentWizardFieldExtension<NIMDeployment>
)[] = [
  // Register NIM as a supported area
  {
    type: 'app.area',
    properties: {
      id: NIM_SERVING_ID,
      reliantAreas: [SupportedArea.K_SERVE],
    },
  },
  // Register NIM deployment method
  {
    type: 'model-serving.deployment/deploy',
    properties: {
      platform: NIM_SERVING_ID,
      priority: 90, // Lower than LLMd (100), higher than KServe (80)
      supportsOverwrite: true,
      isActive: () => import('../src/deployments/deployUtils').then((m) => m.isNIMDeployActive),
      deploy: () => import('../src/deployments/deploy').then((m) => m.deployNIMDeployment),
    },
    flags: {
      required: [NIM_SERVING_ID],
    },
  },
  // Register platform for watching deployments (placeholder)
  {
    type: 'model-serving.platform/watch-deployments',
    properties: {
      platform: NIM_SERVING_ID,
      watch: () =>
        import('../src/deployments/useWatchDeployments').then((m) => m.useWatchDeployments),
    },
    flags: {
      required: [NIM_SERVING_ID],
    },
  },
  // Register delete deployment handler (placeholder)
  {
    type: 'model-serving.platform/delete-deployment',
    properties: {
      platform: NIM_SERVING_ID,
      onDelete: () => import('../src/api/NIMDeployment').then((m) => m.deleteDeployment),
      title: 'Delete NIM deployment?',
      submitButtonLabel: 'Delete NIM deployment',
    },
    flags: {
      required: [NIM_SERVING_ID],
    },
  },
  // Register form data extraction for editing (placeholder)
  {
    type: 'model-serving.deployment/form-data',
    properties: {
      platform: NIM_SERVING_ID,
      extractModelLocationData: () =>
        import('../src/deployments/formData').then((m) => m.extractModelLocationData),
    },
    flags: {
      required: [NIM_SERVING_ID],
    },
  },
];

export default extensions;
