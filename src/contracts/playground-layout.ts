import { z } from "zod";

export const PLAYGROUND_LAYOUT_MAX_FIGURES = 6;
export const PLAYGROUND_MAX_STAGES = 100;

const savedFigureIdSchema = z.string().trim().min(1).max(120);
const stageIdSchema = z.string().trim().min(1).max(120);
const stageNameSchema = z.string().trim().min(1).max(60);

export const playgroundLayoutSchema = z
  .object({
    schemaVersion: z.literal(1),
    kind: z.literal("figforge-playground-layout"),
    updatedAt: z.iso.datetime(),
    savedFigureIds: z.array(savedFigureIdSchema).max(PLAYGROUND_LAYOUT_MAX_FIGURES),
  })
  .strict()
  .superRefine((layout, context) => {
    if (new Set(layout.savedFigureIds).size !== layout.savedFigureIds.length) {
      context.addIssue({
        code: "custom",
        path: ["savedFigureIds"],
        message: "Playground figures must be unique",
      });
    }
  });

export type PlaygroundLayout = z.infer<typeof playgroundLayoutSchema>;

export const playgroundStageSchema = z
  .object({
    id: stageIdSchema,
    name: stageNameSchema,
    savedFigureIds: z.array(savedFigureIdSchema).max(PLAYGROUND_LAYOUT_MAX_FIGURES),
  })
  .strict()
  .superRefine((stage, context) => {
    if (new Set(stage.savedFigureIds).size !== stage.savedFigureIds.length) {
      context.addIssue({
        code: "custom",
        path: ["savedFigureIds"],
        message: "Stage figures must be unique",
      });
    }
  });

export type PlaygroundStage = z.infer<typeof playgroundStageSchema>;

export const playgroundStagesSchema = z
  .object({
    schemaVersion: z.literal(2),
    kind: z.literal("figforge-playground-stages"),
    updatedAt: z.iso.datetime(),
    activeStageId: stageIdSchema,
    stages: z.array(playgroundStageSchema).min(1).max(PLAYGROUND_MAX_STAGES),
  })
  .strict()
  .superRefine((playground, context) => {
    const ids = playground.stages.map(({ id }) => id);
    if (new Set(ids).size !== ids.length) {
      context.addIssue({
        code: "custom",
        path: ["stages"],
        message: "Stage IDs must be unique",
      });
    }
    if (!ids.includes(playground.activeStageId)) {
      context.addIssue({
        code: "custom",
        path: ["activeStageId"],
        message: "Active stage must exist",
      });
    }
  });

export type PlaygroundStages = z.infer<typeof playgroundStagesSchema>;

export const createPlaygroundLayout = (
  savedFigureIds: readonly string[],
  updatedAt = new Date().toISOString(),
): PlaygroundLayout =>
  playgroundLayoutSchema.parse({
    schemaVersion: 1,
    kind: "figforge-playground-layout",
    updatedAt,
    savedFigureIds,
  });

export const createEmptyPlaygroundLayout = (updatedAt = new Date().toISOString()): PlaygroundLayout =>
  createPlaygroundLayout([], updatedAt);

export const createPlaygroundStage = (
  id: string,
  name: string,
  savedFigureIds: readonly string[] = [],
): PlaygroundStage => playgroundStageSchema.parse({ id, name, savedFigureIds });

export const createPlaygroundStages = (
  stages: readonly PlaygroundStage[],
  activeStageId = stages[0]?.id,
  updatedAt = new Date().toISOString(),
): PlaygroundStages => playgroundStagesSchema.parse({
  schemaVersion: 2,
  kind: "figforge-playground-stages",
  updatedAt,
  activeStageId,
  stages,
});

export const migratePlaygroundLayout = (
  layout: PlaygroundLayout,
  stageName = "My stage",
  stageId = "stage-main",
): PlaygroundStages => createPlaygroundStages(
  [createPlaygroundStage(stageId, stageName, layout.savedFigureIds)],
  stageId,
  layout.updatedAt,
);

export const reconcilePlaygroundLayout = (
  layout: PlaygroundLayout,
  availableFigureIds: ReadonlySet<string>,
  updatedAt = layout.updatedAt,
): PlaygroundLayout => playgroundLayoutSchema.parse({
  ...layout,
  updatedAt,
  savedFigureIds: layout.savedFigureIds.filter((id) => availableFigureIds.has(id)),
});

export const reconcilePlaygroundStages = (
  playground: PlaygroundStages,
  availableFigureIds: ReadonlySet<string>,
  updatedAt = playground.updatedAt,
): PlaygroundStages => createPlaygroundStages(
  playground.stages.map((stage) => createPlaygroundStage(
    stage.id,
    stage.name,
    stage.savedFigureIds.filter((id) => availableFigureIds.has(id)),
  )),
  playground.activeStageId,
  updatedAt,
);
