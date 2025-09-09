import type { Extension } from '@openshift/dynamic-plugin-sdk';
import extensions2 from '@odh-dashboard/feature-store/extensions';
import extensions3 from '@odh-dashboard/kserve/extensions';
import extensions0 from '@odh-dashboard/model-registry/extensions';
import extensions4 from '@odh-dashboard/model-serving/extensions';
import extensions5 from '@odh-dashboard/model-serving-backport/extensions';
import extensions6 from '@odh-dashboard/model-training/extensions';
import extensions7 from '@odh-dashboard/model-training-v2/extensions';
import extensions1 from '@odh-dashboard/internal/extensions';

const pluginExtensions: Record<string, Extension[]> = {
  '@odh-dashboard/model-registry': extensions0,
  '@odh-dashboard/internal': extensions1,
  '@odh-dashboard/feature-store': extensions2,
  '@odh-dashboard/kserve': extensions3,
  '@odh-dashboard/model-serving': extensions4,
  '@odh-dashboard/model-serving-backport': extensions5,
  '@odh-dashboard/model-training': extensions6,
  '@odh-dashboard/model-training-v2': extensions7,
};

export default pluginExtensions;
