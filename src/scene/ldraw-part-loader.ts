import { LDrawLoader } from "three/addons/loaders/LDrawLoader.js";
import { disposeObject3D } from "./dispose-object.js";
import type { LoadedScenePart, ScenePartDefinition, ScenePartLoader } from "./types.js";

const LDRAW_EXTENSION = /\.(?:dat|ldr|mpd)$/iu;

export function assertInternalLDrawUrl(assetUrl: string, baseUrl: string): URL {
  const resolved = new URL(assetUrl, baseUrl);
  const base = new URL(baseUrl);
  if (resolved.origin !== base.origin || !LDRAW_EXTENSION.test(resolved.pathname)) {
    throw new Error("LDraw assets must be same-origin .dat, .ldr or .mpd files");
  }
  return resolved;
}

export class LDrawPartLoader implements ScenePartLoader {
  readonly #loader: LDrawLoader;

  constructor(partsLibraryPath: string, managerBaseUrl = globalThis.location?.href) {
    if (!managerBaseUrl) {
      throw new Error("A browser base URL is required for the LDraw loader");
    }
    const libraryUrl = new URL(partsLibraryPath, managerBaseUrl);
    const baseUrl = new URL(managerBaseUrl);
    if (libraryUrl.origin !== baseUrl.origin) {
      throw new Error("The LDraw parts library must be same-origin");
    }
    this.#loader = new LDrawLoader().setPartsLibraryPath(libraryUrl.href);
  }

  async load(definition: ScenePartDefinition, signal: AbortSignal): Promise<LoadedScenePart> {
    if (signal.aborted) {
      throw new DOMException("Part load was aborted", "AbortError");
    }
    if (!definition.asset || definition.asset.kind !== "ldraw") {
      throw new Error(`No LDraw asset is registered for ${definition.id}`);
    }
    const baseUrl = globalThis.location?.href;
    if (!baseUrl) {
      throw new Error("A browser base URL is required for the LDraw loader");
    }
    const assetUrl = assertInternalLDrawUrl(definition.asset.url, baseUrl);
    const object = await this.#loader.loadAsync(assetUrl.href);
    if (signal.aborted) {
      disposeObject3D(object);
      throw new DOMException("Part load was aborted", "AbortError");
    }
    object.name = definition.id;
    object.userData.catalogVariantId = definition.id;
    object.userData.appearance = "evidence-backed-asset";
    return {
      definition,
      object,
      dispose: () => disposeObject3D(object),
    };
  }
}
