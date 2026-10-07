import { z } from "zod";

export const PLAYGROUND_LAYOUT_MAX_FIGURES = 6;

const savedFigureIdSchema = z.string().trim().min(1).max(120);

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

export const reconcilePlaygroundLayout = (
  layout: PlaygroundLayout,
  availableFigureIds: ReadonlySet<string>,
  updatedAt = layout.updatedAt,
): PlaygroundLayout => playgroundLayoutSchema.parse({
  ...layout,
  updatedAt,
  savedFigureIds: layout.savedFigureIds.filter((id) => availableFigureIds.has(id)),
});
