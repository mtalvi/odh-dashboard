import React from 'react';
import { Form, FormSection, FormGroup, Alert } from '@patternfly/react-core';
import K8sNameDescriptionField from '@odh-dashboard/internal/concepts/k8s/K8sNameDescriptionField/K8sNameDescriptionField';
import { UseModelDeploymentWizardState } from '../useDeploymentWizard';
import ProjectSection from '../fields/ProjectSection';
import { ModelServingHardwareProfileSection } from '../fields/ModelServingHardwareProfileSection';
import { ModelFormatField } from '../fields/ModelFormatField';
import { NumReplicasField } from '../fields/NumReplicasField';
import ModelServerTemplateSelectField from '../fields/ModelServerTemplateSelectField';
import { ModelLocationType } from '../types';
import NIMPVCSizeSectionWrapper, {
  type PVCMode,
} from '../fields/nimFields/NIMPVCSizeSectionWrapper';

type ModelDeploymentStepProps = {
  projectName?: string;
  wizardState: UseModelDeploymentWizardState;
};

export const ModelDeploymentStepContent: React.FC<ModelDeploymentStepProps> = ({
  projectName,
  wizardState,
}) => {
  const isNIM = wizardState.state.modelLocationData.data?.type === ModelLocationType.NIM;
  const nimModelName =
    wizardState.state.modelLocationData.data?.additionalFields.nimModel?.displayName;

  // Auto-set model server for NIM (required for validation)
  React.useEffect(() => {
    if (isNIM && !wizardState.state.modelServer.data) {
      wizardState.state.modelServer.setData({
        name: 'nvidia-nim-runtime',
        label: 'NVIDIA NIM',
      });
    }
  }, [isNIM, wizardState.state.modelServer]);

  // NIM PVC state management - using real component state
  const [pvcSize, setPvcSize] = React.useState(
    wizardState.state.modelLocationData.data?.additionalFields.nimPvcSize || '30Gi',
  );
  const defaultPvcMode: PVCMode = 'create-new';
  const storedPvcMode = wizardState.state.modelLocationData.data?.additionalFields.nimPvcMode;
  const isPvcMode = (value: unknown): value is PVCMode =>
    value === 'create-new' || value === 'use-existing';
  const [pvcMode, setPvcMode] = React.useState<PVCMode>(
    isPvcMode(storedPvcMode) ? storedPvcMode : defaultPvcMode,
  );
  const [existingPvcName, setExistingPvcName] = React.useState(
    wizardState.state.modelLocationData.data?.additionalFields.nimExistingPvcName || '',
  );
  const [modelPath, setModelPath] = React.useState(
    wizardState.state.modelLocationData.data?.additionalFields.nimModelPath || '/mnt/models/cache',
  );
  const [pvcSubPath, setPvcSubPath] = React.useState(
    wizardState.state.modelLocationData.data?.additionalFields.nimPvcSubPath || '',
  );

  // Update wizard state when PVC config changes
  React.useEffect(() => {
    if (isNIM) {
      const currentData = wizardState.state.modelLocationData.data;
      if (currentData) {
        wizardState.state.modelLocationData.setData({
          ...currentData,
          additionalFields: {
            ...currentData.additionalFields,
            nimPvcMode: pvcMode,
            nimPvcSize: pvcSize,
            nimExistingPvcName: existingPvcName,
            nimModelPath: modelPath,
            nimPvcSubPath: pvcSubPath,
          },
        });
      }
    }
  }, [
    isNIM,
    pvcMode,
    pvcSize,
    existingPvcName,
    modelPath,
    pvcSubPath,
    wizardState.state.modelLocationData,
  ]);

  return (
    <Form>
      <FormSection title="Model deployment">
        <ProjectSection
          initialProjectName={wizardState.state.project.initialProjectName}
          projectName={wizardState.state.project.projectName}
          setProjectName={wizardState.state.project.setProjectName}
        />
        <K8sNameDescriptionField
          data={wizardState.state.k8sNameDesc.data}
          onDataChange={wizardState.state.k8sNameDesc.onDataChange}
          dataTestId="model-deployment"
          nameLabel="Model deployment name"
          nameHelperTextAbove="Name this deployment. This name is also used for the inference service created when the model is deployed."
        />
        <ModelServingHardwareProfileSection
          project={projectName}
          hardwareProfileConfig={wizardState.state.hardwareProfileConfig}
          isEditing={wizardState.initialData?.isEditing}
        />
        {/* Hide model format field for NIM */}
        {wizardState.state.modelFormatState.isVisible && !isNIM && (
          <ModelFormatField
            modelFormatState={wizardState.state.modelFormatState}
            isEditing={wizardState.initialData?.isEditing}
          />
        )}
        {/* For NIM, show info alert instead of serving runtime dropdown */}
        {isNIM ? (
          <FormGroup label="Serving runtime" fieldId="nim-serving-runtime-info">
            <Alert
              variant="info"
              isInline
              isPlain
              title={`Using NVIDIA NIM runtime${
                nimModelName ? ` (configured for ${nimModelName})` : ''
              }`}
            />
          </FormGroup>
        ) : (
          <ModelServerTemplateSelectField
            modelServerState={wizardState.state.modelServer}
            hardwareProfile={wizardState.state.hardwareProfileConfig.formData.selectedProfile}
            isEditing={wizardState.initialData?.isEditing && !!wizardState.initialData.modelServer}
          />
        )}
        <NumReplicasField replicaState={wizardState.state.numReplicas} />
        {/* NIM PVC Configuration Section - Using Real Component */}
        {isNIM && (
          <NIMPVCSizeSectionWrapper
            pvcSize={pvcSize}
            setPvcSize={setPvcSize}
            pvcMode={pvcMode}
            setPvcMode={setPvcMode}
            existingPvcName={existingPvcName}
            setExistingPvcName={setExistingPvcName}
            modelPath={modelPath}
            setModelPath={setModelPath}
            pvcSubPath={pvcSubPath}
            setPvcSubPath={setPvcSubPath}
            isEditing={wizardState.initialData?.isEditing}
            selectedModel={
              wizardState.state.modelLocationData.data?.additionalFields.nimModel?.name
            }
            namespace={wizardState.state.project.projectName}
          />
        )}
      </FormSection>
    </Form>
  );
};
