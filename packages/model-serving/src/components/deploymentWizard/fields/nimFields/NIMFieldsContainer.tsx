import React from 'react';
import { Stack, StackItem, Button } from '@patternfly/react-core';
import { NIMAPIKeyField } from './NIMAPIKeyField';
import { NIMOperatorProgress, useNIMOperatorProgress } from './NIMOperatorProgress';
import NIMModelListSectionWrapper from './NIMModelListSectionWrapper';
import { ModelLocationData, ModelLocationType } from '../../types';

type NIMFieldsContainerProps = {
  modelLocationData?: ModelLocationData;
  setModelLocationData: (data: ModelLocationData) => void;
};

export const NIMFieldsContainer: React.FC<NIMFieldsContainerProps> = ({
  modelLocationData,
  setModelLocationData,
}) => {
  const [apiKey, setApiKey] = React.useState(modelLocationData?.additionalFields.nimApiKey || '');
  const [hasStartedValidation, setHasStartedValidation] = React.useState(false);

  const operatorProgress = useNIMOperatorProgress(apiKey, hasStartedValidation);

  // Check if API key looks valid (basic format check)
  const isApiKeyValid = apiKey.startsWith('nvapi-') && apiKey.length > 10;

  // Handle model selection from NIMModelListSection
  const handleModelSelection = React.useCallback(
    (modelName: string, modelDisplayName?: string) => {
      setModelLocationData({
        type: ModelLocationType.NIM,
        fieldValues: {},
        additionalFields: {
          nimApiKey: apiKey,
          nimModel: modelName
            ? {
                name: modelName,
                displayName: modelDisplayName || modelName,
                version: '1', // Will be updated by real component
              }
            : undefined,
          nimOperatorReady: operatorProgress.isComplete,
        },
      });
    },
    [apiKey, operatorProgress.isComplete, setModelLocationData],
  );

  // Update parent state when operator completes
  React.useEffect(() => {
    if (operatorProgress.isComplete) {
      const currentData = modelLocationData;
      if (currentData) {
        setModelLocationData({
          ...currentData,
          additionalFields: {
            ...currentData.additionalFields,
            nimApiKey: apiKey,
            nimOperatorReady: true,
          },
        });
      }
    }
  }, [operatorProgress.isComplete, apiKey, modelLocationData, setModelLocationData]);

  return (
    <Stack hasGutter>
      <StackItem>
        <NIMAPIKeyField
          apiKey={apiKey}
          setApiKey={setApiKey}
          isDisabled={modelLocationData?.disableInputFields || operatorProgress.isProcessing}
        />
      </StackItem>

      {isApiKeyValid && !hasStartedValidation && !operatorProgress.isProcessing && (
        <StackItem>
          <Button
            variant="primary"
            onClick={() => setHasStartedValidation(true)}
            data-testid="validate-nim-key-button"
          >
            Validate API key
          </Button>
        </StackItem>
      )}

      {/* Show 40-second progress animation */}
      {hasStartedValidation && !operatorProgress.isComplete && (
        <StackItem>
          <NIMOperatorProgress
            currentStep={operatorProgress.currentStep}
            modelsDiscovered={operatorProgress.modelsDiscovered}
            modelsFetched={operatorProgress.modelsFetched}
            totalModels={operatorProgress.totalModels}
            error={operatorProgress.error}
          />
        </StackItem>
      )}

      {/* Show real model list after operator completes */}
      {operatorProgress.isComplete && (
        <StackItem>
          <NIMModelListSectionWrapper
            selectedModelName={modelLocationData?.additionalFields.nimModel?.name}
            onModelSelect={handleModelSelection}
            isDisabled={modelLocationData?.disableInputFields}
          />
        </StackItem>
      )}
    </Stack>
  );
};
