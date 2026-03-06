import { describe, expect, it } from "vitest";
import sample1 from "../../samples/sample1.json";
import sample2 from "../../samples/sample2.json";
import { parseArcGisReport } from "@/parsers/arcgis-report-parser";
import { normalizeReport } from "@/parsers/normalize";

describe("arcgis parser", () => {
  it("parses sample1", () => {
    const parsed = parseArcGisReport(sample1);
    const result = normalizeReport(parsed);
    expect(result.model.portal?.version?.length || 0).toBeGreaterThan(0);
    expect(result.model.server_sites.length).toBeGreaterThan(0);
    expect(result.model.data_store_groups.length).toBeGreaterThan(0);
  });

  it("parses sample2", () => {
    const parsed = parseArcGisReport(sample2);
    const result = normalizeReport(parsed);
    expect(result.model.server_sites.length).toBeGreaterThan(0);
    expect(result.model.machines.length).toBeGreaterThan(1);
    expect(result.warnings.length).toBeGreaterThanOrEqual(0);
  });

  it("throws on invalid payload", () => {
    expect(() => parseArcGisReport({ nope: true })).toThrowError();
  });
});
