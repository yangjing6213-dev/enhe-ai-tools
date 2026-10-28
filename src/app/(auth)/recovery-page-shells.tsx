import type { Metadata } from "next";
import Link from "next/link";
import { requestPasswordResetAction, resetPasswordAction, verifyRecoveryEmailAction } from "@/app/account-recovery/actions";
import { FormSubmitButton } from "@/components/form-submit-button";
import { PasswordInput } from "@/components/password-input";
import { Container } from "@/components/ui";
import { getOrCreateCsrfToken } from "@/lib/csrf";
import { getCurrentLocale, type Locale } from "@/lib/i18n";
import { buildLocalePath } from "@/lib/seo";
import styles from "./recovery-buttons.module.css";

export function getRecoveryPageMetadata(locale: Locale): Metadata {
  return {
    title: locale === "en" ? "Account recovery | ENHE AI" : "账号找回 | ENHE AI",
    referrer: "no-referrer",
    robots: { index: false, follow: false }
  };
}

export async function ForgotPasswordPageShell({
  searchParams,
  forceLocale
}: {
  searchParams: Promise<{ status?: string }>;
  forceLocale?: Locale;
}) {
  const locale = forceLocale ?? (await getCurrentLocale());
  const [params, csrfToken] = await Promise.all([searchParams, getOrCreateCsrfToken()]);
  const isEnglish = locale === "en";

  return (
    <main className="enhe-editorial-page enhe-auth-page">
      <Container className="flex min-h-[calc(100vh-4rem)] items-center justify-center py-16">
        <form action={requestPasswordResetAction} className="surface-panel w-full max-w-md p-8">
          <input type="hidden" name="csrfToken" value={csrfToken} />
          <h1 className="text-3xl font-black text-[var(--marketing-text)]">{isEnglish ? "Reset your password" : "找回密码"}</h1>
          <p className="mt-3 text-sm leading-6 text-[var(--marketing-muted)]">
            {isEnglish
              ? "Enter the recovery email you verified in your account. If it matches an active account, we will send a one-time link that expires in 30 minutes."
              : "请输入你在账户中验证过的找回邮箱。若它对应有效账户，我们会发送一条 30 分钟内有效的一次性链接。"}
          </p>
          {params.status === "sent" ? (
            <p className="status-success mt-4" role="status">
              {isEnglish
                ? "If that address is verified for an active account, a recovery link will arrive shortly. Check your inbox and spam folder."
                : "如果该邮箱已绑定到有效账户，找回链接会很快发送。请检查收件箱和垃圾邮件。"}
            </p>
          ) : null}
          <label htmlFor="recovery-request-email" className="mt-6 block text-sm font-semibold text-[var(--marketing-text)]">
            {isEnglish ? "Verified recovery email" : "已验证的找回邮箱"}
          </label>
          <input
            id="recovery-request-email"
            name="email"
            type="email"
            maxLength={254}
            required
            autoComplete="email"
            className="form-control-dark mt-2"
            placeholder={isEnglish ? "you@example.com" : "请输入找回邮箱"}
          />
          <FormSubmitButton className={`${styles.primary} mt-6 w-full`} pendingLabel={isEnglish ? "Sending..." : "正在发送..."}>
            {isEnglish ? "Send recovery link" : "发送找回链接"}
          </FormSubmitButton>
          <p className="mt-5 text-center text-sm text-[var(--marketing-muted)]">
            <Link className="font-semibold text-[var(--marketing-accent)]" href={buildLocalePath("/login", locale)}>
              {isEnglish ? "Back to sign in" : "返回登录"}
            </Link>
          </p>
        </form>
      </Container>
    </main>
  );
}

export async function ResetPasswordPageShell({
  searchParams,
  forceLocale
}: {
  searchParams: Promise<{ token?: string; status?: string }>;
  forceLocale?: Locale;
}) {
  const locale = forceLocale ?? (await getCurrentLocale());
  const [params, csrfToken] = await Promise.all([searchParams, getOrCreateCsrfToken()]);
  const isEnglish = locale === "en";
  const hasToken = Boolean(params.token);
  const isUpdated = params.status === "updated";
  const hasError = params.status === "invalid" || (!hasToken && !isUpdated);

  return (
    <main className="enhe-editorial-page enhe-auth-page">
      <Container className="flex min-h-[calc(100vh-4rem)] items-center justify-center py-16">
        <section className="surface-panel w-full max-w-md p-8">
          <h1 className="text-3xl font-black text-[var(--marketing-text)]">{isEnglish ? "Choose a new password" : "设置新密码"}</h1>
          {isUpdated ? (
            <div className="mt-5">
              <p className="status-success" role="status">{isEnglish ? "Your password has been changed. Sign in with the new password." : "密码已更新，请使用新密码登录。"}</p>
              <Link className="mt-5 inline-flex font-semibold text-[var(--marketing-accent)]" href={buildLocalePath("/login", locale)}>
                {isEnglish ? "Go to sign in" : "前往登录"}
              </Link>
            </div>
          ) : hasError ? (
            <div className="mt-5">
              <p className="status-danger" role="alert">
                {isEnglish ? "This link is invalid or has expired. Request a new one." : "此链接无效或已过期，请重新申请。"}
              </p>
              <Link className="mt-5 inline-flex font-semibold text-[var(--marketing-accent)]" href={buildLocalePath("/forgot-password", locale)}>
                {isEnglish ? "Request another link" : "重新申请找回链接"}
              </Link>
            </div>
          ) : (
            <form action={resetPasswordAction} className="mt-5 grid gap-4">
              <input type="hidden" name="csrfToken" value={csrfToken} />
              <input type="hidden" name="token" value={params.token} />
              {params.status === "invalid-password" ? (
                <p className="status-danger" role="alert">
                  {isEnglish ? "Passwords must match and contain 8–128 characters." : "两次密码需一致，且长度为 8–128 位。"}
                </p>
              ) : null}
              <p className="text-sm leading-6 text-[var(--marketing-muted)]">
                {isEnglish ? "Use a password between 8 and 128 characters. Existing sign-ins will be ended after the change." : "密码长度需为 8–128 位。修改后，现有登录会全部退出。"}
              </p>
              <PasswordInput
                name="password"
                required
                minLength={8}
                maxLength={128}
                autoComplete="new-password"
                placeholder={isEnglish ? "New password" : "新密码"}
                showLabel={isEnglish ? "Show password" : "显示密码"}
                hideLabel={isEnglish ? "Hide password" : "隐藏密码"}
                className="form-control-dark"
              />
              <PasswordInput
                name="confirmPassword"
                required
                minLength={8}
                maxLength={128}
                autoComplete="new-password"
                placeholder={isEnglish ? "Confirm new password" : "确认新密码"}
                showLabel={isEnglish ? "Show password" : "显示密码"}
                hideLabel={isEnglish ? "Hide password" : "隐藏密码"}
                className="form-control-dark"
              />
              <FormSubmitButton className={styles.primary} pendingLabel={isEnglish ? "Updating..." : "正在更新..."}>
                {isEnglish ? "Update password" : "更新密码"}
              </FormSubmitButton>
            </form>
          )}
        </section>
      </Container>
    </main>
  );
}

export async function VerifyRecoveryEmailPageShell({
  searchParams,
  forceLocale
}: {
  searchParams: Promise<{ token?: string; status?: string }>;
  forceLocale?: Locale;
}) {
  const locale = forceLocale ?? (await getCurrentLocale());
  const [params, csrfToken] = await Promise.all([searchParams, getOrCreateCsrfToken()]);
  const isEnglish = locale === "en";
  const isVerified = params.status === "verified";
  const isInvalid = params.status === "invalid" || !params.token;

  return (
    <main className="enhe-editorial-page enhe-auth-page">
      <Container className="flex min-h-[calc(100vh-4rem)] items-center justify-center py-16">
        <section className="surface-panel w-full max-w-md p-8">
          <h1 className="text-3xl font-black text-[var(--marketing-text)]">{isEnglish ? "Verify recovery email" : "验证找回邮箱"}</h1>
          {isVerified ? (
            <p className="status-success mt-5" role="status">{isEnglish ? "Recovery email verified. You can now use it to reset your password." : "找回邮箱已验证，现在可以用它重置密码。"}</p>
          ) : isInvalid ? (
            <p className="status-danger mt-5" role="alert">{isEnglish ? "This link is invalid or has expired. Sign in and request a new verification email." : "此链接无效或已过期。请登录后重新申请验证邮件。"}</p>
          ) : (
            <form action={verifyRecoveryEmailAction} className="mt-5 grid gap-4">
              <input type="hidden" name="csrfToken" value={csrfToken} />
              <input type="hidden" name="token" value={params.token} />
              <p className="text-sm leading-6 text-[var(--marketing-muted)]">{isEnglish ? "Confirm only if you requested this change. The link can be used once and expires in 30 minutes." : "只有在你本人申请了此操作时才继续。此链接仅可使用一次，并将在 30 分钟后失效。"}</p>
              <FormSubmitButton className={styles.primary} pendingLabel={isEnglish ? "Verifying..." : "正在验证..."}>
                {isEnglish ? "Verify recovery email" : "确认验证邮箱"}
              </FormSubmitButton>
            </form>
          )}
          <Link className="mt-5 inline-flex font-semibold text-[var(--marketing-accent)]" href={buildLocalePath("/login", locale)}>
            {isEnglish ? "Back to sign in" : "返回登录"}
          </Link>
        </section>
      </Container>
    </main>
  );
}
