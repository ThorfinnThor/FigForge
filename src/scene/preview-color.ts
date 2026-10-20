import { Color, Mesh, type Material, type Object3D } from "three";

/** Every FigForge catalog model declares its main colour as this custom LDraw colour code. */
export const CATALOG_MAIN_COLOR_CODE = "10000";

export type PreviewColor = { hex: string; alpha: number };

type OriginalAppearance = { color: Color; opacity: number; transparent: boolean; depthWrite: boolean };

const ORIGINAL_KEY = "figforgeOriginalAppearance";

const isMainColorMaterial = (material: Material): boolean => String(material.userData.code) === CATALOG_MAIN_COLOR_CODE;

const ownedMaterial = (mesh: Object3D, material: Material, index: number | null): Material => {
  if (material.userData[ORIGINAL_KEY]) return material;
  // The LDraw loader may share one material between meshes, so every mesh gets its own copy.
  const copy = material.clone();
  const color = (material as Material & { color?: Color }).color;
  copy.userData[ORIGINAL_KEY] = {
    color: color ? color.clone() : new Color(0xffffff),
    opacity: material.opacity,
    transparent: material.transparent,
    depthWrite: material.depthWrite,
  } satisfies OriginalAppearance;
  if (index === null) Reflect.set(mesh, "material", copy);
  else (Reflect.get(mesh, "material") as Material[])[index] = copy;
  return copy;
};

const paint = (material: Material, color: PreviewColor | undefined): void => {
  const original = material.userData[ORIGINAL_KEY] as OriginalAppearance | undefined;
  const target = material as Material & { color?: Color };
  if (!original || !target.color) return;
  if (color) {
    target.color.set(color.hex);
    material.opacity = color.alpha;
    material.transparent = color.alpha < 1;
    material.depthWrite = color.alpha >= 1;
  } else {
    target.color.copy(original.color);
    material.opacity = original.opacity;
    material.transparent = original.transparent;
    material.depthWrite = original.depthWrite;
  }
  material.needsUpdate = true;
};

/**
 * Shows `color` as the main colour of a loaded catalog model, or restores the model colour when
 * it is undefined. Only the main colour changes: parts of the model with their own fixed
 * colours (printed details, arms, hands) keep them.
 */
export function applyPreviewColor(root: Object3D, color: PreviewColor | undefined): void {
  root.traverse((child) => {
    if (!(child instanceof Mesh)) return;
    const materials: unknown = Reflect.get(child, "material");
    const update = (material: Material, index: number | null): void => {
      if (!isMainColorMaterial(material)) return;
      // Nothing to restore on a material that was never recoloured.
      if (!color && !material.userData[ORIGINAL_KEY]) return;
      paint(ownedMaterial(child, material, index), color);
    };
    if (Array.isArray(materials)) (materials as Material[]).forEach(update);
    else update(materials as Material, null);
  });
}
