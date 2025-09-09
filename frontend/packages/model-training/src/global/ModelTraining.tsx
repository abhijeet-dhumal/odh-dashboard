import React from 'react';
import { EmptyStateBody, EmptyStateVariant, EmptyState } from '@patternfly/react-core';
import { SearchIcon } from '@patternfly/react-icons';
import { useNavigate } from 'react-router-dom';
import ApplicationsPage from '@odh-dashboard/internal/pages/ApplicationsPage';
import { ProjectObjectType } from '@odh-dashboard/internal/concepts/design/utils';
import TitleWithIcon from '@odh-dashboard/internal/concepts/design/TitleWithIcon';
import { ModelTrainingContext } from './ModelTrainingContext';
import ModelTrainingLoading from './ModelTrainingLoading';
import TrainingJobListView from './trainingJobList/TrainingJobListView';
import ModelTrainingProjectSelector from '../components/ModelTrainingProjectSelector';

const title = 'Model training';
const description =
  'UPDATED: Select a project to view its training jobs (PyTorch & TrainJobs). Monitor training progress and manage distributed training workloads across your data science projects.';

const ModelTraining = (): React.ReactElement => {
  const navigate = useNavigate();
  const { pytorchJobs, trainJobs, project, preferredProject, projects } =
    React.useContext(ModelTrainingContext);
  const [pytorchJobData, pytorchJobLoaded, pytorchJobLoadError] = pytorchJobs;
  const [trainJobData, trainJobLoaded, trainJobLoadError] = trainJobs;

  // Combine both job types
  const allJobs = React.useMemo(() => {
    return [...pytorchJobData, ...trainJobData];
  }, [pytorchJobData, trainJobData]);

  const allJobsLoaded = pytorchJobLoaded && trainJobLoaded;
  const allJobsLoadError = pytorchJobLoadError || trainJobLoadError;

  const emptyState = (
    <EmptyState
      headingLevel="h6"
      icon={SearchIcon}
      titleText="No training jobs"
      variant={EmptyStateVariant.lg}
      data-testid="empty-state-title"
    >
      <EmptyStateBody data-testid="empty-state-body">
        No training jobs have been found in this project.
      </EmptyStateBody>
    </EmptyState>
  );

  return (
    <ApplicationsPage
      empty={allJobs.length === 0}
      emptyStatePage={emptyState}
      title={<TitleWithIcon title={title} objectType={ProjectObjectType.modelCustomization} />}
      description={description}
      loadError={allJobsLoadError}
      loaded={allJobsLoaded}
      headerContent={
        <ModelTrainingProjectSelector getRedirectPath={(ns: string) => `/modelTraining/${ns}`} />
      }
      provideChildrenPadding
      loadingContent={
        project ? undefined : (
          <ModelTrainingLoading
            title="Loading"
            description="Retrieving training jobs from all projects in the cluster. This can take a few minutes."
            onCancel={() => {
              const redirectProject = preferredProject ?? projects?.[0];
              if (redirectProject) {
                navigate(`/modelTraining/${redirectProject.metadata.name}`);
              }
            }}
          />
        )
      }
    >
      <TrainingJobListView trainingJobs={allJobs} />
    </ApplicationsPage>
  );
};

export default ModelTraining;
