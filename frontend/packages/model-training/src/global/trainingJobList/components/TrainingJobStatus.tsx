import React from 'react';
import { Flex, FlexItem, Label, Progress, Skeleton } from '@patternfly/react-core';
import { getJobStatus, getStatusInfo, TrainingJob } from '../utils';
import { TrainingJobState } from '../../../types';

const TrainingJobStatus = ({
  job,
  jobStatus,
}: {
  job: TrainingJob;
  jobStatus?: TrainingJobState;
}): React.ReactElement => {
  const status = jobStatus || getJobStatus(job);
  const isLoadingStatus = jobStatus === undefined;
  const isRunning = status === 'Running';

  if (isLoadingStatus) {
    return <Skeleton height="24px" width="80px" />;
  }

  const statusInfo = getStatusInfo(status);

  return (
    <Flex direction={{ default: 'column' }} gap={{ default: 'gapXs' }}>
      <FlexItem>
        <Label
          isCompact
          status={statusInfo.status}
          color={statusInfo.color}
          icon={<statusInfo.IconComponent />}
          data-testid="training-job-status"
        >
          {statusInfo.label}
        </Label>
      </FlexItem>
      {/* Only show progress bar if job is running and completion percentage is available */}
      {isRunning && job.kind === 'PyTorchJob' && (job as any).status?.completionPercentage ? (
        <FlexItem>
          <Progress value={(job as any).status.completionPercentage} style={{ width: '200px' }} size="sm" />
        </FlexItem>
      ) : null}
      {/* Show progress for TrainJob if available */}
      {isRunning && job.kind === 'TrainJob' && (job as any).status?.trainingProgress?.percentComplete ? (
        <FlexItem>
          <Progress value={parseFloat((job as any).status.trainingProgress.percentComplete)} style={{ width: '200px' }} size="sm" />
        </FlexItem>
      ) : null}
    </Flex>
  );
};

export default TrainingJobStatus;
