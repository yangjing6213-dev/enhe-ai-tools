function escapeXml(value: string) {
  return value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/[<>&"']/g, (character) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[character]!);
}

export function buildAiWorkflowCoverSvg(input: { name: string; description: string; repository: string }) {
  const evidence = `${input.name} ${input.description} ${input.repository}`;
  const theme = /\bmcp\b|server|integration|连接|集成/i.test(evidence)
    ? { label: "CONNECTED TOOLS", color: "#0d9488", shape: "network" }
    : /design|prototype|visual|设计|视觉/i.test(evidence)
      ? { label: "DESIGN WORKSPACE", color: "#7c3aed", shape: "canvas" }
      : /vue|react|code|developer|programming|编程|开发/i.test(evidence)
        ? { label: "DEVELOPER RESOURCES", color: "#059669", shape: "code" }
        : { label: "OPEN SOURCE WORKFLOW", color: "#2563eb", shape: "network" };
  const englishBlock = input.description.match(/\[\[en\]\]([\s\S]*?)\[\[\/en\]\]/)?.[1];
  const description = (englishBlock || input.description).replace(/\[\[\/?(?:zh|en)\]\]/g, "").replace(/\s+/g, " ").trim();
  const words = description.slice(0, 180).split(" ");
  const lines: string[] = [""];
  for (const word of words) {
    const index = lines.length - 1;
    if (lines[index].length + word.length > 55 && lines[index]) {
      if (lines.length === 3) break;
      lines.push(word);
    } else lines[index] += `${lines[index] ? " " : ""}${word}`;
  }
  const illustration = theme.shape === "canvas"
    ? '<rect x="1030" y="240" width="360" height="350" rx="28" fill="white" opacity=".95"/><rect x="1070" y="280" width="280" height="120" rx="18" fill="url(#accent)"/><rect x="1070" y="440" width="160" height="16" rx="8" fill="#cbd5e1"/><rect x="1070" y="480" width="230" height="16" rx="8" fill="#e2e8f0"/><circle cx="1390" cy="590" r="72" fill="url(#accent)"/>'
    : theme.shape === "code"
      ? '<rect x="990" y="250" width="450" height="330" rx="30" fill="#0f172a"/><circle cx="1030" cy="285" r="8" fill="#fb7185"/><circle cx="1060" cy="285" r="8" fill="#fbbf24"/><circle cx="1090" cy="285" r="8" fill="#34d399"/><path d="m1110 370-65 55 65 55m210-110 65 55-65 55m-80-130-45 150" fill="none" stroke="#6ee7b7" stroke-width="15" stroke-linecap="round" stroke-linejoin="round"/>'
      : '<path d="M1070 300 1290 430 1070 590m220-160 140-160m-140 160 140 180" fill="none" stroke="white" stroke-width="10" opacity=".7"/><g fill="white"><rect x="990" y="220" width="160" height="160" rx="36"/><rect x="990" y="510" width="160" height="160" rx="36"/><rect x="1220" y="360" width="140" height="140" rx="32"/><circle cx="1430" cy="270" r="48"/><circle cx="1430" cy="610" r="48"/></g><g fill="url(#accent)"><circle cx="1070" cy="300" r="32"/><path d="m1050 550 60 40-60 40z"/><rect x="1262" y="402" width="56" height="56" rx="12"/></g>';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" width="1600" height="900" role="img"><title>${escapeXml(input.name)} — project cover</title><defs><linearGradient id="bg" x2="1" y2="1"><stop stop-color="#f8fafc"/><stop offset="1" stop-color="#dbeafe"/></linearGradient><linearGradient id="accent" x2="1" y2="1"><stop stop-color="${theme.color}"/><stop offset="1" stop-color="#38bdf8"/></linearGradient></defs><rect width="1600" height="900" fill="url(#bg)"/><circle cx="1320" cy="440" r="445" fill="url(#accent)" opacity=".82"/><circle cx="1460" cy="70" r="250" fill="white" opacity=".12"/><g font-family="Arial, sans-serif"><rect x="100" y="140" width="360" height="48" rx="24" fill="${theme.color}" opacity=".1"/><text x="124" y="172" font-size="21" font-weight="700" letter-spacing="2" fill="${theme.color}">${theme.label}</text><text x="100" y="325" font-size="${input.name.length > 26 ? 42 : 62}" font-weight="700" fill="#0f172a">${escapeXml(input.name.slice(0, 40))}</text>${lines.map((line, index) => `<text x="104" y="${405 + index * 42}" font-size="27" fill="#475569">${escapeXml(line.slice(0, 58))}</text>`).join("")}<path d="M104 640H740" stroke="#cbd5e1" stroke-width="2"/><text x="104" y="695" font-size="23" fill="#334155">${escapeXml(input.repository.slice(0, 64))}</text><text x="104" y="790" font-size="19" letter-spacing="4" fill="#64748b">ENHE · OPEN SOURCE</text></g>${illustration}</svg>`;
}
