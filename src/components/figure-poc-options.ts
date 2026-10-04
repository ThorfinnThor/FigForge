import type { CameraPreset, ScenePartDefinition } from "../scene/types.js";

export const HEAD_OPTIONS: readonly ScenePartDefinition[] = [
  { id: "ff03-head-3626c", label: "3626c · ohne Druck", slot: "head", placementFamily: "fixture-standard-head", fixtureStyle: "plain" },
  { id: "ff03-head-3626cpr0001", label: "3626cpr0001 · Standardgrinsen", slot: "head", placementFamily: "fixture-standard-head", fixtureStyle: "grin" },
  { id: "ff03-head-3626cpr0008", label: "3626cpr0008 · Brauen und Lächeln", slot: "head", placementFamily: "fixture-standard-head", fixtureStyle: "brows" },
  { id: "ff03-head-3626cpr0387", label: "3626cpr0387 · dünnes Grinsen", slot: "head", placementFamily: "fixture-standard-head", fixtureStyle: "grin" },
  { id: "ff03-head-3626cpr0495", label: "3626cpr0495 · erschrockenes Lächeln", slot: "head", placementFamily: "fixture-standard-head", fixtureStyle: "brows" },
];

export const HEADWEAR_OPTIONS: readonly ScenePartDefinition[] = [
  { id: "ff03-headwear-3901", label: "3901 · glattes Haar", slot: "headwear", placementFamily: "fixture-standard-headwear", fixtureStyle: "headwear" },
  { id: "ff03-headwear-10048", label: "10048 · zerzaustes Haar", slot: "headwear", placementFamily: "fixture-standard-headwear", fixtureStyle: "headwear" },
  { id: "ff03-headwear-25405", label: "25405 · Pferdeschwanz", slot: "headwear", placementFamily: "fixture-standard-headwear", fixtureStyle: "headwear" },
  { id: "ff03-headwear-25409", label: "25409 · Seitenscheitel", slot: "headwear", placementFamily: "fixture-standard-headwear", fixtureStyle: "headwear" },
  { id: "ff03-headwear-36268", label: "36268 · Bob-Frisur", slot: "headwear", placementFamily: "fixture-standard-headwear", fixtureStyle: "headwear" },
];

const HAND_ACCESSORY_OPTIONS: readonly (Omit<ScenePartDefinition, "id" | "slot"> & { key: string })[] = [
  { key: "10053", label: "10053 · kleines Schwert", placementFamily: "fixture-standard-grip", fixtureStyle: "hand-tool" },
  { key: "11439", label: "11439 · gezacktes Schwert", placementFamily: "fixture-standard-grip", fixtureStyle: "hand-shield" },
  { key: "3841", label: "3841 · Stab-Prüfgeometrie", placementFamily: "fixture-standard-grip", fixtureStyle: "hand-staff" },
];

export const LEFT_HAND_OPTIONS: readonly ScenePartDefinition[] = HAND_ACCESSORY_OPTIONS.map(
  ({ key: _key, ...option }) => ({ ...option, id: `ff03-hand-${_key}-left`, slot: "leftHandAccessory" as const }),
);

export const RIGHT_HAND_OPTIONS: readonly ScenePartDefinition[] = HAND_ACCESSORY_OPTIONS.map(
  ({ key: _key, ...option }) => ({ ...option, id: `ff03-hand-${_key}-right`, slot: "rightHandAccessory" as const }),
);

export const CAMERA_PRESETS: ReadonlyArray<{ id: CameraPreset }> = [
  { id: "three-quarter" },
  { id: "front" },
  { id: "back" },
];
