import { describe, expect, it } from "vitest";
import {
  handGripEvidenceFromLDCadShadow,
  parseLDCadSnapCylinders,
} from "../../tools/lib/ldcad-shadow-connectivity.js";

describe("LDCad Shadow hand-grip metadata", () => {
  it("parses explicit SNAP_CYL position, orientation and sections", () => {
    const cylinders = parseLDCadSnapCylinders(
      "0 !LDCAD SNAP_CYL [gender=M] [secs=R 4 20] [pos=0 10 0] [ori=1 0 0 0 1 0 0 0 1]",
    );
    expect(cylinders).toEqual([{
      gender: "M",
      center: false,
      positionLdu: [0, 10, 0],
      orientation: [1, 0, 0, 0, 1, 0, 0, 0, 1],
      sections: [{ shape: "R", radiusLdu: 4, lengthLdu: 20 }],
      lineNumber: 1,
    }]);
  });

  it("uses the midpoint of a non-centered section extending along local negative Y", () => {
    const evidence = handGripEvidenceFromLDCadShadow(
      "parts/29109.dat",
      "0 !LDCAD SNAP_CYL [gender=M] [secs=R 4 20] [pos=0 10 0]",
    );
    expect(evidence).toHaveLength(1);
    expect(evidence[0]).toMatchObject({
      primitive: "ldcad-shadow:parts/29109.dat#SNAP_CYL:1",
      radiusLdu: 4,
      lengthLdu: 20,
      centerLdu: [0, 0, 0],
      axis: [0, -20, 0],
    });
    expect(evidence[0]?.sourceConnectorTransformLdu).toHaveLength(16);
  });

  it("respects centered cylinders and their orientation", () => {
    const evidence = handGripEvidenceFromLDCadShadow(
      "parts/test.dat",
      "0 !LDCAD SNAP_CYL [gender=M] [secs=R 4 12] [center=true] [pos=2 3 4] [ori=1 0 0 0 0 1 0 -1 0]",
    );
    expect(evidence[0]).toMatchObject({
      centerLdu: [2, 3, 4],
      axis: [0, 0, 12],
    });
  });

  it("rejects female, short, non-round and multi-section profiles", () => {
    const source = [
      "0 !LDCAD SNAP_CYL [gender=F] [secs=R 4 20]",
      "0 !LDCAD SNAP_CYL [gender=M] [secs=R 4 7]",
      "0 !LDCAD SNAP_CYL [gender=M] [secs=A 4 20]",
      "0 !LDCAD SNAP_CYL [gender=M] [secs=R 4 10 R 6 2]",
    ].join("\n");
    expect(handGripEvidenceFromLDCadShadow("parts/test.dat", source)).toEqual([]);
  });
});
