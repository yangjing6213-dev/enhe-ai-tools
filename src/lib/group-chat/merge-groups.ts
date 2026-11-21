type GroupIdentity = {
  id: string;
  role?: string | null;
};

function rolePriority(role: string | null | undefined) {
  return role === "owner" ? 3 : role === "admin" ? 2 : role === "member" ? 1 : 0;
}

export function mergeChatGroups<TMine extends GroupIdentity, TDiscover extends GroupIdentity>(mine: TMine[], discover: TDiscover[]) {
  const groups = new Map<string, (TMine | TDiscover) & { _discover: boolean }>();

  for (const group of mine) {
    const current = groups.get(group.id);
    if (!current || rolePriority(group.role) > rolePriority(current.role)) {
      groups.set(group.id, { ...group, _discover: false });
    }
  }

  for (const group of discover) {
    if (!groups.has(group.id)) groups.set(group.id, { ...group, _discover: true });
  }

  return [...groups.values()];
}
