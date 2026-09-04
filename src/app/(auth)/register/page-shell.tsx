import Link from "next/link";
import { registerAction } from "@/app/actions";
import { FormSubmitButton } from "@/components/form-submit-button";
import { PasswordInput } from "@/components/password-input";
import { Container } from "@/components/ui";
import { getOrCreateCsrfToken } from "@/lib/csrf";
import { getCurrentLocale, getDictionary, type Locale } from "@/lib/i18n";
import { buildLocalePath } from "@/lib/seo";

export async function RegisterPageShell({ forceLocale }: { forceLocale?: Locale } = {}) {
  const locale = forceLocale ?? (await getCurrentLocale());
  const t = getDictionary(locale);
  const csrfToken = await getOrCreateCsrfToken();

  return (
    <Container className="flex min-h-[calc(100vh-4rem)] items-center justify-center py-16">
      <form action={registerAction} className="surface-panel w-full max-w-md p-8">
        <input type="hidden" name="csrfToken" value={csrfToken} />
        <h1 className="text-3xl font-black text-[var(--marketing-text)]">{t.auth.registerTitle}</h1>
        <p className="mt-3 text-sm font-medium text-[var(--marketing-muted)]">{t.auth.registerIntro}</p>
        <label className="mt-8 block text-sm font-semibold text-[var(--marketing-text)]">{t.auth.email}</label>
        <input name="email" type="text" required autoComplete="username" className="form-control-dark mt-2" />
        <label className="mt-5 block text-sm font-semibold text-[var(--marketing-text)]">{t.auth.password}</label>
        <PasswordInput
          name="password"
          minLength={6}
          required
          autoComplete="new-password"
          showLabel={t.auth.showPassword}
          hideLabel={t.auth.hidePassword}
          wrapperClassName="mt-2"
          className="form-control-dark"
        />
        <label className="mt-5 block text-sm font-semibold text-[var(--marketing-text)]">{t.auth.newsletterEmailLabel}</label>
        <input name="newsletterEmail" type="email" autoComplete="email" className="form-control-dark mt-2" />
        <FormSubmitButton className="mt-8 w-full text-base" pendingLabel={t.auth.creatingAccount}>
          {t.auth.createAccount}
        </FormSubmitButton>
        <p className="mt-5 text-center text-sm text-[var(--marketing-muted)]">
          {t.auth.hasAccount}
          <Link className="font-semibold text-[var(--marketing-accent)]" href={buildLocalePath("/login", locale)}>
            {t.auth.goLogin}
          </Link>
        </p>
      </form>
    </Container>
  );
}
