import {
  BoxGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  SphereGeometry,
  TorusGeometry,
} from "three";
import { disposeObject3D } from "./dispose-object.js";
import type { LoadedScenePart, ScenePartDefinition, ScenePartLoader } from "./types.js";

const plastic = {
  roughness: 0.58,
  metalness: 0.02,
} as const;

function mesh(
  geometry: BoxGeometry | CylinderGeometry | SphereGeometry | TorusGeometry,
  color: number,
): Mesh {
  return new Mesh(geometry, new MeshStandardMaterial({ color, ...plastic }));
}

export function createFixtureFigureBase(): {
  root: Group;
  legsAssembly: Group;
  torsoAssembly: Group;
} {
  const root = new Group();
  root.name = "synthetic-ff04-figure-base";
  root.userData.appearance = "synthetic-verification-fixture";
  const legsAssembly = new Group();
  legsAssembly.name = "legsAssembly";
  const torsoAssembly = new Group();
  torsoAssembly.name = "torsoAssembly";
  root.add(legsAssembly, torsoAssembly);

  const leftLeg = mesh(new BoxGeometry(0.38, 1.05, 0.48), 0x234761);
  leftLeg.position.set(-0.22, 0.58, 0);
  legsAssembly.add(leftLeg);

  const rightLeg = leftLeg.clone();
  rightLeg.geometry = leftLeg.geometry.clone();
  rightLeg.material = (leftLeg.material as MeshStandardMaterial).clone();
  rightLeg.position.x = 0.22;
  legsAssembly.add(rightLeg);

  const hips = mesh(new BoxGeometry(0.88, 0.32, 0.5), 0x172c3d);
  hips.position.y = 1.18;
  legsAssembly.add(hips);

  const torso = mesh(new BoxGeometry(1.12, 1.05, 0.58), 0xc84d36);
  torso.position.y = 1.84;
  torsoAssembly.add(torso);

  for (const side of [-1, 1]) {
    const arm = mesh(new BoxGeometry(0.28, 0.94, 0.32), 0xc84d36);
    arm.position.set(side * 0.73, 1.78, 0);
    arm.rotation.z = side * -0.08;
    torsoAssembly.add(arm);

    const hand = mesh(new SphereGeometry(0.19, 20, 12), 0xf2cd37);
    hand.position.set(side * 0.77, 1.23, 0);
    torsoAssembly.add(hand);
  }

  const neck = mesh(new CylinderGeometry(0.22, 0.22, 0.24, 24), 0xf2cd37);
  neck.position.y = 2.49;
  torsoAssembly.add(neck);

  return { root, legsAssembly, torsoAssembly };
}

function createFaceFeature(geometry: BoxGeometry | SphereGeometry | TorusGeometry): Mesh {
  return mesh(geometry, 0x1f1b16);
}

function createFixtureHead(definition: ScenePartDefinition): Group {
  const group = new Group();
  group.name = `synthetic-${definition.id}`;
  group.userData.appearance = "synthetic-verification-fixture";
  group.userData.catalogVariantId = definition.id;

  const head = mesh(new CylinderGeometry(0.52, 0.52, 0.72, 36), 0xf2cd37);
  group.add(head);

  const stud = mesh(new CylinderGeometry(0.25, 0.25, 0.2, 28), 0xf2cd37);
  stud.position.y = 0.46;
  group.add(stud);

  if (definition.fixtureStyle !== "plain") {
    for (const side of [-1, 1]) {
      const eye = createFaceFeature(new SphereGeometry(0.055, 12, 8));
      eye.position.set(side * 0.18, 0.08, 0.5);
      group.add(eye);
    }

    const mouth = createFaceFeature(new TorusGeometry(0.17, 0.025, 8, 18, Math.PI));
    mouth.position.set(0, -0.08, 0.51);
    mouth.rotation.z = Math.PI;
    group.add(mouth);
  }

  if (definition.fixtureStyle === "brows") {
    for (const side of [-1, 1]) {
      const brow = createFaceFeature(new BoxGeometry(0.18, 0.035, 0.035));
      brow.position.set(side * 0.18, 0.22, 0.51);
      brow.rotation.z = side * -0.14;
      group.add(brow);
    }
  }

  return group;
}

function createFixtureHeadwear(definition: ScenePartDefinition): Group {
  const group = new Group();
  group.name = `synthetic-${definition.id}`;
  group.userData.appearance = "synthetic-verification-fixture";
  group.userData.catalogVariantId = definition.id;

  const cap = mesh(new CylinderGeometry(0.58, 0.54, 0.28, 36), 0x352517);
  cap.position.y = 0.1;
  group.add(cap);
  const crown = mesh(new SphereGeometry(0.43, 24, 12), 0x352517);
  crown.scale.y = 0.55;
  crown.position.y = 0.27;
  group.add(crown);
  return group;
}

function createFixtureHandTool(definition: ScenePartDefinition): Group {
  const group = new Group();
  group.name = `synthetic-${definition.id}`;
  group.userData.appearance = "synthetic-verification-fixture";
  group.userData.catalogVariantId = definition.id;

  const grip = mesh(new CylinderGeometry(0.055, 0.055, 0.5, 18), 0x4c3c2c);
  group.add(grip);
  const tool = mesh(new BoxGeometry(0.14, 0.8, 0.08), 0x9b9b94);
  tool.position.y = 0.64;
  group.add(tool);
  return group;
}

function createFixtureHandShield(definition: ScenePartDefinition): Group {
  const group = new Group();
  group.name = `synthetic-${definition.id}`;
  group.userData.appearance = "synthetic-verification-fixture";
  group.userData.catalogVariantId = definition.id;
  const shield = mesh(new BoxGeometry(0.28, 0.44, 0.1), 0x5c8db8);
  shield.position.z = 0.08;
  group.add(shield);
  return group;
}

function createFixtureHandStaff(definition: ScenePartDefinition): Group {
  const group = new Group();
  group.name = `synthetic-${definition.id}`;
  group.userData.appearance = "synthetic-verification-fixture";
  group.userData.catalogVariantId = definition.id;
  const shaft = mesh(new CylinderGeometry(0.045, 0.045, 0.9, 16), 0x8c5b39);
  shaft.position.y = 0.35;
  shaft.rotation.z = -0.12;
  const tip = mesh(new CylinderGeometry(0, 0.1, 0.22, 16), 0xc58b32);
  tip.position.y = 0.84;
  group.add(shaft, tip);
  return group;
}

export class FixturePartLoader implements ScenePartLoader {
  async load(definition: ScenePartDefinition, signal: AbortSignal): Promise<LoadedScenePart> {
    await Promise.resolve();
    if (signal.aborted) {
      throw new DOMException("Part load was aborted", "AbortError");
    }

    const object =
      definition.slot === "head"
        ? createFixtureHead(definition)
        : definition.slot === "headwear"
          ? createFixtureHeadwear(definition)
          : definition.fixtureStyle === "hand-shield"
            ? createFixtureHandShield(definition)
            : definition.fixtureStyle === "hand-staff"
              ? createFixtureHandStaff(definition)
              : createFixtureHandTool(definition);
    return {
      definition,
      object,
      dispose: () => disposeObject3D(object),
    };
  }
}
