/**
 * Mutation Hooks Index
 * Export all TanStack Query mutation hooks
 */
export {
  useCreateRelease,
  useUpdateRelease,
  useDeleteRelease,
  useCloseRelease,
  useReopenRelease,
  useArchiveRelease,
} from './useReleaseMutations';

export {
  useCreateTestSet,
  useUpdateTestSet,
  useDeleteTestSet,
} from './useTestSetMutations';

export {
  useCreateTestCase,
  useUpdateTestCase,
  useDeleteTestCase,
  useCreateScenario,
  useUpdateScenario,
  useDeleteScenario,
} from './useScenarioMutations';

export {
  useUpdateStepField,
  useUpdateStepFields,
  useAddStep,
  useSyncSteps,
  useReorderSteps,
  useDeleteStep,
} from './useStepMutations';

export {
  useUpdateTypes,
  useCreateType,
  useCreateAction,
  useDeleteConfig,
  useCreateSelectConfig,
  useUpdateSelectConfig,
  useDeleteSelectConfig,
  useSaveSelectConfig,
  useCreateMatchConfig,
  useUpdateMatchConfig,
  useDeleteMatchConfig,
  useSaveMatchConfig,
} from './useConfigMutations';

export {
  useCreateReusableCase,
  useUpdateReusableCase,
  useDeleteReusableCase,
  useCopyReusableCase,
  useCreateReusableCaseFromCase,
} from './useReusableCasesMutations';
