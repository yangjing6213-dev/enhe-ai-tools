export function routeGroupMessageNotifications(input: {
  activeMemberIds: string[];
  senderId: string;
  replyToSenderId?: string | null;
  mentionUserIds: string[];
  mentionEveryone: boolean;
}) {
  const eligible = [...new Set(input.activeMemberIds)].filter((userId) => userId !== input.senderId);
  const eligibleSet = new Set(eligible);
  const reply = input.replyToSenderId && eligibleSet.has(input.replyToSenderId) ? [input.replyToSenderId] : [];
  const notified = new Set(reply);
  const mentions = [...new Set(input.mentionUserIds)].filter((userId) => eligibleSet.has(userId) && !notified.has(userId));
  for (const userId of mentions) notified.add(userId);
  const mentionAll = input.mentionEveryone ? eligible.filter((userId) => !notified.has(userId)) : [];
  for (const userId of mentionAll) notified.add(userId);
  const general = eligible.filter((userId) => !notified.has(userId));
  return { reply, mentions, mentionAll, general };
}
