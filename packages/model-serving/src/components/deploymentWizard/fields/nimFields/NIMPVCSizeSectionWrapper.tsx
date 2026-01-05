import React from 'react';
// eslint-disable-next-line @odh-dashboard/no-restricted-imports
import NIMPVCSizeSection, {
  PVCMode,
} from '@odh-dashboard/internal/pages/modelServing/screens/projects/NIMServiceModal/NIMPVCSizeSection';

export type { PVCMode };

type NIMPVCSizeSectionWrapperProps = {
  pvcSize: string;
  setPvcSize: (value: string) => void;
  pvcMode: PVCMode;
  setPvcMode: (mode: PVCMode) => void;
  existingPvcName: string;
  setExistingPvcName: (name: string) => void;
  modelPath: string;
  setModelPath: (path: string) => void;
  pvcSubPath: string;
  setPvcSubPath: (path: string) => void;
  isEditing?: boolean;
  selectedModel?: string;
  namespace?: string;
};

/**
 * Wrapper component that adapts the real NIMPVCSizeSection for use in the wizard.
 * This component includes the +/- controls from PVSizeField and the full PVC selection logic.
 */
const NIMPVCSizeSectionWrapper: React.FC<NIMPVCSizeSectionWrapperProps> = (props) => {
  return <NIMPVCSizeSection {...props} />;
};

export default NIMPVCSizeSectionWrapper;
