import * as React from 'react';
import { HelperText, HelperTextItem, FormGroup } from '@patternfly/react-core';
import { fetchNIMModelNames, ModelInfo } from '~/pages/modelServing/screens/projects/utils';
import { UpdateObjectAtPropAndValue } from '~/pages/projects/types';
import {
  CreatingInferenceServiceObject,
  CreatingServingRuntimeObject,
} from '~/pages/modelServing/screens/types';
import TypeaheadSelect, { TypeaheadSelectOption } from '~/components/TypeaheadSelect';
import { Stack, StackItem } from '@patternfly/react-core';

type NIMModelListSectionProps = {
  inferenceServiceData: CreatingInferenceServiceObject;
  setInferenceServiceData: UpdateObjectAtPropAndValue<CreatingInferenceServiceObject>;
  setServingRuntimeData: UpdateObjectAtPropAndValue<CreatingServingRuntimeObject>;
  isEditing?: boolean;
};

const normalizeVersion = (version: string): string => {
  if (/^\d+(\.\d+)*$/.test(version)) {
    const parts = version.split('.').map(Number);
    while (parts.length < 3) {
      parts.push(0);
    }
    return parts.join('.');
  }
  return version;
};

const NIMModelListSection: React.FC<NIMModelListSectionProps> = ({
  inferenceServiceData,
  setInferenceServiceData,
  setServingRuntimeData,
  isEditing,
}) => {
  const [modelList, setModelList] = React.useState<ModelInfo[]>([]);
  const [teams, setTeams] = React.useState<TypeaheadSelectOption[]>([]);
  const [models, setModels] = React.useState<TypeaheadSelectOption[]>([]);
  const [tags, setTags] = React.useState<TypeaheadSelectOption[]>([]);

  const [selectedTeam, setSelectedTeam] = React.useState<string>('');
  const [selectedModel, setSelectedModel] = React.useState<string>('');
  const [selectedTag, setSelectedTag] = React.useState<string>('');

  const [error, setError] = React.useState<string>('');

  React.useEffect(() => {
    const getModelNames = async () => {
      try {
        const modelInfos = await fetchNIMModelNames();
        if (modelInfos && modelInfos.length > 0) {
          setModelList(modelInfos);

          const uniqueTeams = Array.from(
            new Set(modelInfos.map((model) => model.namespace.split('/')[1]))
          );

          setTeams(
            uniqueTeams.map((team) => ({
              value: team,
              content: team,
            }))
          );

          setError('');
        } else {
          setError('No NVIDIA NIM models found. Please check the installation.');
        }
      } catch (err) {
        setError('There was a problem fetching the NIM models. Please try again later.');
      }
    };

    getModelNames();
  }, []);

  const handleTeamSelect = (
    _event: React.MouseEvent<Element, MouseEvent> | React.KeyboardEvent<HTMLInputElement> | undefined,
    key: string | number
  ) => {
    if (typeof key !== 'string') return;
    setSelectedTeam(key);
    setSelectedModel('');
    setSelectedTag('');

    const filteredModels = modelList
      .filter((model) => model.namespace.split('/')[1] === key)
      .map((model) => ({
        value: model.name,
        content: model.displayName,
      }));

    setModels(filteredModels);
    setTags([]);
  };

  const handleModelSelect = (
    _event: React.MouseEvent<Element, MouseEvent> | React.KeyboardEvent<HTMLInputElement> | undefined,
    key: string | number
  ) => {
    if (typeof key !== 'string') return;
    setSelectedModel(key);
    setSelectedTag('');

    const modelInfo = modelList.find((model) => model.name === key);
    if (modelInfo) {
      const normalizedTagMap = new Map<string, string>();
      modelInfo.tags.forEach((tag) => {
        const normalized = normalizeVersion(tag);
        normalizedTagMap.set(tag, normalized);
      });

      const uniqueTags = Array.from(new Set(normalizedTagMap.values())).map((normalized) => {
        const originalTag = [...normalizedTagMap.entries()].find(([_, v]) => v === normalized)?.[0];
        return {
          value: originalTag || normalized,
          content: normalized,
        };
      });

      setTags(uniqueTags);
    }
  };

  const handleTagSelect = (
    _event: React.MouseEvent<Element, MouseEvent> | React.KeyboardEvent<HTMLInputElement> | undefined,
    key: string | number
  ) => {
    if (typeof key !== 'string') return;
    setSelectedTag(key);

    const modelInfo = modelList.find((model) => model.name === selectedModel);
    if (modelInfo) {
      setServingRuntimeData('supportedModelFormatsInfo', {
        name: modelInfo.name,
        version: key,
      });

      setServingRuntimeData('imageName', `nvcr.io/${modelInfo.namespace}/${modelInfo.name}:${key}`);

      setInferenceServiceData('format', { name: modelInfo.name });
      setError('');
    } else {
      setError('Error: Model not found.');
    }
  };

  return (
    <FormGroup label="NVIDIA NIM" fieldId="nim-model-list-selection" isRequired>
      <Stack hasGutter>
        <StackItem>
          <TypeaheadSelect
            selectOptions={teams}
            selected={selectedTeam}
            onSelect={handleTeamSelect}
            placeholder="Select Team"
            noOptionsFoundMessage={(filter) => `No teams found for "${filter}"`}
            isCreatable={false}
            allowClear
            onClearSelection={() => {
              setSelectedTeam('');
              setSelectedModel('');
              setSelectedTag('');
              setModels([]);
              setTags([]);
            }}
          />
        </StackItem>
        <StackItem>
          <TypeaheadSelect
            selectOptions={models}
            selected={selectedModel}
            onSelect={handleModelSelect}
            placeholder="Select Model"
            noOptionsFoundMessage={(filter) => `No models found for "${filter}"`}
            isCreatable={false}
            allowClear
            isDisabled={!selectedTeam}
            onClearSelection={() => {
              setSelectedModel('');
              setSelectedTag('');
              setTags([]);
            }}
          />
        </StackItem>
        <StackItem>
          <TypeaheadSelect
            selectOptions={tags}
            selected={selectedTag}
            onSelect={handleTagSelect}
            placeholder="Select Tag"
            noOptionsFoundMessage={(filter) => `No tags found for "${filter}"`}
            isCreatable={false}
            allowClear
            isDisabled={!selectedModel}
            onClearSelection={() => setSelectedTag('')}
          />
        </StackItem>
      </Stack>
      {error && (
        <HelperText>
          <HelperTextItem variant="error">{error}</HelperTextItem>
        </HelperText>
      )}
    </FormGroup>
  );
};

export default NIMModelListSection;
