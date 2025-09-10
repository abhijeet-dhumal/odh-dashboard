import React from 'react';
import { 
  EmptyStateBody, 
  EmptyStateVariant, 
  EmptyState,
  Tabs,
  Tab,
  TabTitleText 
} from '@patternfly/react-core';
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
  'Monitor training progress and manage distributed training workloads across your data science projects. Select a project to view its TrainJobs. ';

const ModelTraining = (): React.ReactElement => {
  const navigate = useNavigate();
  const { pytorchJobs, trainJobs, rayJobs, project, preferredProject, projects } =
    React.useContext(ModelTrainingContext);
  const [pytorchJobData, pytorchJobLoaded, pytorchJobLoadError] = pytorchJobs;
  const [trainJobData, trainJobLoaded, trainJobLoadError] = trainJobs;
  const [rayJobData, rayJobLoaded, rayJobLoadError] = rayJobs;
  const [activeTab, setActiveTab] = React.useState<string | number>('trainjobs');

  // Combine all job types for backward compatibility
  const allJobs = React.useMemo(() => {
    return [...trainJobData, ...rayJobData];
  }, [trainJobData, rayJobData]);

  const allJobsLoaded = trainJobLoaded && rayJobLoaded;
  const allJobsLoadError = trainJobLoadError || rayJobLoadError;

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
      <div style={{ marginBottom: 'var(--pf-v5-global--spacer--xl)' }}>
        <Tabs
          activeKey={activeTab}
          onSelect={(event, tabIndex) => setActiveTab(tabIndex)}
          isBox={false}
          hasNoBorderBottom
        >
          <Tab eventKey="trainjobs" title={<TabTitleText>TrainJobs ({trainJobData.length})</TabTitleText>} />
          <Tab eventKey="rayjobs" title={<TabTitleText>RayJobs ({rayJobData.length})</TabTitleText>} />
        </Tabs>
      </div>
      <div>
        {activeTab === 'trainjobs' && (
          <TrainingJobListView trainingJobs={trainJobData as any} />
        )}
        {activeTab === 'rayjobs' && (
          <TrainingJobListView trainingJobs={rayJobData as any} />
        )}
      </div>
    </ApplicationsPage>
  );
};

export default ModelTraining;
