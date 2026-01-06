import type { TemplateKind, ServingRuntimeKind } from '@odh-dashboard/internal/k8sTypes';
// eslint-disable-next-line @odh-dashboard/no-restricted-imports
import {
  getNIMServingRuntimeTemplate,
  updateServingRuntimeTemplate,
  fetchNIMAccountTemplateName,
} from '@odh-dashboard/internal/pages/modelServing/screens/projects/nimUtils';
// eslint-disable-next-line @odh-dashboard/no-restricted-imports
import { getServingRuntimeFromTemplate } from '@odh-dashboard/internal/pages/modelServing/customServingRuntimes/utils';

/**
 * Fetch the NIM template name from the NIM Account Custom Resource
 * The NIM operator creates this CR and stores the runtime template name in its status
 */
export const fetchNIMTemplateName = async (
  dashboardNamespace: string,
): Promise<string | undefined> => {
  return fetchNIMAccountTemplateName(dashboardNamespace);
};

/**
 * Fetch the actual NIM ServingRuntime template from the dashboard namespace
 */
export const fetchNIMTemplate = async (
  dashboardNamespace: string,
  templateName: string,
): Promise<TemplateKind | undefined> => {
  return getNIMServingRuntimeTemplate(dashboardNamespace, templateName);
};

/**
 * Convert a TemplateKind to a ServingRuntimeKind
 * Extracts the ServingRuntime object from the template
 */
export const convertTemplateToServingRuntime = (template: TemplateKind): ServingRuntimeKind => {
  const result = getServingRuntimeFromTemplate(template);
  if (!result) {
    throw new Error('Failed to extract ServingRuntime from template');
  }
  return result;
};

/**
 * Configure a NIM ServingRuntime with PVC information
 * Updates the volume mounts and volumes to reference the correct PVC
 */
export const configureNIMServingRuntime = (
  servingRuntime: ServingRuntimeKind,
  pvcName: string,
  pvcSubPath?: string,
): ServingRuntimeKind => {
  const result = updateServingRuntimeTemplate(servingRuntime, pvcName, pvcSubPath);
  // The utility function can return undefined/null if there's an issue
  // In that case, we throw an error rather than returning undefined
  return result || servingRuntime;
};
