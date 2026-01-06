import type {
  ModelServingDeploy,
  ModelServingDeploymentFormDataExtension,
} from '@odh-dashboard/model-serving/extension-points';
import type { AreaExtension } from '@odh-dashboard/plugin-core/extension-points';
// eslint-disable-next-line no-restricted-syntax
import type { SupportedArea } from '@odh-dashboard/internal/concepts/areas/types';
// eslint-disable-next-line no-restricted-syntax
import type { HardwareProfilePathways } from '@odh-dashboard/internal/concepts/hardwareProfiles/const';
import type { NIMDeployment } from '../src/types';
import { NIM_SERVING_ID } from '../src/types';

const extensions: (
  | AreaExtension
  | ModelServingDeploy<NIMDeployment>
  | ModelServingDeploymentFormDataExtension<NIMDeployment>
)[] = [
  {
    type: 'app.area',
    properties: {
      id: NIM_SERVING_ID,
      reliantAreas: [
        (() =>
          import('@odh-dashboard/internal/concepts/areas/types').then(
            (m) => m.SupportedArea.K_SERVE,
          ))() as unknown as SupportedArea,
      ],
    },
  },
  {
    type: 'model-serving.deployment/deploy',
    properties: {
      platform: NIM_SERVING_ID,
      priority: 150,
      supportsOverwrite: true,
      isActive: () => import('../src/deployments/deployUtils').then((m) => m.isNIMDeployActive),
      deploy: () => import('../src/deployments/deployUtils').then((m) => m.deployNIMDeployment),
    },
    flags: {
      required: [NIM_SERVING_ID],
    },
  },
  {
    type: 'model-serving.deployment/form-data',
    properties: {
      platform: NIM_SERVING_ID,
      hardwareProfilePaths: () =>
        import('@odh-dashboard/internal/concepts/hardwareProfiles/const').then(
          (m) => m.INFERENCE_SERVICE_HARDWARE_PROFILE_PATHS as HardwareProfilePathways,
        ),
      extractHardwareProfileConfig: () =>
        import('../src/deployments/formData').then((m) => m.extractHardwareProfileConfig),
      extractModelFormat: () =>
        import('../src/deployments/formData').then((m) => m.extractModelFormat),
      extractReplicas: () => import('../src/deployments/formData').then((m) => m.extractReplicas),
      extractRuntimeArgs: () =>
        import('../src/deployments/formData').then((m) => m.extractRuntimeArgs),
      extractEnvironmentVariables: () =>
        import('../src/deployments/formData').then((m) => m.extractEnvironmentVariables),
      extractModelAvailabilityData: () =>
        import('../src/deployments/formData').then((m) => m.extractModelAvailabilityData),
      extractModelLocationData: () =>
        import('../src/deployments/formData').then((m) => m.extractModelLocationData),
      extractDeploymentStrategy: () =>
        import('../src/deployments/formData').then((m) => m.extractDeploymentStrategy),
      extractModelServerTemplate: () =>
        import('../src/deployments/formData').then((m) => m.extractModelServerTemplate),
    },
    flags: {
      required: [NIM_SERVING_ID],
    },
  },
];

export default extensions;
