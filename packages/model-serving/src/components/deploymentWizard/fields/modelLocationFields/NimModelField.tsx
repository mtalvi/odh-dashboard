import React from 'react';
import { FormGroup, Alert, Spinner, HelperText, HelperTextItem } from '@patternfly/react-core';
import TypeaheadSelect, { TypeaheadSelectOption } from '@odh-dashboard/internal/components/TypeaheadSelect';
import { getConfigMap } from '@odh-dashboard/internal/api/k8s/configMaps';
import useFetch, { FetchStateObject } from '@odh-dashboard/internal/utilities/useFetch';
import { ConfigMapKind } from '@odh-dashboard/internal/k8sTypes';

export type NimModelInfo = {
  name: string;
  displayName: string;
  shortDescription?: string;
  namespace: string;
  tags: string[];
  latestTag: string;
  updatedDate?: string;
};

type NimModelFieldProps = {
  modelName?: string;
  modelVersion?: string;
  modelDisplayName?: string;
  modelNamespace?: string;
  onChange: (model: {
    name: string;
    version: string;
    displayName: string;
    namespace: string;
  }) => void;
  disabled?: boolean;
  projectName?: string; // Project namespace where ConfigMap is located
};

export const NimModelField: React.FC<NimModelFieldProps> = ({
  modelName = '',
  modelVersion = '',
  modelDisplayName = '',
  modelNamespace = '',
  onChange,
  disabled = false,
  projectName = 'wizard-demo-mtalvi',
}) => {
  const configMapResult: FetchStateObject<ConfigMapKind | null> = useFetch(
    React.useCallback(async () => {
      try {
        return await getConfigMap(projectName, 'nvidia-nim-models-data');
      } catch (error) {
        console.error('Failed to fetch NIM ConfigMap:', error);
        return null;
      }
    }, [projectName]),
    null,
  );

  const { data: configMap, loaded, error } = configMapResult;

  const [modelList, setModelList] = React.useState<NimModelInfo[]>([]);
  const [options, setOptions] = React.useState<TypeaheadSelectOption[]>([]);
  const [selectedKey, setSelectedKey] = React.useState<string>('');

  // Parse ConfigMap data
  React.useEffect(() => {
    if (!loaded || !configMap?.data) {
      setModelList([]);
      setOptions([]);
      return;
    }

    try {
      const models: NimModelInfo[] = [];
      
      Object.entries(configMap.data).forEach(([key, jsonStr]) => {
        try {
          const modelData = JSON.parse(jsonStr as string);
          models.push({
            name: modelData.name,
            displayName: modelData.displayName || modelData.name,
            shortDescription: modelData.shortDescription,
            namespace: modelData.namespace,
            tags: modelData.tags || [],
            latestTag: modelData.latestTag || (modelData.tags && modelData.tags[0]) || '',
            updatedDate: modelData.updatedDate,
          });
        } catch (parseError) {
          console.error(`Failed to parse model data for ${key}:`, parseError);
        }
      });

      setModelList(models);

      // Create options for TypeaheadSelect (model + version combinations)
      const normalizeVersion = (tag: string) => {
        if (/^\d+(\.\d+)*$/.test(tag)) {
          const parts = tag.split('.').map(Number);
          while (parts.length < 3) {
            parts.push(0);
          }
          return parts.join('.');
        }
        return tag;
      };

      const seen = new Set<string>();
      const fetchedOptions = models
        .flatMap((model) =>
          model.tags.map((tag) => {
            const normalizedTag = normalizeVersion(tag);
            const value = `${model.name}__${normalizedTag}`;
            const content = `${model.displayName} - ${normalizedTag}`;

            if (!seen.has(value)) {
              seen.add(value);
              return { value, content };
            }
            return null;
          }),
        )
        .filter((option): option is { value: string; content: string } => option !== null);

      setOptions(fetchedOptions);

      // Set initial selection if provided
      if (modelName && modelVersion) {
        setSelectedKey(`${modelName}__${normalizeVersion(modelVersion)}`);
      }
    } catch (parseError) {
      console.error('Failed to parse NIM ConfigMap:', parseError);
      setModelList([]);
      setOptions([]);
    }
  }, [configMap, loaded, modelName, modelVersion]);

  const extractModelAndVersion = (key: string) => {
    const [name, version] = key.split('__');
    const model = modelList.find((m) => m.name === name);
    return model ? { model, version } : null;
  };

  const handleSelect = (
    _event: React.MouseEvent | React.KeyboardEvent | undefined,
    key: string | number,
  ) => {
    if (typeof key !== 'string' || disabled) {
      return;
    }

    setSelectedKey(key);
    const result = extractModelAndVersion(key);
    
    if (result) {
      onChange({
        name: result.model.name,
        version: result.version,
        displayName: result.model.displayName,
        namespace: result.model.namespace,
      });
    }
  };

  const handleClear = () => {
    if (!disabled) {
      setSelectedKey('');
      onChange({
        name: '',
        version: '',
        displayName: '',
        namespace: '',
      });
    }
  };

  if (error) {
    return (
      <Alert variant="danger" isInline title="Failed to load NIM models">
        {error.message || 'Unknown error'}
      </Alert>
    );
  }

  if (!loaded) {
    return (
      <FormGroup label="NVIDIA NIM Model" isRequired fieldId="nim-model-selection">
        <Spinner size="md" />
        <HelperText>
          <HelperTextItem>Loading available models...</HelperTextItem>
        </HelperText>
      </FormGroup>
    );
  }

  if (options.length === 0) {
    return (
      <Alert variant="warning" isInline title="No NIM models available">
        No NVIDIA NIM models found in the ConfigMap. Please check your installation or contact your
        administrator.
      </Alert>
    );
  }

  return (
    <FormGroup label="NVIDIA NIM Model" isRequired fieldId="nim-model-selection">
      <TypeaheadSelect
        selectOptions={options}
        selected={selectedKey}
        isScrollable
        isDisabled={disabled}
        onSelect={handleSelect}
        placeholder={disabled ? selectedKey : 'Select a NIM model and version'}
        noOptionsFoundMessage={(filter) => `No results found for "${filter}"`}
        isCreatable={false}
        allowClear={!disabled}
        onClearSelection={handleClear}
      />
      <HelperText>
        <HelperTextItem>
          {selectedKey
            ? 'Selected model will be deployed with the specified version'
            : 'Choose a model and version to deploy'}
        </HelperTextItem>
      </HelperText>
    </FormGroup>
  );
};
