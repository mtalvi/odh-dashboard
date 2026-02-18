import React from 'react';
import {
  FormGroup,
  TextInput,
  Button,
  Spinner,
  Alert,
  InputGroup,
  InputGroupItem,
  HelperText,
  HelperTextItem,
} from '@patternfly/react-core';
import { ExclamationCircleIcon, CheckCircleIcon } from '@patternfly/react-icons';

type ValidationStatus = 'idle' | 'validating' | 'valid' | 'invalid';

type NimApiKeyFieldProps = {
  value?: string;
  onChange: (value: string) => void;
  onValidationChange?: (isValid: boolean) => void;
  disabled?: boolean;
};

export const NimApiKeyField: React.FC<NimApiKeyFieldProps> = ({
  value = '',
  onChange,
  onValidationChange,
  disabled = false,
}) => {
  const [validationStatus, setValidationStatus] = React.useState<ValidationStatus>('idle');
  const [errorMessage, setErrorMessage] = React.useState<string>('');

  const validateApiKey = async () => {
    if (!value || !value.trim()) {
      setErrorMessage('API key is required');
      setValidationStatus('invalid');
      onValidationChange?.(false);
      return;
    }

    if (!value.startsWith('nvapi-')) {
      setErrorMessage('Only personal API keys (starting with "nvapi-") are supported');
      setValidationStatus('invalid');
      onValidationChange?.(false);
      return;
    }

    setValidationStatus('validating');
    setErrorMessage('');

    try {
      const response = await fetch('/api/nim-serving/validate-key', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ apiKey: value }),
      });

      const data = await response.json();

      if (data.valid) {
        setValidationStatus('valid');
        onValidationChange?.(true);
      } else {
        setValidationStatus('invalid');
        setErrorMessage(data.error || 'Invalid API key');
        onValidationChange?.(false);
      }
    } catch (error) {
      setValidationStatus('invalid');
      setErrorMessage('Failed to validate API key. Please try again.');
      onValidationChange?.(false);
    }
  };

  const handleKeyChange = (newValue: string) => {
    onChange(newValue);
    // Reset validation when key changes
    if (validationStatus !== 'idle') {
      setValidationStatus('idle');
      setErrorMessage('');
      onValidationChange?.(false);
    }
  };

  return (
    <>
      <FormGroup label="NVIDIA API Key" isRequired fieldId="nim-api-key">
        <InputGroup>
          <InputGroupItem isFill>
            <TextInput
              id="nim-api-key"
              type="password"
              value={value}
              onChange={(_event, newValue) => handleKeyChange(newValue)}
              placeholder="nvapi-..."
              isDisabled={disabled}
              validated={
                validationStatus === 'invalid'
                  ? 'error'
                  : validationStatus === 'valid'
                    ? 'success'
                    : 'default'
              }
            />
          </InputGroupItem>
          <InputGroupItem>
            <Button
              variant="control"
              onClick={validateApiKey}
              isDisabled={!value || validationStatus === 'validating' || disabled}
            >
              {validationStatus === 'validating' ? (
                <>
                  <Spinner size="sm" /> Validating...
                </>
              ) : (
                'Validate'
              )}
            </Button>
          </InputGroupItem>
        </InputGroup>
        <HelperText>
          <HelperTextItem variant={validationStatus === 'invalid' ? 'error' : 'default'}>
            {validationStatus === 'valid' && (
              <>
                <CheckCircleIcon color="green" /> API key is valid
              </>
            )}
            {validationStatus === 'invalid' && (
              <>
                <ExclamationCircleIcon /> {errorMessage}
              </>
            )}
            {validationStatus === 'idle' && 'Enter your personal NVIDIA API key (nvapi-...)'}
          </HelperTextItem>
        </HelperText>
      </FormGroup>
      {validationStatus === 'idle' && (
        <Alert
          variant="info"
          isInline
          title="API Key Requirements"
          style={{ marginBottom: '16px' }}
        >
          <p>
            You need a personal NVIDIA API key to deploy NIM models. Personal keys start with
            "nvapi-".
          </p>
          <p>
            <a
              href="https://org.ngc.nvidia.com/setup/api-key"
              target="_blank"
              rel="noopener noreferrer"
            >
              Get your API key from NVIDIA NGC
            </a>
          </p>
        </Alert>
      )}
    </>
  );
};
