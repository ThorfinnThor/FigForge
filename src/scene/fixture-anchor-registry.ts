import fixtureRegistryJson from "../../data/curated/ff05-anchor-registry.json" with { type: "json" };
import type { AnchorRegistryDocument } from "../contracts/anchor-registry.js";
import { AnchorRegistry } from "./anchor-registry.js";

export const fixtureAnchorRegistry = new AnchorRegistry(
  fixtureRegistryJson as AnchorRegistryDocument,
);
