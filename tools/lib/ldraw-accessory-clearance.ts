import { basename } from "node:path";
import { Box3, BufferGeometry, Group, Matrix4, Material, Mesh, Vector3 } from "three";

export const MIN_DIGITAL_HAND_GRIP_LENGTH_LDU = 8;
const MAX_ACCESSORY_EXTENT_LDU = 240;
const GRIP_NEIGHBORHOOD_RADIUS_LDU = 7;
const BODY_BOX_INSET_LDU = 0.25;

type LDrawMesh = Mesh<BufferGeometry, Material | Material[]>;

export type DigitalAccessoryValidation = {
  status: "passed" | "rejected";
  reasonCode: string | null;
  gripLengthLdu: number;
  modelBoundsLdu: {
    min: [number, number, number];
    max: [number, number, number];
    size: [number, number, number];
  } | null;
  sampledPointCount: number;
  protectedBodyBoxCount: number;
  collisionSampleCount: number;
  collisionSamplesByPart: Record<string, number>;
};

export type DigitalAccessoryGripEvaluation = {
  orientations: Array<{
    placementTransformLdu: number[];
    validation: DigitalAccessoryValidation;
  }>;
};

export type DigitalAccessoryGripSelection =
  | {
    status: "passed";
    reasonCode: null;
    safeGripCandidatesFound: 1;
    selectedGripCandidateIndex: number;
    selectedOrientationIndex: number;
  }
  | {
    status: "rejected";
    reasonCode: "no-safe-grip-candidate" | "multiple-safe-grip-candidates";
    safeGripCandidatesFound: number;
    selectedGripCandidateIndex: null;
    selectedOrientationIndex: null;
  };

export function selectUnambiguousDigitalAccessoryGrip(
  evaluations: readonly DigitalAccessoryGripEvaluation[],
): DigitalAccessoryGripSelection {
  const safeGrips = evaluations.flatMap(({ orientations }, gripIndex) => {
    const orientationIndex = orientations.findIndex(({ validation }) => validation.status === "passed");
    return orientationIndex >= 0 ? [{ gripIndex, orientationIndex }] : [];
  });
  if (safeGrips.length === 1) {
    return {
      status: "passed",
      reasonCode: null,
      safeGripCandidatesFound: 1,
      selectedGripCandidateIndex: safeGrips[0]!.gripIndex,
      selectedOrientationIndex: safeGrips[0]!.orientationIndex,
    };
  }
  return {
    status: "rejected",
    reasonCode: safeGrips.length === 0 ? "no-safe-grip-candidate" : "multiple-safe-grip-candidates",
    safeGripCandidatesFound: safeGrips.length,
    selectedGripCandidateIndex: null,
    selectedOrientationIndex: null,
  };
}

const roundedVector = (vector: Vector3): [number, number, number] => [
  Math.round(vector.x * 10_000) / 10_000,
  Math.round(vector.y * 10_000) / 10_000,
  Math.round(vector.z * 10_000) / 10_000,
];

function sampledPoints(model: Group, placement: Matrix4): Vector3[] {
  const points: Vector3[] = [];
  model.updateMatrixWorld(true);
  model.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    const mesh = object as LDrawMesh;
    const position = mesh.geometry.getAttribute("position");
    const index = mesh.geometry.getIndex();
    const count = index?.count ?? position.count;
    for (let offset = 0; offset + 2 < count; offset += 3) {
      const triangle = [offset, offset + 1, offset + 2].map((positionIndex) => {
        const vertexIndex = index ? index.getX(positionIndex) : positionIndex;
        return new Vector3().fromBufferAttribute(position, vertexIndex)
          .applyMatrix4(mesh.matrixWorld)
          .applyMatrix4(placement);
      });
      points.push(...triangle);
      points.push(triangle[0]!.clone().add(triangle[1]!).add(triangle[2]!).multiplyScalar(1 / 3));
    }
  });
  return points;
}

function protectedReferenceBoxes(referenceFigure: Group): Array<{ box: Box3; partName: string }> {
  const boxes: Array<{ box: Box3; partName: string }> = [];
  referenceFigure.updateMatrixWorld(true);
  referenceFigure.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    const box = new Box3().setFromObject(object);
    const center = box.getCenter(new Vector3());
    const sourceName = object.name || object.parent?.name || "unnamed-mesh";
    const partName = basename(sourceName.replaceAll("\\", "/")).toLowerCase();
    const isTargetHand = partName === "3820.dat" && center.x > 0;
    const isTargetArm = ["3818.dat", "3819.dat"].includes(partName) && center.x > 0;
    // The hand and its adjacent arm have overlapping broad bounds. They cannot be
    // used as conservative collision volumes without rejecting valid wrist grips.
    if (isTargetHand || isTargetArm) return;
    const inset = box.clone().expandByScalar(-BODY_BOX_INSET_LDU);
    boxes.push({ box: inset.isEmpty() ? box : inset, partName: partName || "unnamed-mesh" });
  });
  return boxes;
}

function rejected(reasonCode: string, gripLengthLdu: number): DigitalAccessoryValidation {
  return {
    status: "rejected",
    reasonCode,
    gripLengthLdu,
    modelBoundsLdu: null,
    sampledPointCount: 0,
    protectedBodyBoxCount: 0,
    collisionSampleCount: 0,
    collisionSamplesByPart: {},
  };
}

export function validateDigitalAccessoryPlacement(
  model: Group,
  referenceFigure: Group,
  placementTransformLdu: readonly number[],
  sourceGripCenterLdu: readonly [number, number, number],
  gripLengthLdu: number,
): DigitalAccessoryValidation {
  if (gripLengthLdu < MIN_DIGITAL_HAND_GRIP_LENGTH_LDU) return rejected("grip-too-short", gripLengthLdu);
  if (placementTransformLdu.length !== 16 || placementTransformLdu.some((value) => !Number.isFinite(value))) {
    return rejected("invalid-placement-transform", gripLengthLdu);
  }
  const placement = new Matrix4().fromArray([...placementTransformLdu]);
  const determinant = Math.abs(placement.determinant());
  if (determinant < 0.95 || determinant > 1.05) return rejected("non-rigid-placement-transform", gripLengthLdu);

  const rawPoints = sampledPoints(model, new Matrix4());
  if (rawPoints.length === 0) return rejected("no-renderable-geometry", gripLengthLdu);
  const rawBounds = new Box3().setFromPoints(rawPoints);
  const size = rawBounds.getSize(new Vector3());
  if (![size.x, size.y, size.z].every((value) => Number.isFinite(value) && value > 0)) {
    return rejected("invalid-model-bounds", gripLengthLdu);
  }
  if (Math.max(size.x, size.y, size.z) > MAX_ACCESSORY_EXTENT_LDU) {
    return rejected("accessory-extent-exceeds-limit", gripLengthLdu);
  }
  const sourceGripCenter = new Vector3(...sourceGripCenterLdu);
  if (!rawBounds.clone().expandByScalar(0.5).containsPoint(sourceGripCenter)) {
    return rejected("grip-outside-model-bounds", gripLengthLdu);
  }

  const placedPoints = sampledPoints(model, placement);
  const targetGripCenter = sourceGripCenter.clone().applyMatrix4(placement);
  const bodyBoxes = protectedReferenceBoxes(referenceFigure);
  const collisionSamplesByPart: Record<string, number> = {};
  let collisionSampleCount = 0;
  for (const point of placedPoints) {
    if (point.distanceTo(targetGripCenter) <= GRIP_NEIGHBORHOOD_RADIUS_LDU) continue;
    const collisions = bodyBoxes.filter(({ box }) => box.containsPoint(point));
    if (collisions.length === 0) continue;
    collisionSampleCount += 1;
    for (const { partName } of collisions) {
      collisionSamplesByPart[partName] = (collisionSamplesByPart[partName] ?? 0) + 1;
    }
  }

  return {
    status: collisionSampleCount === 0 ? "passed" : "rejected",
    reasonCode: collisionSampleCount === 0 ? null : "reference-figure-clearance-failed",
    gripLengthLdu,
    modelBoundsLdu: {
      min: roundedVector(rawBounds.min),
      max: roundedVector(rawBounds.max),
      size: roundedVector(size),
    },
    sampledPointCount: placedPoints.length,
    protectedBodyBoxCount: bodyBoxes.length,
    collisionSampleCount,
    collisionSamplesByPart,
  };
}

export const digitalAccessoryLimits = {
  minimumGripLengthLdu: MIN_DIGITAL_HAND_GRIP_LENGTH_LDU,
  maximumAccessoryExtentLdu: MAX_ACCESSORY_EXTENT_LDU,
  gripNeighborhoodRadiusLdu: GRIP_NEIGHBORHOOD_RADIUS_LDU,
  bodyBoxInsetLdu: BODY_BOX_INSET_LDU,
} as const;
