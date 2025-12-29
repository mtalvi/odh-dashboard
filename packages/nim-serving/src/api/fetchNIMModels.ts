import type { NIMModel } from '../types';

/**
 * Fetch available NIM models from NVIDIA catalog using the provided API key
 * This implements Option B approach: client-side fetching without operator involvement
 *
 * Steps:
 * 1. Fetch available images from NVIDIA registry (public, no auth)
 * 2. Validate API key with NVIDIA
 * 3. Fetch versions for each model (parallel requests)
 *
 * Note: This can take 30-90 seconds due to multiple API calls
 */
export const fetchNIMModels = async (apiKey: string): Promise<NIMModel[]> => {
  // Step 1: Fetch available images from NVIDIA NGC catalog (public endpoint)
  const catalogUrl = 'https://catalog.ngc.nvidia.com/api/v1/orgs/nvidia/resources/nim';

  let images: Array<{ name: string; displayName: string }>;
  try {
    const imagesResponse = await fetch(catalogUrl);
    if (!imagesResponse.ok) {
      throw new Error('Failed to fetch NVIDIA model catalog');
    }
    const data = await imagesResponse.json();
    images = data.resources || [];
  } catch (err) {
    throw new Error(
      `Failed to fetch NVIDIA catalog: ${err instanceof Error ? err.message : 'Unknown error'}`,
    );
  }

  // Step 2: Validate API key
  const authUrl = 'https://api.ngc.nvidia.com/v2/authenticate';
  try {
    const validateResponse = await fetch(authUrl, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });
    if (!validateResponse.ok) {
      throw new Error('Invalid API key. Please check your NVIDIA NGC API key.');
    }
  } catch (err) {
    if (err instanceof Error && err.message.includes('Invalid API key')) {
      throw err;
    }
    throw new Error(
      `Failed to validate API key: ${err instanceof Error ? err.message : 'Network error'}`,
    );
  }

  // Step 3: Fetch versions for each model in parallel
  const modelsWithVersions = await Promise.all(
    images.map(async (image) => {
      try {
        const versionsUrl = `https://catalog.ngc.nvidia.com/api/v1/orgs/nvidia/resources/nim/${image.name}/versions`;
        const versionsResponse = await fetch(versionsUrl, {
          headers: {
            Authorization: `Bearer ${apiKey}`,
          },
        });

        if (!versionsResponse.ok) {
          // If we can't fetch versions, return model with empty versions array
          return {
            name: image.name,
            displayName: image.displayName,
            versions: [],
          };
        }

        const versionsData = await versionsResponse.json();
        const versions =
          versionsData.versions?.map((v: { versionId: string }) => v.versionId) || [];

        return {
          name: image.name,
          displayName: image.displayName,
          versions,
        };
      } catch {
        // If version fetch fails for a specific model, include it without versions
        return {
          name: image.name,
          displayName: image.displayName,
          versions: [],
        };
      }
    }),
  );

  // Filter out models without versions
  return modelsWithVersions.filter((model) => model.versions.length > 0);
};
