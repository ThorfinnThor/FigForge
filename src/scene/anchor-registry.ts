import { Group, Matrix4, Quaternion, Vector3 } from "three";
import type {
  AnchorDefinition,
  AnchorRegistryDocument,
  AnchorSlot,
} from "../contracts/anchor-registry.js";

export type SlotRoots = Record<AnchorSlot, Group>;

function applyMatrix(group: Group, values: number[]): void {
  const matrix = new Matrix4().fromArray(values);
  matrix.decompose(group.position, group.quaternion, group.scale);
  group.updateMatrix();
}

export class AnchorRegistry {
  readonly #anchors = new Map<AnchorSlot, AnchorDefinition>();

  constructor(readonly document: AnchorRegistryDocument) {
    for (const anchor of document.anchors) {
      this.#anchors.set(anchor.slot, anchor);
    }
  }

  getAnchor(slot: AnchorSlot): AnchorDefinition {
    const anchor = this.#anchors.get(slot);
    if (!anchor) {
      throw new Error(`No anchor is registered for ${slot}`);
    }
    return anchor;
  }

  assertPlacement(slot: AnchorSlot, placementFamily: string): void {
    const anchor = this.getAnchor(slot);
    if (anchor.placementFamily !== placementFamily) {
      throw new Error(
        `Placement family ${placementFamily} is not allowed in ${slot}; expected ${anchor.placementFamily}`,
      );
    }
    if (anchor.reviewStatus === "rejected") {
      throw new Error(`Anchor ${anchor.id} is rejected`);
    }
  }

  createSlotRoots(torsoAssembly: Group): SlotRoots {
    const roots: SlotRoots = {
      head: new Group(),
      headwear: new Group(),
      leftHandAccessory: new Group(),
      rightHandAccessory: new Group(),
    };
    for (const [slot, root] of Object.entries(roots) as Array<[AnchorSlot, Group]>) {
      root.name = `slot:${slot}`;
      const anchor = this.getAnchor(slot);
      applyMatrix(root, anchor.transform);
      const parent = anchor.parent === "head" ? roots.head : torsoAssembly;
      parent.add(root);
    }
    torsoAssembly.updateMatrixWorld(true);
    return roots;
  }

  getWorldTransform(slotRoots: SlotRoots, slot: AnchorSlot): {
    position: Vector3;
    quaternion: Quaternion;
    scale: Vector3;
  } {
    const root = slotRoots[slot];
    root.updateWorldMatrix(true, false);
    const position = new Vector3();
    const quaternion = new Quaternion();
    const scale = new Vector3();
    root.matrixWorld.decompose(position, quaternion, scale);
    return { position, quaternion, scale };
  }
}
