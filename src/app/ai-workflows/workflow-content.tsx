import { ToolRichContent } from "@/components/tool-rich-content";

const sectionHeadings = new Set([
  "项目简介", "项目使用场景", "项目作用与解决的问题", "项目使用方法", "项目安装方法", "来源与使用说明",
  "Project overview", "Use cases", "What it does and problems it solves", "How to use", "Installation", "Source and usage notes",
]);

export function AiWorkflowContent({ content }: { content: string }) {
  const sections: { heading?: string; body: string }[] = [];
  let heading: string | undefined;
  let start = 0;

  for (const match of content.matchAll(/^## ([^\r\n]+)\r?$/gm)) {
    if (!sectionHeadings.has(match[1]!)) continue;
    const body = content.slice(start, match.index).trim();
    if (heading || body) sections.push({ heading, body });
    heading = match[1];
    start = match.index + match[0].length;
  }
  const body = content.slice(start).trim();
  if (heading || body) sections.push({ heading, body });

  return (
    <div className="space-y-6">
      {sections.map((section, index) => (
        <section key={index}>
          {section.heading ? <h3 className="mb-3 text-xl font-semibold text-[#F6FAFF]">{section.heading}</h3> : null}
          <ToolRichContent content={section.body} />
        </section>
      ))}
    </div>
  );
}
