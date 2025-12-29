import React from 'react';
import {
  FormGroup,
  TextInput,
  Radio,
  HelperText,
  HelperTextItem,
  Stack,
  StackItem,
} from '@patternfly/react-core';

type NIMAPIKeyFieldProps = {
  apiKey: string;
  setApiKey: (key: string) => void;
};

/**
 * Component for entering or selecting NVIDIA API key
 * Allows users to enter a new API key or reuse an existing one from the project
 */
export const NIMAPIKeyField: React.FC<NIMAPIKeyFieldProps> = ({ apiKey, setApiKey }) => {
  const [mode, setMode] = React.useState<'new' | 'existing'>('new');

  // TODO: Implement useProjectNIMAPIKeys hook to fetch existing keys
  // const existingKeys = useProjectNIMAPIKeys(projectName);
  const existingKeys: string[] = []; // Placeholder

  return (
    <FormGroup label="NVIDIA API Key" isRequired>
      <Stack hasGutter>
        <StackItem>
          <Radio
            id="nim-api-key-new"
            name="nim-api-key-mode"
            label="Enter new API key"
            isChecked={mode === 'new'}
            onChange={() => setMode('new')}
            body={
              mode === 'new' && (
                <TextInput
                  id="nim-api-key-input"
                  type="password"
                  value={apiKey}
                  onChange={(_event, value) => setApiKey(value)}
                  placeholder="nvapi-xxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  aria-label="NVIDIA API key"
                />
              )
            }
          />
        </StackItem>

        {existingKeys.length > 0 && (
          <StackItem>
            <Radio
              id="nim-api-key-existing"
              name="nim-api-key-mode"
              label="Use existing API key from this project"
              isChecked={mode === 'existing'}
              onChange={() => setMode('existing')}
              isDisabled={existingKeys.length === 0}
            />
          </StackItem>
        )}

        <StackItem>
          <HelperText>
            <HelperTextItem>
              Your NVIDIA API key is used to validate access and fetch available models from the
              NVIDIA catalog. The key will be stored securely in this project only.
            </HelperTextItem>
            <HelperTextItem>
              You can obtain an API key from{' '}
              <a
                href="https://org.ngc.nvidia.com/setup/api-key"
                target="_blank"
                rel="noopener noreferrer"
              >
                NVIDIA NGC
              </a>
              .
            </HelperTextItem>
          </HelperText>
        </StackItem>
      </Stack>
    </FormGroup>
  );
};
