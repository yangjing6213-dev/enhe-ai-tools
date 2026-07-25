import type { Metadata } from "next";
import Link from "next/link";
import { loginAction } from "@/app/actions";
import { FormSubmitButton } from "@/components/form-submit-button";
import { PasswordInput } from "@/components/password-input";
import { Container } from "@/components/ui";
import { getOrCreateCsrfToken } from "@/lib/csrf";
import { getCurrentLocale, getDictionary, type Locale } from "@/lib/i18n";
import {
  buildLocalePath,
  buildMetadataTitle,
  buildPageMetadata,
} from "@/lib/seo";

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
  searchParams: Promise<{ message?: string; payment?: string }>;
  forceLocale?: Locale;
}) {
  const locale = forceLocale ?? (await getCurrentLocale());
  const t = getDictionary(locale);
  const csrfToken = await getOrCreateCsrfToken();
  const params = await searchParams;

  const errorMessages: Record<string, string> = {
    invalid: t.auth.loginErrorInvalid,
    "login-limited": t.auth.loginErrorLimited,
    "account-exists": t.auth.loginErrorAccountExists
  };

  const errorMessage = params.message ? errorMessages[params.message] || t.auth.loginErrorDefault : null;
  const paymentSuccess = params.payment === "success";

  return (
    <main>
      <Container className="flex min-h-[calc(100vh-4rem)] items-center justify-center py-16">
        <form action={loginAction} className="surface-panel w-full max-w-md p-8">
        <input type="hidden" name="csrfToken" value={csrfToken} />
        <h1 className="text-3xl font-black text-[var(--marketing-text)]">{t.auth.loginTitle}</h1>
        <p className="mt-3 text-sm font-medium text-[var(--marketing-muted)]">{t.auth.loginIntro}</p>
        {paymentSuccess ? <div className="status-success mt-4">{t.auth.loginSuccessPayment}</div> : null}
        {errorMessage ? <div className="status-danger mt-4">{errorMessage}</div> : null}
        <label htmlFor="login-email" className="mt-6 block text-sm font-semibold text-[var(--marketing-text)]">{t.auth.email}</label>
        <input
          id="login-email"
          name="email"
          type="email"
          required
          autoComplete="username"
          placeholder={locale === "en" ? "you@example.com" : "请输入邮箱地址"}
          title={locale === "en" ? "Enter your email address." : "请输入有效邮箱地址。"}
          aria-describedby="login-email-help"
          className="form-control-dark mt-2"
        />
        <p id="login-email-help" className="mt-2 text-xs leading-5 text-[var(--marketing-muted)]">
          {locale === "en" ? "Required. Use the email registered with ENHE AI." : "必填，请使用已注册的 ENHE AI 邮箱。"}
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
        <FormSubmitButton className="login-submit-button mt-8 w-full text-base !text-[#050505]" pendingLabel={t.auth.loggingIn}>
          {t.auth.loginButton}
        </FormSubmitButton>
        <p className="mt-5 text-center text-sm text-[var(--marketing-muted)]">
          {t.auth.noAccount}
          <Link className="font-semibold text-[var(--marketing-accent)]" href={buildLocalePath("/register", locale)}>
            {t.auth.registerNow}
          </Link>
        </p>
        </form>
      </Container>
    </main>
  );
}
