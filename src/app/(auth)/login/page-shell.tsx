import type { Metadata } from "next";
import Link from "next/link";
import { loginAction } from "@/app/actions";
import { AuthSlideSubmit } from "@/components/auth/auth-slide-submit";
import { PasswordInput } from "@/components/password-input";
import { Container } from "@/components/ui";
import { getOrCreateCsrfToken } from "@/lib/csrf";
import { getCurrentLocale, getDictionary, type Locale } from "@/lib/i18n";
import {
  buildLocalePath,
  buildMetadataTitle,
  buildPageMetadata,
} from "@/lib/seo";
import { resolveSafeReturnPath } from "@/lib/safe-return-path";

export function generateLoginPageMetadata(forceLocale: Locale): Metadata {
  const t = getDictionary(forceLocale);
  const metadata = buildPageMetadata({
    title: buildMetadataTitle({ pageTitle: t.auth.loginTitle, brand: t.brand }),
    description: t.auth.loginIntro,
    path: "/login",
    locale: forceLocale === "en" ? "en_US" : "zh_CN",
    localeKey: forceLocale,
  });

  metadata.robots = { index: false, follow: true };
  return metadata;
}

export async function LoginPageShell({
  searchParams,
  forceLocale
}: {
  searchParams: Promise<{ message?: string; payment?: string; returnTo?: string }>;
  forceLocale?: Locale;
}) {
  const locale = forceLocale ?? (await getCurrentLocale());
  const t = getDictionary(locale);
  const csrfToken = await getOrCreateCsrfToken();
  const params = await searchParams;
  const returnTo = resolveSafeReturnPath(
    params.returnTo,
    buildLocalePath("/user", locale),
  );

  const errorMessages: Record<string, string> = {
    invalid: t.auth.loginErrorInvalid,
    "login-limited": t.auth.loginErrorLimited,
    "account-exists": t.auth.loginErrorAccountExists
  };

  const errorMessage = params.message ? errorMessages[params.message] || t.auth.loginErrorDefault : null;
  const paymentSuccess = params.payment === "success";

  return (
    <main className="enhe-editorial-page enhe-auth-page">
      <Container className="flex min-h-[calc(100vh-4rem)] items-center justify-center py-16">
        <form action={loginAction} className="surface-panel w-full max-w-md p-8">
        <input type="hidden" name="csrfToken" value={csrfToken} />
        <input type="hidden" name="returnTo" value={returnTo} />
        <h1 className="text-3xl font-black text-[var(--marketing-text)]">{t.auth.loginTitle}</h1>
        <p className="mt-3 text-sm font-medium text-[var(--marketing-muted)]">{t.auth.loginIntro}</p>
        {paymentSuccess ? <div className="status-success mt-4">{t.auth.loginSuccessPayment}</div> : null}
        {errorMessage ? <div className="status-danger mt-4">{errorMessage}</div> : null}
        <label htmlFor="login-email" className="mt-6 block text-sm font-semibold text-[var(--marketing-text)]">{t.auth.email}</label>
        <input
          id="login-email"
          name="email"
          type="text"
          required
          autoComplete="username"
          placeholder={locale === "en" ? "Enter your account" : "请输入注册账号"}
          title={locale === "en" ? "Enter your registered email address or letters-and-numbers account." : "请输入注册时使用的邮箱地址或字母数字账号。"}
          aria-describedby="login-email-help"
          className="form-control-dark mt-2"
        />
        <p id="login-email-help" className="mt-2 text-xs leading-5 text-[var(--marketing-muted)]">
          {locale === "en" ? "Required. Use the account you registered with ENHE AI." : "必填，请使用注册 ENHE AI 时设置的账号。"}
        </p>
        <label htmlFor="login-password" className="mt-5 block text-sm font-semibold text-[var(--marketing-text)]">{t.auth.password}</label>
        <PasswordInput
          id="login-password"
          name="password"
          required
          autoComplete="current-password"
          placeholder={locale === "en" ? "Enter password" : "请输入密码"}
          title={locale === "en" ? "Enter your password." : "请输入账号密码。"}
          aria-describedby="login-password-help"
          showLabel={t.auth.showPassword}
          hideLabel={t.auth.hidePassword}
          wrapperClassName="mt-2"
          className="form-control-dark"
        />
        <p id="login-password-help" className="mt-2 text-xs leading-5 text-[var(--marketing-muted)]">
          {locale === "en" ? "Required. Password validation happens after submission." : "必填，提交后会校验密码是否正确。"}
        </p>
        <AuthSlideSubmit
          submitAction={loginAction}
          className="mt-8 w-full"
          label={locale === "en" ? "Slide to log in" : "向右滑动登录"}
          pendingLabel={t.auth.loggingIn}
          errorLabel={locale === "en" ? "Slide to retry login" : "向右滑动重试登录"}
          fallbackLabel={t.auth.loginButton}
          error={Boolean(errorMessage)}
        />
        <a
          href={`/api/auth/google/start?returnTo=${encodeURIComponent(returnTo)}`}
          className="mt-4 flex min-h-12 w-full items-center justify-center gap-3 rounded-lg border border-slate-300 bg-white px-4 font-semibold text-slate-900 shadow-sm transition-colors hover:bg-slate-50"
        >
          <span aria-hidden="true" className="grid h-6 w-6 place-items-center rounded-full border border-slate-200 font-bold text-[#4285F4]">G</span>
          {locale === "en" ? "Sign in with Google" : "使用 Google 账号登录"}
        </a>
        <p className="mt-5 text-center text-sm text-[var(--marketing-muted)]">
          {t.auth.noAccount}
          <Link
            className="font-semibold text-[var(--marketing-accent)]"
            href={`${buildLocalePath("/register", locale)}?returnTo=${encodeURIComponent(returnTo)}`}
          >
            {t.auth.registerNow}
          </Link>
        </p>
        </form>
      </Container>
    </main>
  );
}
