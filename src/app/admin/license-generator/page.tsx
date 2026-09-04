import { AdminSection } from "@/app/admin/admin-ui";
import { LicenseGeneratorPanel } from "@/app/admin/license-generator/license-generator-panel";
import { getAdminDictionary } from "@/lib/admin-i18n";
import { getCurrentLocale } from "@/lib/i18n";
import { getServerMachineId } from "@/lib/license-generator";

export default async function AdminLicenseGeneratorPage() {
  const locale = await getCurrentLocale();
  const t = getAdminDictionary(locale).licenseGenerator;

  return (
    <AdminSection title={t.title} intro={t.intro}>
      <LicenseGeneratorPanel labels={t} serverMachineId={getServerMachineId()} />
    </AdminSection>
  );
}
