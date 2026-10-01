# ADR-017: Role-specific assembly boundary

## Status

Accepted, 2026-10-01.

## Context

The catalog classified 97 uniquely mapped torso/legs entries as needing a role-specific assembly profile. Rebrickable's category assignment includes both complete assemblies and individual components or parts from other figure families. Treating every mapped file as a complete builder slot would display isolated arms, hands, hips or incompatible Battle Droid, Bigfig, Technic and Super Mario parts as if they were interchangeable minifigure assemblies.

## Decision

Only official models that are complete assemblies and use the existing standard minifigure torso-slot origin are builder eligible. The official one-piece torso `17` and complete shortcut `37191c01` satisfy that rule. The other 95 reviewed mappings remain catalogued but are classified as `reviewed-incompatible-assembly`.

The reviewed queue is pinned by count and SHA-256 in `data/curated/ldraw-role-assembly-review.json`. A later Rebrickable or official LDraw update that changes the queue must fail generation until the changed set is reviewed again. This review uses only locked Rebrickable Catalog Downloads/CSV and the pinned official LDraw library; no API or MOC files are used.

## Consequences

- Two additional complete torso assemblies receive local models and thumbnails and become selectable.
- Ninety-five known component or non-standard-family mappings no longer appear as unfinished placement work.
- Supporting Battle Droids, Bigfigs or other figure families later requires an explicit builder-family design instead of guessed transforms.
