import { BufferGeometry, Material, Mesh, Object3D, Texture } from "three";

type Disposable = { dispose: () => void };

function isDisposable(value: unknown): value is Disposable {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof Reflect.get(value, "dispose") === "function"
  );
}

function disposeMaterial(
  material: unknown,
  disposedMaterials: Set<unknown>,
  disposedTextures: Set<unknown>,
): void {
  if (typeof material !== "object" || material === null) {
    return;
  }
  if (disposedMaterials.has(material)) {
    return;
  }
  disposedMaterials.add(material);
  for (const key of Object.keys(material)) {
    const value = Reflect.get(material, key) as unknown;
    if (
      typeof value === "object" &&
      value !== null &&
      Reflect.get(value, "isTexture") === true &&
      isDisposable(value) &&
      !disposedTextures.has(value)
    ) {
      disposedTextures.add(value);
      value.dispose();
    }
  }
  if (isDisposable(material)) {
    material.dispose();
  }
}

export function disposeObject3D(object: Object3D): void {
  const disposedGeometries = new Set<unknown>();
  const disposedMaterials = new Set<unknown>();
  const disposedTextures = new Set<unknown>();
  object.traverse((child) => {
    if (!(child instanceof Mesh)) {
      return;
    }
    const geometry: unknown = child.geometry;
    if (isDisposable(geometry) && !disposedGeometries.has(geometry)) {
      disposedGeometries.add(geometry);
      geometry.dispose();
    }
    const material: unknown = child.material;
    if (Array.isArray(material)) {
      for (const candidate of material) {
        disposeMaterial(candidate, disposedMaterials, disposedTextures);
      }
    } else {
      disposeMaterial(material, disposedMaterials, disposedTextures);
    }
  });
}

function cloneMaterial(material: Material): Material {
  const clone = material.clone();
  for (const key of Object.keys(material)) {
    const value = Reflect.get(material, key) as unknown;
    if (value instanceof Texture) {
      const texture = value.clone();
      texture.needsUpdate = true;
      Reflect.set(clone, key, texture);
    }
  }
  return clone;
}

export function cloneObject3DResources<T extends Object3D>(source: T): T {
  const clone = source.clone(true);
  clone.traverse((child) => {
    if (!(child instanceof Mesh)) {
      return;
    }
    const mesh = child as Mesh<BufferGeometry, Material | Material[]>;
    mesh.geometry = mesh.geometry.clone();
    mesh.material = Array.isArray(mesh.material)
      ? mesh.material.map((material) => cloneMaterial(material))
      : cloneMaterial(mesh.material);
  });
  return clone;
}
