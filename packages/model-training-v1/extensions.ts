import type {
  HrefNavItemExtension,
  AreaExtension,
  RouteExtension,
} from '@odh-dashboard/plugin-core/extension-points';
// Allow this import as it consists of types and enums only.
// eslint-disable-next-line no-restricted-syntax
import { SupportedArea } from '@odh-dashboard/internal/concepts/areas/types';

const PLUGIN_MODEL_TRAINING_V1 = 'plugin-model-training-v1';

const extensions: (AreaExtension | HrefNavItemExtension | RouteExtension)[] = [
  {
    type: 'app.area',
    properties: {
      id: PLUGIN_MODEL_TRAINING_V1,
      reliantAreas: [SupportedArea.MODEL_TRAINING],
      devFlags: ['Model Training Plugin V1'],
    },
  },
  {
    type: 'app.navigation/href',
    flags: {
      required: [PLUGIN_MODEL_TRAINING_V1],
    },
    properties: {
      id: 'modelTrainingV1',
      title: 'Model training - v1',
      href: '/modelTrainingV1',
      section: 'models',
      path: '/modelTrainingV1/*',
    },
  },
  {
    type: 'app.route',
    properties: {
      path: '/modelTrainingV1/*',
      component: () => import('./src/ModelTrainingRoutes'),
    },
    flags: {
      required: [PLUGIN_MODEL_TRAINING_V1],
    },
  },
];

export default extensions;
