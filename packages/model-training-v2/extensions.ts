import type {
  HrefNavItemExtension,
  AreaExtension,
  RouteExtension,
} from '@odh-dashboard/plugin-core/extension-points';
// Allow this import as it consists of types and enums only.
// eslint-disable-next-line no-restricted-syntax
import { SupportedArea } from '@odh-dashboard/internal/concepts/areas/types';

const PLUGIN_MODEL_TRAINING_V2 = 'plugin-model-training-v2';

const extensions: (AreaExtension | HrefNavItemExtension | RouteExtension)[] = [
  {
    type: 'app.area',
    properties: {
      id: PLUGIN_MODEL_TRAINING_V2,
      reliantAreas: [SupportedArea.MODEL_TRAINING],
      devFlags: ['Model Training Plugin V2'],
    },
  },
  {
    type: 'app.navigation/href',
    flags: {
      required: [PLUGIN_MODEL_TRAINING_V2],
    },
    properties: {
      id: 'modelTrainingV2',
      title: 'Model training - v2',
      href: '/modelTrainingV2',
      section: 'models',
      path: '/modelTrainingV2/*',
    },
  },
  {
    type: 'app.route',
    properties: {
      path: '/modelTrainingV2/*',
      component: () => import('./src/ModelTrainingRoutes'),
    },
    flags: {
      required: [PLUGIN_MODEL_TRAINING_V2],
    },
  },
];

export default extensions;
