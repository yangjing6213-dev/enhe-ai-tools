export type LicenseGeneratorActionState = {
  ok: boolean;
  message: string;
  code: string;
  payload?: {
    license_type: "single" | "unlimited";
    machine_id?: string;
    issued_at?: string;
    note?: string;
  };
};

export const initialLicenseGeneratorState: LicenseGeneratorActionState = {
  ok: false,
  message: "",
  code: ""
};
