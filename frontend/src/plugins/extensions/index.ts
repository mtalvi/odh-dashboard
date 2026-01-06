import type { Extension } from '@openshift/dynamic-plugin-sdk';
import nimServingExtensions from '@odh-dashboard/nim-serving/extensions';
import hardwareProfileExtensions from './hardware-profiles';
import navigationExtensions from './navigation';
import routeExtensions from './routes';

const extensions: Extension[] = [
  ...navigationExtensions,
  ...hardwareProfileExtensions,
  ...routeExtensions,
  ...nimServingExtensions,
];

export default extensions;
