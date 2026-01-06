import base from '@odh-dashboard/jest-config';
import type { Config } from '@jest/types';

const config: Config.InitialOptions = {
  ...base,
  displayName: 'nim-serving',
};

export default config;
