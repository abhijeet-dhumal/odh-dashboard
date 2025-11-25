import * as React from 'react';
import {
  DescriptionList,
  DescriptionListGroup,
  DescriptionListTerm,
  DescriptionListDescription,
  Title,
  StackItem,
  Stack,
} from '@patternfly/react-core';
import { TrainJobKind } from '../../k8sTypes';
import { getTrainerStatus } from '../trainingJobList/utils';

type TrainingJobDetailsTabProps = {
  job: TrainJobKind;
};

const TrainingJobDetailsTab: React.FC<TrainingJobDetailsTabProps> = ({ job }) => {
  const trainerStatus = getTrainerStatus(job);

  // Progress information
  const progressPercentage = trainerStatus?.progressPercentage;
  const estimatedTimeRemaining =
    trainerStatus?.estimatedRemainingTimeSummary ||
    (trainerStatus?.estimatedRemainingDurationSeconds
      ? `${Math.round(trainerStatus.estimatedRemainingDurationSeconds / 60)} minutes`
      : '-');

  const currentSteps = trainerStatus?.currentStep ?? '-';
  const totalSteps = trainerStatus?.totalSteps ?? '-';
  const currentEpochs = trainerStatus?.currentEpoch ?? '-';
  const totalEpochs = trainerStatus?.totalEpochs ?? '-';

  // Helper to format metric names (snake_case -> Title Case)
  const formatMetricName = (key: string): string => {
    return key
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Helper to format metric values
  const formatMetricValue = (value: number): string => {
    // For very small or very large numbers, use scientific notation
    if (Math.abs(value) < 0.0001 && value !== 0) {
      return value.toExponential(4);
    }
    // For regular numbers, show up to 6 decimal places, but remove trailing zeros
    return parseFloat(value.toFixed(6)).toString();
  };

  // Get all train metrics
  const trainMetrics = trainerStatus?.trainMetrics || {};
  const hasTrainMetrics = Object.keys(trainMetrics).length > 0;

  // Get all eval metrics
  const evalMetrics = trainerStatus?.evalMetrics || {};
  const hasEvalMetrics = Object.keys(evalMetrics).length > 0;

  return (
    <Stack hasGutter>
      <StackItem className="pf-v6-u-mt-md">
        <DescriptionList isHorizontal>
          <Title headingLevel="h3" size="md" data-testid="progress-section">
            Progress
          </Title>
          {progressPercentage != null && (
            <DescriptionListGroup>
              <DescriptionListTerm style={{ fontWeight: 'normal' }}>
                Progress percentage:
              </DescriptionListTerm>
              <DescriptionListDescription data-testid="progress-percentage-value">
                {progressPercentage}%
              </DescriptionListDescription>
            </DescriptionListGroup>
          )}
          <DescriptionListGroup>
            <DescriptionListTerm style={{ fontWeight: 'normal' }}>
              Estimated time remaining:
            </DescriptionListTerm>
            <DescriptionListDescription data-testid="estimated-time-remaining-value">
              {estimatedTimeRemaining}
            </DescriptionListDescription>
          </DescriptionListGroup>
          <DescriptionListGroup>
            <DescriptionListTerm style={{ fontWeight: 'normal' }}>Steps:</DescriptionListTerm>
            <DescriptionListDescription data-testid="steps-value">
              {typeof currentSteps === 'number' ? currentSteps : '-'} / {totalSteps}
            </DescriptionListDescription>
          </DescriptionListGroup>
          <DescriptionListGroup>
            <DescriptionListTerm style={{ fontWeight: 'normal' }}>Epochs:</DescriptionListTerm>
            <DescriptionListDescription data-testid="epochs-value">
              {currentEpochs} / {totalEpochs}
            </DescriptionListDescription>
          </DescriptionListGroup>
        </DescriptionList>
      </StackItem>

      {/* Train Metrics Section */}
      {hasTrainMetrics && (
        <StackItem className="pf-v6-u-mt-md">
          <DescriptionList isHorizontal>
            <Title headingLevel="h3" size="md" data-testid="train-metrics-section">
              Train Metrics
            </Title>
            {Object.entries(trainMetrics).map(([key, value]) => (
              <DescriptionListGroup key={key}>
                <DescriptionListTerm style={{ fontWeight: 'normal' }}>
                  {formatMetricName(key)}:
                </DescriptionListTerm>
                <DescriptionListDescription data-testid={`train-metric-${key}-value`}>
                  {formatMetricValue(value)}
                </DescriptionListDescription>
              </DescriptionListGroup>
            ))}
          </DescriptionList>
        </StackItem>
      )}

      {/* Eval Metrics Section */}
      {hasEvalMetrics && (
        <StackItem className="pf-v6-u-mt-md pf-v6-u-mb-md">
          <DescriptionList isHorizontal>
            <Title headingLevel="h3" size="md" data-testid="eval-metrics-section">
              Eval Metrics
            </Title>
            {Object.entries(evalMetrics).map(([key, value]) => (
              <DescriptionListGroup key={key}>
                <DescriptionListTerm style={{ fontWeight: 'normal' }}>
                  {formatMetricName(key)}:
                </DescriptionListTerm>
                <DescriptionListDescription data-testid={`eval-metric-${key}-value`}>
                  {formatMetricValue(value)}
                </DescriptionListDescription>
              </DescriptionListGroup>
            ))}
          </DescriptionList>
        </StackItem>
      )}

      {/* Show message if no metrics available */}
      {!hasTrainMetrics && !hasEvalMetrics && (
        <StackItem className="pf-v6-u-mt-md pf-v6-u-mb-md">
          <DescriptionList isHorizontal>
            <Title headingLevel="h3" size="md" data-testid="metrics-section">
              Metrics
            </Title>
            <DescriptionListGroup>
              <DescriptionListDescription>No metrics available</DescriptionListDescription>
            </DescriptionListGroup>
          </DescriptionList>
        </StackItem>
      )}
    </Stack>
  );
};

export default TrainingJobDetailsTab;
