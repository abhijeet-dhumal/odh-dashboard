import { SortableData } from '@odh-dashboard/internal/components/table/index';
import { getJobStatus, TrainingJob } from './utils';

export const columns: SortableData<TrainingJob>[] = [
  {
    field: 'name',
    label: 'Name',
    width: 20,
    sortable: (a: TrainingJob, b: TrainingJob): number =>
      (a.metadata.annotations?.['opendatahub.io/display-name'] || a.metadata.name).localeCompare(
        b.metadata.annotations?.['opendatahub.io/display-name'] || b.metadata.name,
      ),
  },
  {
    field: 'project',
    label: 'Project',
    width: 20,
    sortable: (a: TrainingJob, b: TrainingJob): number =>
      a.metadata.namespace.localeCompare(b.metadata.namespace),
  },
  {
    field: 'workerNodes',
    label: 'Worker nodes',
    width: 15,
    sortable: (a: TrainingJob, b: TrainingJob): number => {
      const aWorker = a.kind === 'PyTorchJob' 
        ? (a as any).spec.pytorchReplicaSpecs.Worker?.replicas || 0
        : (a as any).spec.trainer?.numNodes || 1;
      const bWorker = b.kind === 'PyTorchJob' 
        ? (b as any).spec.pytorchReplicaSpecs.Worker?.replicas || 0
        : (b as any).spec.trainer?.numNodes || 1;

      return aWorker - bWorker;
    },
  },
  {
    field: 'clusterQueue',
    label: 'Cluster queue',
    width: 10,
    sortable: (a: TrainingJob, b: TrainingJob): number => {
      const aQueue = a.metadata.labels?.['kueue.x-k8s.io/queue-name'] || '';
      const bQueue = b.metadata.labels?.['kueue.x-k8s.io/queue-name'] || '';
      return aQueue.localeCompare(bQueue);
    },
  },
  {
    field: 'created',
    label: 'Created',
    width: 15,
    sortable: (a: TrainingJob, b: TrainingJob): number => {
      const first = a.metadata.creationTimestamp;
      const second = b.metadata.creationTimestamp;
      return new Date(first ?? 0).getTime() - new Date(second ?? 0).getTime();
    },
  },
  {
    field: 'status',
    label: 'Status',
    width: 15,
    sortable: (a: TrainingJob, b: TrainingJob): number => {
      // For sorting, we use the sync version for performance
      // The actual hibernation status will be shown in the UI
      const aState = getJobStatus(a);
      const bState = getJobStatus(b);
      return aState.localeCompare(bState);
    },
  },
  {
    field: 'kebab',
    label: '',
    sortable: false,
  },
];

export enum TrainingJobToolbarFilterOptions {
  name = 'Name',
  clusterQueue = 'Cluster queue',
  status = 'Status',
}

export const TrainingJobFilterOptions = {
  [TrainingJobToolbarFilterOptions.name]: 'Name',
  [TrainingJobToolbarFilterOptions.clusterQueue]: 'Cluster queue',
  [TrainingJobToolbarFilterOptions.status]: 'Status',
};

export type TrainingJobFilterDataType = Record<TrainingJobToolbarFilterOptions, string | undefined>;

export const initialTrainingJobFilterData: TrainingJobFilterDataType = {
  [TrainingJobToolbarFilterOptions.name]: '',
  [TrainingJobToolbarFilterOptions.clusterQueue]: '',
  [TrainingJobToolbarFilterOptions.status]: '',
};
