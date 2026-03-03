import React from 'react';
import { FormGroup, Alert, AlertVariant } from '@patternfly/react-core';
import TypeaheadSelect, {
  TypeaheadSelectOption,
} from '@odh-dashboard/internal/components/TypeaheadSelect';
import { NIM_MODELS, NIMModel } from './nimModelsData';

const normalizeVersion = (tag: string): string => {
  if (/^\d+(\.\d+)*$/.test(tag)) {
    const parts = tag.split('.').map(Number);
    while (parts.length < 3) {
      parts.push(0);
    }
    return parts.join('.');
  }
  return tag;
};

const buildOptions = (): TypeaheadSelectOption[] => {
  const seen = new Set<string>();
  const options: TypeaheadSelectOption[] = [];
  for (const model of NIM_MODELS) {
    for (const tag of model.tags) {
      const normalized = normalizeVersion(tag);
      const value = `${model.name}-${normalized}`;
      if (!seen.has(value)) {
        seen.add(value);
        const label = model.euRestricted
          ? `${model.displayName} - ${normalized} (EU restricted)`
          : `${model.displayName} - ${normalized}`;
        options.push({ value, content: label });
      }
    }
  }
  return options;
};

const extractModelAndVersion = (
  key: string,
): { model: NIMModel; version: string } | undefined => {
  const matched = NIM_MODELS.filter((m) => key.startsWith(`${m.name}-`));
  if (matched.length === 0) {
    return undefined;
  }
  const model = matched.reduce((longest, current) =>
    current.name.length > longest.name.length ? current : longest,
  );
  const version = key.slice(model.name.length + 1);
  return { model, version };
};

type NIMModelListSectionWrapperProps = {
  selectedModelName?: string;
  onModelSelect: (modelName: string, modelDisplayName?: string, version?: string) => void;
  isDisabled?: boolean;
};

const NIMModelListSectionWrapper: React.FC<NIMModelListSectionWrapperProps> = ({
  selectedModelName,
  onModelSelect,
  isDisabled,
}) => {
  const [selectedKey, setSelectedKey] = React.useState<string>('');
  const options = React.useMemo(() => buildOptions(), []);

  const selectedModel = selectedKey ? extractModelAndVersion(selectedKey) : undefined;

  const handleSelect = React.useCallback(
    (
      _event:
        | React.MouseEvent<Element, MouseEvent>
        | React.KeyboardEvent<HTMLInputElement>
        | undefined,
      selection: string | number,
    ) => {
      if (isDisabled) {
        return;
      }
      const key = String(selection);
      setSelectedKey(key);
      const result = extractModelAndVersion(key);
      if (result) {
        onModelSelect(result.model.name, result.model.displayName, result.version);
      }
    },
    [isDisabled, onModelSelect],
  );

  return (
    <>
      <FormGroup label="NVIDIA NIM" fieldId="nim-model-list-selection" isRequired>
        <TypeaheadSelect
          selectOptions={options}
          selected={selectedKey || selectedModelName}
          onSelect={handleSelect}
          placeholder="Select NVIDIA NIM to deploy"
          isScrollable
          isDisabled={isDisabled}
          isCreatable={false}
          allowClear={!isDisabled}
          onClearSelection={() => {
            setSelectedKey('');
            onModelSelect('', '');
          }}
          noOptionsFoundMessage={(filter) => `No results found for "${filter}"`}
        />
      </FormGroup>

      {selectedModel?.model.euRestricted && (
        <Alert variant={AlertVariant.warning} isInline title="EU availability restriction">
          This model may not be available in certain regions due to regulatory restrictions.
        </Alert>
      )}
    </>
  );
};

export default NIMModelListSectionWrapper;
