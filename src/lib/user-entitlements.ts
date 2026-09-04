export type UserEntitlementTool = {
  id: string;
  name: string;
  slug: string;
  type: "software" | "online" | "skill_learning";
  isVipRequired: boolean;
  isDownloadPaid: boolean;
  downloadFileId: string | null;
  onlineUrl: string | null;
};

type BuildUserToolEntitlementsInput<TTool extends UserEntitlementTool> = {
  purchasedToolIds: Iterable<string>;
  tools: TTool[];
};

export function buildUserToolEntitlements<TTool extends UserEntitlementTool>({
  purchasedToolIds,
  tools
}: BuildUserToolEntitlementsInput<TTool>) {
  const purchased = new Set(purchasedToolIds);
  const software = tools.filter((tool) => tool.type === "software");

  return {
    downloadableSoftware: software.filter((tool) => canDownloadToolFromUserCenter(tool, purchased)),
    purchasedSoftware: software.filter((tool) => purchased.has(tool.id)),
    availableOnlineTools: tools.filter((tool) => tool.type === "online" && canUseOnlineToolFromUserCenter(tool)),
    purchasedCourses: tools.filter((tool) => tool.type === "skill_learning" && purchased.has(tool.id))
  };
}

function canDownloadToolFromUserCenter(tool: UserEntitlementTool, purchased: Set<string>) {
  if (!tool.downloadFileId) return false;
  if (tool.isDownloadPaid && !purchased.has(tool.id)) return false;
  return true;
}

function canUseOnlineToolFromUserCenter(tool: UserEntitlementTool) {
  if (!tool.onlineUrl) return false;
  return true;
}
