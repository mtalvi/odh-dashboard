import React from 'react';
import { Stack, StackItem, Button, Alert, AlertVariant } from '@patternfly/react-core';
import { NIMAPIKeyField } from './NIMAPIKeyField';
import { NIMKeyValidationAlert, useNIMKeyValidation } from './NIMOperatorProgress';
import NIMModelListSectionWrapper from './NIMModelListSectionWrapper';
import { ModelLocationData, ModelLocationType } from '../../types';

// Toggle this to simulate disconnected (air-gapped) mode.
// Maps to OdhDashboardConfig.spec.nimConfig.disconnected.disableKeyCollection
const DISABLE_KEY_COLLECTION = false;

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

  const validation = useNIMKeyValidation(apiKey, hasStartedValidation);

  const isApiKeyEntered = apiKey.length > 0;
  const showModelList = DISABLE_KEY_COLLECTION || validation.isComplete;

  const handleModelSelection = React.useCallback(
    (modelName: string, modelDisplayName?: string, version?: string) => {
      setModelLocationData({
        type: ModelLocationType.NIM,
        fieldValues: {},
        additionalFields: {
          nimApiKey: DISABLE_KEY_COLLECTION ? '' : apiKey,
          nimModel: modelName
            ? {
                name: modelName,
                displayName: modelDisplayName || modelName,
                version: version || '1',
              }
            : undefined,
          nimOperatorReady: showModelList,
        },
      });
    },
    [apiKey, showModelList, setModelLocationData],
  );

  React.useEffect(() => {
    if (validation.isComplete) {
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
  }, [validation.isComplete, apiKey, modelLocationData, setModelLocationData]);

  return (
    <Stack hasGutter>
      {DISABLE_KEY_COLLECTION ? (
        <StackItem>
          <Alert
            variant={AlertVariant.info}
            isInline
            title="Disconnected mode"
            data-testid="nim-disconnected-mode"
          >
            API key collection is disabled. Image pulling relies on the cluster&apos;s global pull
            secret and ImageTagMirrorSet configuration.
          </Alert>
        </StackItem>
      ) : (
        <>
          <StackItem>
            <NIMAPIKeyField
              apiKey={apiKey}
              setApiKey={(key) => {
                setApiKey(key);
                setHasStartedValidation(false);
              }}
              isDisabled={modelLocationData?.disableInputFields || validation.isProcessing}
            />
          </StackItem>

          {isApiKeyEntered && !hasStartedValidation && (
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

          {hasStartedValidation && (
            <StackItem>
              <NIMKeyValidationAlert status={validation.status} error={validation.error} />
            </StackItem>
          )}

          {validation.status === 'invalid' && (
            <StackItem>
              <Button
                variant="secondary"
                onClick={() => setHasStartedValidation(false)}
                data-testid="retry-nim-key-button"
              >
                Try a different key
              </Button>
            </StackItem>
          )}
        </>
      )}

      {showModelList && (
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
