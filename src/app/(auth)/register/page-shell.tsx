import Link from "next/link";
import { registerAction } from "@/app/actions";
import { FormSubmitButton } from "@/components/form-submit-button";
import { PasswordInput } from "@/components/password-input";
import { Container } from "@/components/ui";
import { getOrCreateCsrfToken } from "@/lib/csrf";
import { getCurrentLocale, getDictionary, type Locale } from "@/lib/i18n";
import { buildLocalePath } from "@/lib/seo";
import { resolveSafeReturnPath } from "@/lib/safe-return-path";

export async function RegisterPageShell({
  forceLocale,
  searchParams = Promise.resolve({}),
}: {
  forceLocale?: Locale;
  searchParams?: Promise<{ returnTo?: string; message?: string }>;
} = {}) {
  const locale = forceLocale ?? (await getCurrentLocale());
  const t = getDictionary(locale);
  const csrfToken = await getOrCreateCsrfToken();
  const params = await searchParams;
  const returnTo = resolveSafeReturnPath(
    params.returnTo,
    buildLocalePath("/user", locale),
  );
  const googleMessage = params.message === "google-not-configured"
    ? locale === "en"
      ? "Google registration is not configured yet. You can create an account below."
      : "Google 注册服务尚未完成配置，你仍可使用下方表单注册。"
    : params.message === "google-account-conflict"
      ? locale === "en"
        ? "This Google account is already linked to another ENHE AI account. Sign in to that account first."
        : "此 Google 账号已绑定其他 ENHE AI 账号，请先使用原账号登录。"
      : params.message === "google-auth-failed"
        ? locale === "en"
          ? "Google registration could not be completed. Please try again."
          : "Google 注册未能完成，请重试。"
        : null;
  const googleRegisterHref = `/api/auth/google/start?returnTo=${encodeURIComponent(returnTo)}`;

  return (
    <main className="enhe-editorial-page enhe-auth-page">
      <Container className="flex min-h-[calc(100vh-4rem)] items-center justify-center py-16">
        <form action={registerAction} className="surface-panel w-full max-w-md p-8">
        <input type="hidden" name="csrfToken" value={csrfToken} />
        <input type="hidden" name="returnTo" value={returnTo} />
        <h1 className="text-3xl font-black text-[var(--marketing-text)]">{t.auth.registerTitle}</h1>
        <p className="mt-3 text-sm font-medium text-[var(--marketing-muted)]">{t.auth.registerIntro}</p>
        {googleMessage ? <p role="alert" className="status-danger mt-4">{googleMessage}</p> : null}
        <label htmlFor="register-nickname" className="mt-8 block text-sm font-semibold text-[var(--marketing-text)]">{locale === "en" ? "Username" : "用户名"}</label>
        <input
          id="register-nickname"
          name="nickname"
          type="text"
          required
          minLength={1}
          maxLength={40}
          autoComplete="nickname"
          placeholder={locale === "en" ? "Choose a username" : "请输入用户名"}
          className="form-control-dark mt-2"
        />
        <label htmlFor="register-email" className="mt-8 block text-sm font-semibold text-[var(--marketing-text)]">{t.auth.email}</label>
        <input
          id="register-email"
          name="email"
          type="text"
          required
          minLength={3}
          maxLength={64}
          autoComplete="username"
          placeholder={locale === "en" ? "Enter your account" : "请输入注册账号"}
          title={locale === "en" ? "Use an email address or letters and numbers for your ENHE AI account." : "可使用邮箱地址或 3–64 位英文字母和数字作为注册账号。"}
          aria-describedby="register-email-help"
          className="form-control-dark mt-2"
        />
        <p id="register-email-help" className="mt-2 text-xs leading-5 text-[var(--marketing-muted)]">
          {locale === "en" ? "Required. Use an email address or 3–64 letters and numbers to sign in." : "必填，可使用邮箱地址或 3–64 位英文字母和数字，注册后用于登录。"}
        </p>
        <label htmlFor="register-password" className="mt-5 block text-sm font-semibold text-[var(--marketing-text)]">{t.auth.password}</label>
        <PasswordInput
          id="register-password"
          name="password"
          minLength={6}
          required
          autoComplete="new-password"
          placeholder={locale === "en" ? "At least 6 characters" : "至少 6 个字符"}
          title={locale === "en" ? "Use at least 6 characters." : "密码至少需要 6 个字符。"}
          aria-describedby="register-password-help"
          showLabel={t.auth.showPassword}
          hideLabel={t.auth.hidePassword}
          wrapperClassName="mt-2"
          className="form-control-dark"
        />
        <p id="register-password-help" className="mt-2 text-xs leading-5 text-[var(--marketing-muted)]">
          {locale === "en" ? "Required. Use at least 6 characters." : "必填，请输入至少 6 个字符。"}
        </p>
        <label htmlFor="register-newsletter-email" className="mt-5 block text-sm font-semibold text-[var(--marketing-text)]">{t.auth.newsletterEmailLabel}</label>
        <input
          id="register-newsletter-email"
          name="newsletterEmail"
          type="email"
          autoComplete="email"
          placeholder={locale === "en" ? "Optional notification email" : "可选，接收资讯的邮箱"}
          title={locale === "en" ? "Optional. Enter a notification email if different from your account email." : "可选，如需使用不同邮箱接收资讯可填写。"}
          aria-describedby="register-newsletter-email-help"
          className="form-control-dark mt-2"
        />
        <p id="register-newsletter-email-help" className="mt-2 text-xs leading-5 text-[var(--marketing-muted)]">
          {locale === "en" ? "Optional. Leave blank to use your account email when needed." : "选填，留空时可继续使用账号邮箱。"}
        </p>
        <FormSubmitButton className="login-submit-button mt-8 w-full text-base" pendingLabel={t.auth.creatingAccount}>
          {t.auth.createAccount}
        </FormSubmitButton>
        <a
          href={googleRegisterHref}
          className="mt-4 flex min-h-12 w-full items-center justify-center gap-3 rounded-lg border border-slate-300 bg-white px-4 font-semibold text-slate-900 shadow-sm transition-colors hover:bg-slate-50"
        >
          <span aria-hidden="true" className="grid h-6 w-6 place-items-center rounded-full border border-slate-200 font-bold text-[#4285F4]">G</span>
          {locale === "en" ? "Sign up with Google" : "使用 Google 账号注册"}
        </a>
        <p className="mt-5 text-center text-sm text-[var(--marketing-muted)]">
          {t.auth.hasAccount}
          <Link
            className="font-semibold text-[var(--marketing-accent)]"
            href={`${buildLocalePath("/login", locale)}?returnTo=${encodeURIComponent(returnTo)}`}
          >
            {t.auth.goLogin}
          </Link>
        </p>
        </form>
      </Container>
    </main>
  );
}
