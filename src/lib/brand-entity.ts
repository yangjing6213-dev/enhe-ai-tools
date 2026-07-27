import {
  absoluteUrl,
  buildOrganizationSchema,
  siteName,
} from "@/lib/seo";

type OrganizationSchemaInput = Parameters<typeof buildOrganizationSchema>[0];

type EnheOrganizationSchemaInput = Pick<
  OrganizationSchemaInput,
  "contactPoint" | "description" | "logo" | "url"
>;

export const enheOrganizationId = absoluteUrl("/#organization");

export const enheOrganizationReference = {
  "@id": enheOrganizationId,
} as const;

export function buildEnheOrganizationSchema(
  input: EnheOrganizationSchemaInput = {},
) {
  return buildOrganizationSchema({
    ...input,
    name: siteName,
    id: enheOrganizationId,
    alternateName: ["恩禾 ENHE AI", "恩禾AI"],
    sameAs: ["https://github.com/hqwzhu/enhe-ai-tools"],
    knowsAbout: [
      "AI tools",
      "AI productivity workflows",
      "AI skill learning",
      "local AI deployment",
      "AI account service guidance",
    ],
    subjectOf: [
      {
        name: "ENHE AI brand profile",
        url: absoluteUrl("/about"),
        encodingFormat: "text/html",
      },
      {
        name: "ENHE AI LLM guidance",
        url: absoluteUrl("/llms.txt"),
        encodingFormat: "text/plain",
      },
    ],
    schemaType: "Organization",
  });
}
