import type { Group } from "three";
import type { AnchorSlot } from "../contracts/anchor-registry.js";

export type CameraPreset = "three-quarter" | "front" | "back";
export type FigureSlot = AnchorSlot;

export type LDrawCatalogRole = "head" | "headwear" | "torsoAssembly" | "handAccessory";

export type LDrawCatalogSelection = {
  componentId: string;
  label: string;
  ldrawFile: string;
  ldrawUpdate: string;
  modelUrl: string;
  placementMode: "prototype-family-origin" | "snap-connector";
  placementTransformLdu: readonly number[];
  rebrickablePartNum: string;
  role: LDrawCatalogRole;
};

export type ScenePartDefinition = {
  id: string;
  label: string;
  slot: FigureSlot;
  placementFamily: string;
  fixtureStyle: "plain" | "grin" | "brows" | "headwear" | "hand-tool" | "hand-shield" | "hand-staff";
  asset?: {
    kind: "ldraw";
    url: string;
  };
};

export type LoadedScenePart = {
  definition: ScenePartDefinition;
  object: Group;
  dispose: () => void;
};

export interface ScenePartLoader {
  load(definition: ScenePartDefinition, signal: AbortSignal): Promise<LoadedScenePart>;
  dispose?(): void;
}

export type SwapResult =
  | { status: "applied"; variantId: string }
  | { status: "superseded"; variantId: string }
  | { status: "disposed"; variantId: string };
