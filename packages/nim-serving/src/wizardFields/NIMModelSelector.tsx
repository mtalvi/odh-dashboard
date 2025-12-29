import React from 'react';
import { FormGroup, Alert, Spinner, Stack, StackItem } from '@patternfly/react-core';
// eslint-disable-next-line import/no-extraneous-dependencies -- False positive: @odh-dashboard/internal is in dependencies
import SimpleSelect, { SimpleSelectOption } from '@odh-dashboard/internal/components/SimpleSelect';
import type { NIMModel } from '../types';
import { fetchNIMModels } from '../api/fetchNIMModels';

type NIMModelSelectorProps = {
  apiKey: string;
  selectedModel?: string;
  setSelectedModel: (model: string, version: string) => void;
};

/**
 * Component for selecting NIM models from NVIDIA catalog
 * Fetches available models using the provided API key
 * Shows loading state during fetch (can take 30-90 seconds)
 */
export const NIMModelSelector: React.FC<NIMModelSelectorProps> = ({
  apiKey,
  selectedModel,
  setSelectedModel,
}) => {
  const [models, setModels] = React.useState<NIMModel[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string>();

  // Fetch models when API key changes
  React.useEffect(() => {
    if (!apiKey || apiKey.length < 10) {
      setModels([]);
      setError(undefined);
      return;
    }

    const fetchModels = async () => {
      setLoading(true);
      setError(undefined);

      try {
        const fetchedModels = await fetchNIMModels(apiKey);
        setModels(fetchedModels);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch models');
        setModels([]);
      } finally {
        setLoading(false);
      }
    };

    fetchModels();
  }, [apiKey]);

  // Show loading state
  if (loading) {
    return (
      <Alert variant="info" title="Loading NVIDIA NIM models..." isInline>
        <Stack hasGutter>
          <StackItem>
            <Spinner size="md" /> Validating your API key and fetching available models from NVIDIA
            catalog.
          </StackItem>
          <StackItem>This usually takes 30-90 seconds...</StackItem>
        </Stack>
      </Alert>
    );
  }

  // Show error state
  if (error) {
    return (
      <Alert variant="danger" title="Failed to fetch NIM models" isInline>
        {error}
      </Alert>
    );
  }

  // Show empty state when no API key
  if (!apiKey) {
    return (
      <Alert variant="info" title="API key required" isInline>
        Please enter your NVIDIA API key above to see available models.
      </Alert>
    );
  }

  // Show model selector
  const modelOptions: SimpleSelectOption[] = models.map((model) => ({
    key: model.name,
    label: model.displayName,
    description: `Available versions: ${model.versions.join(', ')}`,
  }));

  return (
    <FormGroup label="Select NIM Model" isRequired fieldId="nim-model-select">
      <SimpleSelect
        dataTestId="nim-model-select"
        options={modelOptions}
        value={selectedModel}
        onChange={(selection) => {
          const model = models.find((m) => m.name === selection);
          if (model) {
            // Select the latest version by default
            const latestVersion = model.versions[model.versions.length - 1];
            setSelectedModel(model.name, latestVersion);
          }
        }}
        placeholder="Select a model"
      />
    </FormGroup>
  );
};
