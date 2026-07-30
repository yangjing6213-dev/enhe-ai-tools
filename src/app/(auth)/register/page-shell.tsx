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
  searchParams?: Promise<{ returnTo?: string }>;
} = {}) {
  const locale = forceLocale ?? (await getCurrentLocale());
  const t = getDictionary(locale);
  const csrfToken = await getOrCreateCsrfToken();
  const params = await searchParams;
  const returnTo = resolveSafeReturnPath(
    params.returnTo,
    buildLocalePath("/user", locale),
  );

  return (
    <main>
      <Container className="flex min-h-[calc(100vh-4rem)] items-center justify-center py-16">
        <form action={registerAction} className="surface-panel w-full max-w-md p-8">
        <input type="hidden" name="csrfToken" value={csrfToken} />
        <input type="hidden" name="returnTo" value={returnTo} />
        <h1 className="text-3xl font-black text-[var(--marketing-text)]">{t.auth.registerTitle}</h1>
        <p className="mt-3 text-sm font-medium text-[var(--marketing-muted)]">{t.auth.registerIntro}</p>
        <label htmlFor="register-email" className="mt-8 block text-sm font-semibold text-[var(--marketing-text)]">{t.auth.email}</label>
        <input
          id="register-email"
          name="email"
          type="email"
          required
          autoComplete="username"
          placeholder={locale === "en" ? "you@example.com" : "请输入邮箱地址"}
          title={locale === "en" ? "Enter an email address for your ENHE AI account." : "请输入用于注册 ENHE AI 的有效邮箱地址。"}
          aria-describedby="register-email-help"
          className="form-control-dark mt-2"
        />
        <p id="register-email-help" className="mt-2 text-xs leading-5 text-[var(--marketing-muted)]">
          {locale === "en" ? "Required. This email will be used for login and order notifications." : "必填，该邮箱用于登录和接收订单通知。"}
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
        <FormSubmitButton className="mt-8 w-full text-base" pendingLabel={t.auth.creatingAccount}>
          {t.auth.createAccount}
        </FormSubmitButton>
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
