import React from 'react';
import {
  FormGroup,
  TextInput,
  FormHelperText,
  HelperText,
  HelperTextItem,
  ValidatedOptions,
} from '@patternfly/react-core';

type NIMAPIKeyFieldProps = {
  apiKey: string;
  setApiKey: (key: string) => void;
  isDisabled?: boolean;
};

export const NIMAPIKeyField: React.FC<NIMAPIKeyFieldProps> = ({
  apiKey,
  setApiKey,
  isDisabled = false,
}) => {
  const [validated, setValidated] = React.useState<ValidatedOptions>(ValidatedOptions.default);
  const [helperText, setHelperText] = React.useState<string>('');

  React.useEffect(() => {
    if (!apiKey) {
      setValidated(ValidatedOptions.default);
      setHelperText('');
      return;
    }

    // Basic format validation for demo
    if (apiKey.startsWith('nvapi-') && apiKey.length > 10) {
      setValidated(ValidatedOptions.success);
      setHelperText('API key format looks valid');
    } else {
      setValidated(ValidatedOptions.warning);
      setHelperText('API key should start with "nvapi-"');
    }
  }, [apiKey]);

  return (
    <FormGroup label="NVIDIA API Key" fieldId="nim-api-key" isRequired>
      <TextInput
        id="nim-api-key"
        data-testid="nim-api-key-input"
        type="password"
        value={apiKey}
        onChange={(_event, value) => setApiKey(value)}
        validated={validated}
        isDisabled={isDisabled}
        placeholder="nvapi-..."
      />
      <FormHelperText>
        <HelperText>
          <HelperTextItem variant={validated === ValidatedOptions.warning ? 'warning' : 'default'}>
            {helperText || 'Enter your NVIDIA NGC API key to access NIM models'}
          </HelperTextItem>
          <HelperTextItem>Personal API keys are recommended for production use</HelperTextItem>
        </HelperText>
      </FormHelperText>
    </FormGroup>
  );
};
