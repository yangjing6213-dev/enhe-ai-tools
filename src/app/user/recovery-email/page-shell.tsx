import Link from "next/link";
import { bindRecoveryEmailAction } from "@/app/account-recovery/actions";
import { FormSubmitButton } from "@/components/form-submit-button";
import { PasswordInput } from "@/components/password-input";
import { Container, SectionTitle } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { getOrCreateCsrfToken } from "@/lib/csrf";
import { prisma } from "@/lib/db";
import { getCurrentLocale, type Locale } from "@/lib/i18n";
import { buildLocalePath } from "@/lib/seo";

export async function RecoveryEmailPageShell({
  searchParams,
  forceLocale
}: {
  searchParams: Promise<{ status?: string }>;
  forceLocale?: Locale;
}) {
  const locale = forceLocale ?? (await getCurrentLocale());
  const isEnglish = locale === "en";
  const user = await requireUser(locale);
  const [params, csrfToken, account] = await Promise.all([
    searchParams,
    getOrCreateCsrfToken(),
    prisma.user.findUnique({
      where: { id: user.id },
      select: { recoveryEmail: true, recoveryVerifiedAt: true, googleSubject: true }
    })
  ]);
  const statusMessage = getStatusMessage(params.status, locale);

  return (
    <Container className="py-14">
      <SectionTitle
        title={isEnglish ? "Recovery email" : "找回邮箱"}
        intro={isEnglish
          ? "Verify an email address so you can reset your password if you lose access. Existing sign-ins and your login email stay unchanged."
          : "验证一个找回邮箱，以便忘记密码时重置密码。此操作不会更改登录邮箱，也不会退出当前设备。"}
      />
      <section className="surface-panel mt-8 max-w-2xl p-6 sm:p-8">
        {account?.recoveryEmail && account.recoveryVerifiedAt ? (
          <p className="status-success" role="status">
            {isEnglish ? "Verified recovery email:" : "已验证的找回邮箱："} {account.recoveryEmail}
          </p>
        ) : (
          <p className="status-danger" role="status">
            {isEnglish ? "No verified recovery email is set for this account." : "此账户尚未设置已验证的找回邮箱。"}
          </p>
        )}
        <p className="mt-4 text-sm leading-6 text-[var(--marketing-muted)]">
          {isEnglish
            ? "We send a one-time verification link that expires in 30 minutes. The new address is used only after you open the link and confirm it."
            : "我们会发送一条 30 分钟内有效的一次性验证链接。只有你打开邮件并确认后，新地址才会启用。"}
        </p>
        {account?.googleSubject ? (
          <p className="mt-4 text-sm leading-6 text-[var(--marketing-muted)]" role="status">
            {isEnglish
              ? "This account signs in with Google and does not use an ENHE AI password. Continue using Google sign-in to access it."
              : "此账号通过 Google 登录，没有 ENHE AI 密码。请继续使用 Google 登录访问账号。"}
          </p>
        ) : null}
        {statusMessage ? (
          <p className={`mt-4 ${statusMessage.type === "success" ? "status-success" : "status-danger"}`} role="status">
            {statusMessage.text}
          </p>
        ) : null}
        {account?.googleSubject ? null : <form action={bindRecoveryEmailAction} className="mt-6 grid gap-4">
          <input type="hidden" name="csrfToken" value={csrfToken} />
          <label htmlFor="new-recovery-email" className="text-sm font-semibold text-[var(--marketing-text)]">
            {isEnglish ? "Recovery email address" : "找回邮箱地址"}
          </label>
          <input
            id="new-recovery-email"
            name="email"
            type="email"
            maxLength={254}
            required
            autoComplete="email"
            className="form-control-dark"
            placeholder={isEnglish ? "you@example.com" : "请输入你能收取邮件的地址"}
          />
          <label htmlFor="recovery-current-password" className="text-sm font-semibold text-[var(--marketing-text)]">
            {isEnglish ? "Current password" : "当前账户密码"}
          </label>
          <PasswordInput
            id="recovery-current-password"
            name="currentPassword"
            required
            autoComplete="current-password"
            placeholder={isEnglish ? "Confirm your current password" : "输入当前密码以确认是本人操作"}
            showLabel={isEnglish ? "Show password" : "显示密码"}
            hideLabel={isEnglish ? "Hide password" : "隐藏密码"}
            className="form-control-dark"
          />
          <FormSubmitButton pendingLabel={isEnglish ? "Sending..." : "正在发送..."}>
            {isEnglish ? "Send verification link" : "发送验证邮件"}
          </FormSubmitButton>
        </form>}
        <p className="mt-5 text-sm leading-6 text-[var(--marketing-muted)]">
          {isEnglish
            ? <>If you can’t sign in or no longer have access to your verified email, contact <a className="text-[var(--marketing-accent)]" href="mailto:amen.enhe@gmail.com">amen.enhe@gmail.com</a> for manual review.</>
            : <>如果无法登录或无法使用已验证邮箱，请联系 <a className="text-[var(--marketing-accent)]" href="mailto:amen.enhe@gmail.com">amen.enhe@gmail.com</a> 申请人工核验。</>}
        </p>
        <Link className="mt-5 inline-flex font-semibold text-[var(--marketing-accent)]" href={buildLocalePath("/user", locale)}>
          {isEnglish ? "Back to account center" : "返回用户中心"}
        </Link>
      </section>
    </Container>
  );
}

function getStatusMessage(status: string | undefined, locale: Locale) {
  if (!status) return null;
  const messages: Record<string, { zh: string; en: string; type: "success" | "error" }> = {
    sent: { zh: "验证邮件已发送，请打开邮件中的链接完成验证。", en: "Verification email sent. Open its link to finish verifying the address.", type: "success" },
    "already-verified": { zh: "这个地址已经验证。", en: "This address is already verified.", type: "success" },
    password: { zh: "当前密码不正确，请重试。", en: "The current password is incorrect. Try again.", type: "error" },
    invalid: { zh: "请输入有效邮箱地址。", en: "Enter a valid email address.", type: "error" },
    conflict: { zh: "这个找回邮箱已关联其他账户，请使用另一个地址。", en: "This recovery email is already linked to another account. Use a different address.", type: "error" },
    "rate-limited": { zh: "操作次数过多，请一小时后再试。", en: "Too many attempts. Try again in an hour.", type: "error" },
    "mail-error": { zh: "暂时无法发送邮件，请稍后重试或联系支持。", en: "We couldn’t send the email. Try again later or contact support.", type: "error" }
  };
  const message = messages[status];
  return message ? { text: locale === "en" ? message.en : message.zh, type: message.type } : null;
}
