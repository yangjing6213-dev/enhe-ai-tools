import Link from "next/link";
import { loginAction } from "@/app/actions";
import { FormSubmitButton } from "@/components/form-submit-button";
import { PasswordInput } from "@/components/password-input";
import { Container } from "@/components/ui";
import { getOrCreateCsrfToken } from "@/lib/csrf";
import { getCurrentLocale, getDictionary, type Locale } from "@/lib/i18n";
import { buildLocalePath } from "@/lib/seo";

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
    <Container className="flex min-h-[calc(100vh-4rem)] items-center justify-center py-16">
      <form action={loginAction} className="surface-panel w-full max-w-md p-8">
        <input type="hidden" name="csrfToken" value={csrfToken} />
        <h1 className="text-3xl font-black text-[var(--marketing-text)]">{t.auth.loginTitle}</h1>
        <p className="mt-3 text-sm font-medium text-[var(--marketing-muted)]">{t.auth.loginIntro}</p>
        {paymentSuccess ? <div className="status-success mt-4">{t.auth.loginSuccessPayment}</div> : null}
        {errorMessage ? <div className="status-danger mt-4">{errorMessage}</div> : null}
        <label className="mt-6 block text-sm font-semibold text-[var(--marketing-text)]">{t.auth.email}</label>
        <input name="email" type="text" required autoComplete="username" className="form-control-dark mt-2" />
        <label className="mt-5 block text-sm font-semibold text-[var(--marketing-text)]">{t.auth.password}</label>
        <PasswordInput
          name="password"
          required
          autoComplete="current-password"
          showLabel={t.auth.showPassword}
          hideLabel={t.auth.hidePassword}
          wrapperClassName="mt-2"
          className="form-control-dark"
        />
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
  );
}
