import {
  buildEvidenceCatalog,
  writeEvidenceCatalog
} from "@/lib/ebos/evidence";
import type { EbosEvidenceCatalog } from "@/lib/ebos/evidence";

async function main() {
  const catalog = await buildEvidenceCatalog();
  const paths = await writeEvidenceCatalog(catalog);

  if (catalog.totalEntries === 0) {
    console.warn("Warning: no EBOS evidence JSON files were found. Empty catalog generated.");
  }

  console.log("EBOS evidence catalog indexed:");
  console.log(`- totalEntries: ${catalog.totalEntries}`);
  console.log(`- entries by kind: ${JSON.stringify(catalog.summary.byKind)}`);
  console.log(`- latestByKind: ${JSON.stringify(formatLatestByKind(catalog.summary.latestByKind))}`);
  console.log(`- missingKinds: ${catalog.summary.missingKinds.join(", ") || "none"}`);
  console.log(`- averageScore: ${catalog.summary.averageScore ?? "unknown"}`);
  console.log(`- criticalWarningsCount: ${catalog.summary.criticalWarningsCount}`);
  console.log(`- openActionItemsCount: ${catalog.summary.openActionItemsCount}`);
  console.log("- catalog paths:");
  console.log(`  - ${paths.datedPath}`);
  console.log(`  - ${paths.latestPath}`);
}

function formatLatestByKind(
  latestByKind: EbosEvidenceCatalog["summary"]["latestByKind"]
) {
  return Object.fromEntries(
    Object.entries(latestByKind).map(([kind, entry]) => [
      kind,
      {
        targetDate: entry.targetDate,
        generatedAt: entry.generatedAt,
        filePath: entry.filePath
      }
    ])
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
