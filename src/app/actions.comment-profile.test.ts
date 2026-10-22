import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createComment: vi.fn(),
  createUser: vi.fn(),
  countCreatorMessages: vi.fn(),
  createNotification: vi.fn(),
  findUser: vi.fn(),
  findTool: vi.fn(),
  getCurrentLocale: vi.fn(),
  redirect: vi.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  }),
  refreshHeaderUserCookieSnapshot: vi.fn(),
  revalidatePath: vi.fn(),
  requireUser: vi.fn(),
  saveUploadedFile: vi.fn(),
  updateUser: vi.fn()
}));

vi.mock("@/lib/csrf", () => ({ assertValidCsrfToken: vi.fn() }));
vi.mock("@/lib/analytics", () => ({ trackAnalyticsEvent: vi.fn() }));

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/lib/db", () => ({
  prisma: {
    comment: { create: mocks.createComment },
    tool: { findUnique: mocks.findTool },
    notification: { count: mocks.countCreatorMessages, create: mocks.createNotification },
    user: { update: mocks.updateUser, create: mocks.createUser, findUnique: mocks.findUser }
  }
}));
vi.mock("@/lib/auth", () => ({
  assertLoginNotLimited: vi.fn(),
  assertRegistrationNotLimited: vi.fn(),
  updatePasswordAndRevokeSessions: vi.fn(),
  getCurrentUser: vi.fn(),
  hashPassword: vi.fn(),
  recordLoginAttempt: vi.fn(),
  refreshHeaderUserCookieSnapshot: mocks.refreshHeaderUserCookieSnapshot,
  requireAdmin: vi.fn(),
  requireUser: mocks.requireUser,
  signInUser: vi.fn(),
  signOutUser: vi.fn(),
  verifyPassword: vi.fn()
}));
vi.mock("@/lib/i18n", () => ({ getCurrentLocale: mocks.getCurrentLocale }));
vi.mock("@/lib/storage", () => ({ saveUploadedFile: mocks.saveUploadedFile }));

import { registerAction, createCommentAction, sendCreatorMessageAction, updateUserAvatarAction, updateUserProfileAction } from "@/app/actions";

function commentForm(rating: string) {
  const formData = new FormData();
  formData.set("toolId", "tool-1");
  formData.set("content", "这款工具确实有帮助。");
  formData.set("rating", rating);
  return formData;
}

describe("comment and user profile actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentLocale.mockResolvedValue("zh");
    mocks.requireUser.mockResolvedValue({ id: "user-1", email: "private@example.test", nickname: "Hu", role: "user" });
    mocks.findTool.mockResolvedValue({ id: "tool-1", slug: "example-tool", name: "示例工具", englishName: "Example Tool", type: "software" });
    mocks.createComment.mockResolvedValue({ id: "comment-1" });
    mocks.countCreatorMessages.mockResolvedValue(0);
    mocks.createNotification.mockResolvedValue({ id: "notification-1" });
    mocks.updateUser.mockResolvedValue({ email: "private@example.test", nickname: "新昵称", role: "user" });
    mocks.saveUploadedFile.mockResolvedValue({ fileUrl: "/uploads/user-avatars/avatar.png" });
  });

  it("assigns a default avatar at registration without changing upload behavior", async () => {
    mocks.findUser.mockResolvedValue(null);
    mocks.createUser.mockResolvedValue({ id: "new-user" });
    const form = new FormData();
    form.set("email", "new-user@example.test");
    form.set("nickname", "新用户");
    form.set("password", "ExamplePassword123!");
    await expect(registerAction(form)).rejects.toThrow("NEXT_REDIRECT:/user");
    expect(mocks.createUser).toHaveBeenCalledWith({ data: expect.objectContaining({
      avatar: expect.stringMatching(/^\/images\/user-avatars\/avatar-\d{2}\.webp$/),
      nickname: "新用户"
    }) });
  });

  it.each(["male", "female"])("uses the selected %s avatar pool when registering", async (gender) => {
    mocks.findUser.mockResolvedValue(null);
    mocks.createUser.mockResolvedValue({ id: "new-user" });
    const form = new FormData();
    form.set("email", "new-user@example.test");
    form.set("nickname", "新用户");
    form.set("password", "ExamplePassword123!");
    form.set("gender", gender);
    await expect(registerAction(form)).rejects.toThrow("NEXT_REDIRECT:/user");
    expect(mocks.createUser).toHaveBeenCalledWith({ data: expect.objectContaining({
      avatar: expect.stringContaining(`/images/user-avatars/${gender}/`)
    }) });
  });

  it("rejects unsupported gender selections before creating an account", async () => {
    const form = new FormData();
    form.set("email", "new-user@example.test");
    form.set("nickname", "新用户");
    form.set("password", "ExamplePassword123!");
    form.set("gender", "invalid");
    await expect(registerAction(form)).rejects.toThrow();
    expect(mocks.createUser).not.toHaveBeenCalled();
  });

  it("stores a required 1–5 star rating with the pending comment", async () => {
    await createCommentAction(commentForm("5"));

    expect(mocks.createComment).toHaveBeenCalledWith({
      data: {
        userId: "user-1",
        toolId: "tool-1",
        content: "这款工具确实有帮助。",
        rating: 5,
        status: "pending"
      }
    });
  });

  it("rejects a missing or out-of-range rating before creating a comment", async () => {
    await expect(createCommentAction(commentForm("6"))).rejects.toThrow();
    expect(mocks.createComment).not.toHaveBeenCalled();
  });

  it("sends a contact message to the product's creator through the notification inbox", async () => {
    mocks.findTool.mockResolvedValue({
      id: "tool-1",
      slug: "example-tool",
      name: "示例工具",
      englishName: "Example Tool",
      type: "software",
      status: "published",
      creatorId: "creator-1",
      creator: { nickname: "作者" }
    });
    const form = new FormData();
    form.set("toolId", "tool-1");
    form.set("content", "  请问支持哪些系统？  ");

    await expect(sendCreatorMessageAction({ status: "idle", message: "" }, form)).resolves.toMatchObject({ status: "success" });
    expect(mocks.createNotification).toHaveBeenCalledWith({ data: expect.objectContaining({
      userId: "creator-1",
      senderId: "user-1",
      type: "creator_message",
      content: expect.stringContaining("请问支持哪些系统？")
    }) });
  });

  it("blocks a user from contacting themself or exceeding the daily contact limit", async () => {
    mocks.findTool.mockResolvedValue({
      id: "tool-1",
      slug: "example-tool",
      name: "示例工具",
      type: "software",
      status: "published",
      creatorId: "user-1",
      creator: { nickname: "Hu" }
    });
    const form = new FormData();
    form.set("toolId", "tool-1");
    form.set("content", "请问支持哪些系统？");
    await expect(sendCreatorMessageAction({ status: "idle", message: "" }, form)).resolves.toMatchObject({ status: "error" });
    expect(mocks.createNotification).not.toHaveBeenCalled();

    mocks.findTool.mockResolvedValue({
      id: "tool-1", slug: "example-tool", name: "示例工具", type: "software", status: "published", creatorId: "creator-1", creator: { nickname: "作者" }
    });
    mocks.countCreatorMessages.mockResolvedValue(5);
    await expect(sendCreatorMessageAction({ status: "idle", message: "" }, form)).resolves.toMatchObject({ status: "error" });
    expect(mocks.createNotification).not.toHaveBeenCalled();
  });

  it("saves an edited nickname and refreshes the signed-in header snapshot", async () => {
    const formData = new FormData();
    formData.set("nickname", "  新昵称  ");

    await expect(updateUserProfileAction(formData)).rejects.toThrow("NEXT_REDIRECT:/user?profile=saved");

    expect(mocks.updateUser).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { nickname: "新昵称" },
      select: { email: true, nickname: true, role: true }
    });
    expect(mocks.refreshHeaderUserCookieSnapshot).toHaveBeenCalledWith({
      email: "private@example.test",
      nickname: "新昵称",
      role: "user"
    });
  });

  it("stores a valid avatar through the existing upload service", async () => {
    const formData = new FormData();
    formData.set("avatar", new File([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])], "avatar.png", { type: "image/png" }));

    await expect(updateUserAvatarAction(formData)).rejects.toThrow("NEXT_REDIRECT:/user?profile=saved");

    expect(mocks.saveUploadedFile).toHaveBeenCalledWith(expect.any(File), expect.objectContaining({
      folder: "user-avatars",
      access: "public"
    }));
    expect(mocks.updateUser).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { avatar: "/uploads/user-avatars/avatar.png" }
    });
  });
});
