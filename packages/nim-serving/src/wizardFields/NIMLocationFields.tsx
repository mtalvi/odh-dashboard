import React from 'react';
import { Stack, StackItem } from '@patternfly/react-core';
import type { ModelLocationData } from '@odh-dashboard/model-serving/types';
import { ModelLocationType } from '@odh-dashboard/model-serving/types';
import type { PersistentVolumeClaimKind } from '@odh-dashboard/internal/k8sTypes';
import { NIMAPIKeyField } from './NIMAPIKeyField';
import { NIMModelSelector } from './NIMModelSelector';
import { NIMPVCSelector } from './NIMPVCSelector';
import { NIMStorageFields } from './NIMStorageFields';

type NIMLocationFieldsProps = {
  modelLocationData?: ModelLocationData;
  setModelLocationData: (data: ModelLocationData) => void;
  pvcs?: PersistentVolumeClaimKind[];
  projectName?: string;
};

/**
 * Main component that orchestrates all NIM-specific wizard fields
 * Manages state coordination between API key, model selection, and storage configuration
 */
export const NIMLocationFields: React.FC<NIMLocationFieldsProps> = ({
  modelLocationData,
  setModelLocationData,
  pvcs = [],
  projectName,
}) => {
  const nimData = modelLocationData?.additionalFields.nimData;

  // Helper function to update nimData while preserving other fields
  const updateNimData = (updates: Partial<typeof nimData>) => {
    setModelLocationData({
      type: ModelLocationType.NIM,
      fieldValues: modelLocationData?.fieldValues || {},
      additionalFields: {
        ...modelLocationData?.additionalFields,
        nimData: {
          selectedModel: nimData?.selectedModel || '',
          modelVersion: nimData?.modelVersion || '',
          apiKey: nimData?.apiKey || '',
          pvcMode: nimData?.pvcMode || 'create-new',
          existingPvcName: nimData?.existingPvcName,
          pvcSize: nimData?.pvcSize || '30Gi',
          storageClassName: nimData?.storageClassName || '',
          ...updates,
        },
      },
    });
  };

  return (
    <Stack hasGutter>
      {/* Step 1: API Key */}
      <StackItem>
        <NIMAPIKeyField
          apiKey={nimData?.apiKey || ''}
          setApiKey={(key) => updateNimData({ apiKey: key })}
          projectName={projectName}
        />
      </StackItem>

      {/* Step 2: Model Selection */}
      <StackItem>
        <NIMModelSelector
          apiKey={nimData?.apiKey || ''}
          selectedModel={nimData?.selectedModel}
          selectedVersion={nimData?.modelVersion}
          setSelectedModel={(model, version) =>
            updateNimData({ selectedModel: model, modelVersion: version })
          }
        />
      </StackItem>

      {/* Step 3: PVC Mode Selection */}
      <StackItem>
        <NIMPVCSelector
          pvcMode={nimData?.pvcMode || 'create-new'}
          setPvcMode={(mode) => updateNimData({ pvcMode: mode })}
          existingPvcName={nimData?.existingPvcName}
          setExistingPvcName={(name) => updateNimData({ existingPvcName: name })}
          selectedModel={nimData?.selectedModel}
          namespace={projectName}
          pvcs={pvcs}
        />
      </StackItem>

      {/* Step 4: Storage Configuration (only for create-new mode) */}
      {nimData?.pvcMode === 'create-new' && (
        <StackItem>
          <NIMStorageFields
            pvcSize={nimData.pvcSize || '30Gi'}
            setPvcSize={(size) => updateNimData({ pvcSize: size })}
            storageClassName={nimData.storageClassName || ''}
            setStorageClassName={(name) => updateNimData({ storageClassName: name })}
          />
        </StackItem>
      )}
    </Stack>
  );
};
