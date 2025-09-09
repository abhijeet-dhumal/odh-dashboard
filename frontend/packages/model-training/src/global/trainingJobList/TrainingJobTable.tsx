import * as React from 'react';
import { Table } from '@odh-dashboard/internal/components/table/index';
import DashboardEmptyTableView from '@odh-dashboard/internal/concepts/dashboard/DashboardEmptyTableView';
import { columns } from './const';
import DeleteTrainingJobModal from './DeleteTrainingJobModal';
import TrainingJobTableRow from './TrainingJobTableRow';
import { TrainingJob } from './utils';
import { TrainingJobState } from '../../types';

type TrainingJobTableProps = {
  trainingJobs: TrainingJob[];
  jobStatuses?: Map<string, TrainingJobState>; // Batch fetched statuses
  onStatusUpdate?: (jobId: string, newStatus: TrainingJobState) => void;
  clearFilters?: () => void;
  onClearFilters: () => void;
} & Partial<Pick<React.ComponentProps<typeof Table>, 'enablePagination' | 'toolbarContent'>>;

const TrainingJobTable: React.FC<TrainingJobTableProps> = ({
  trainingJobs,
  jobStatuses,
  onStatusUpdate,
  clearFilters,
  onClearFilters,
  toolbarContent,
}) => {
  const [deleteTrainingJob, setDeleteTrainingJob] = React.useState<TrainingJob>();

  return (
    <>
      <Table
        data-testid="training-job-table"
        id="training-job-table"
        enablePagination
        data={trainingJobs}
        columns={columns}
        onClearFilters={onClearFilters}
        toolbarContent={toolbarContent}
        emptyTableView={
          clearFilters ? <DashboardEmptyTableView onClearFilters={clearFilters} /> : undefined
        }
        rowRenderer={(job: TrainingJob) => {
          const jobId = job.metadata.uid || job.metadata.name;
          const jobStatus = jobStatuses?.get(jobId);

          return (
            <TrainingJobTableRow
              key={jobId}
              job={job}
              jobStatus={jobStatus}
              onStatusUpdate={onStatusUpdate}
              onDelete={(trainingJob) => setDeleteTrainingJob(trainingJob)}
            />
          );
        }}
      />

      {deleteTrainingJob ? (
        <DeleteTrainingJobModal
          trainingJob={deleteTrainingJob}
          onClose={() => {
            setDeleteTrainingJob(undefined);
          }}
        />
      ) : null}
    </>
  );
};

export default TrainingJobTable;
