import * as React from 'react';
import { Button, Tooltip } from '@patternfly/react-core';
import { useParams } from 'react-router-dom';
import { useNavigateToDeploymentWizard } from '@odh-dashboard/model-serving/components/deploymentWizard/useNavigateToDeploymentWizard';
import { ModelServingContext } from '#~/pages/modelServing/ModelServingContext';
import {
  getSortedTemplates,
  getTemplateEnabled,
} from '#~/pages/modelServing/customServingRuntimes/utils';
import { byName, ProjectsContext } from '#~/concepts/projects/ProjectsContext';
import { isProjectNIMSupported } from '#~/pages/modelServing/screens/projects/nimUtils';
import useServingPlatformStatuses from '#~/pages/modelServing/useServingPlatformStatuses';
import { useKueueConfiguration } from '#~/concepts/hardwareProfiles/kueueUtils';
import { KUEUE_MODEL_DEPLOYMENT_DISABLED_MESSAGE } from '#~/concepts/hardwareProfiles/kueueConstants';

const ServeModelButton: React.FC = () => {
  const {
    servingRuntimeTemplates: [templates],
    servingRuntimeTemplateOrder: { data: templateOrder },
    servingRuntimeTemplateDisablement: { data: templateDisablement },
  } = React.useContext(ModelServingContext);
  const { projects } = React.useContext(ProjectsContext);
  const { namespace } = useParams<{ namespace: string }>();
  const servingPlatformStatuses = useServingPlatformStatuses();
  const isNIMAvailable = servingPlatformStatuses.kServeNIM.enabled;

  const project = projects.find(byName(namespace));

  const { isKueueDisabled } = useKueueConfiguration(project);

  // Use wizard navigation for deployments
  const navigateToWizard = useNavigateToDeploymentWizard();

  const templatesSorted = getSortedTemplates(templates, templateOrder);
  const templatesEnabled = templatesSorted.filter((template) =>
    getTemplateEnabled(template, templateDisablement),
  );
  const isKServeNIMEnabled = !!project && isProjectNIMSupported(project);

  const deployButton = (
    <Button
      data-testid="deploy-button"
      variant="primary"
      onClick={() => {
        if (project?.metadata.name) {
          navigateToWizard(project.metadata.name);
        }
      }}
      isAriaDisabled={
        !project ||
        templatesEnabled.length === 0 ||
        (!isNIMAvailable && isKServeNIMEnabled) ||
        isKueueDisabled
      }
    >
      Deploy model
    </Button>
  );

  if (!project) {
    return (
      <Tooltip data-testid="deploy-model-tooltip" content="To deploy a model, select a project.">
        {deployButton}
      </Tooltip>
    );
  }

  if (!isNIMAvailable && isKServeNIMEnabled) {
    return (
      <Tooltip content="NIM is not available. Contact your administrator.">{deployButton}</Tooltip>
    );
  }

  if (isKueueDisabled) {
    return <Tooltip content={KUEUE_MODEL_DEPLOYMENT_DISABLED_MESSAGE}>{deployButton}</Tooltip>;
  }

  return deployButton;
};

export default ServeModelButton;
