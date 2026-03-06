import { z } from "zod";

const reportSchema = z.object({
  meta: z.unknown().optional(),
  siteMap: z.unknown().optional(),
  portal: z.unknown().optional(),
  federated_servers: z.unknown().optional(),
  refresh: z.unknown().optional()
})
  .passthrough()
  .refine(
    (value) =>
      value.siteMap !== undefined ||
      value.portal !== undefined ||
      value.federated_servers !== undefined ||
      value.refresh !== undefined ||
      value.meta !== undefined,
    "Expected ArcGIS Enterprise discovery payload sections"
  );

export type ParsedArcGisReport = z.infer<typeof reportSchema>;

export function parseArcGisReport(input: unknown): ParsedArcGisReport {
  return reportSchema.parse(input);
}
