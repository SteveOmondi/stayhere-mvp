import { useEffect, useState } from "react";
import { listingsApi, termsApi, type PropertyTerms, type UpsertTermsBody } from "../lib/api";
import { useOwner } from "../context/OwnerContext";
import { IcoCheck, IcoEdit, IcoLoader, IcoPlus, IcoRefresh, IcoTerms, IcoTrash, IcoX } from "../components/icons";

type Listing = Record<string, unknown>;

export function PropertyTermsPage() {
  const { owner, toast } = useOwner();
  const [listings, setListings] = useState<Listing[]>([]);
  const [selectedListing, setSelectedListing] = useState<string>("");
  const [terms, setTerms] = useState<PropertyTerms | null>(null);
  const [loadingListings, setLoadingListings] = useState(true);
  const [loadingTerms, setLoadingTerms] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const ownerId = owner?.id ?? "";

  useEffect(() => {
    if (!ownerId) return;
    listingsApi.byOwner(ownerId)
      .then((res) => {
        const items = (res as Record<string, unknown>).items ?? res;
        setListings(Array.isArray(items) ? items : []);
      })
      .catch(() => {})
      .finally(() => setLoadingListings(false));
  }, [ownerId]);

  useEffect(() => {
    if (!selectedListing) { setTerms(null); return; }
    setLoadingTerms(true);
    termsApi.getByListing(selectedListing)
      .then(setTerms)
      .catch(() => setTerms(null))
      .finally(() => setLoadingTerms(false));
  }, [selectedListing]);

  async function handleDelete() {
    if (!terms || !window.confirm("Delete these terms?")) return;
    await termsApi.delete(terms.id);
    setTerms(null);
    toast("Terms deleted", "success");
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-brand-900">Property Terms Manager</h1>
          <p className="text-sm text-brand-500 mt-0.5">Set custom terms, rules, and payment details for each listing</p>
        </div>
      </div>

      {/* Listing selector */}
      <div className="card">
        <label className="label text-brand-700 font-semibold mb-2 block">Select a Listing to Manage Terms</label>
        {loadingListings ? (
          <div className="flex items-center gap-2 text-brand-400 text-sm py-3"><IcoLoader size={14} /> Loading listings…</div>
        ) : (
          <select value={selectedListing} onChange={(e) => setSelectedListing(e.target.value)} className="input">
            <option value="">— Choose a listing —</option>
            {listings.map((l) => (
              <option key={String(l.id)} value={String(l.id)}>
                {String(l.title ?? l.unitNumber ?? l.propertyCode ?? l.id)}
              </option>
            ))}
          </select>
        )}
      </div>

      {selectedListing && (
        <>
          {loadingTerms ? (
            <div className="flex justify-center py-12"><IcoLoader size={28} className="text-brand-teal" /></div>
          ) : terms ? (
            <div className="card space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-brand-900">{terms.title}</h3>
                  <p className="text-xs text-brand-400">Active terms · Last updated {new Date(terms.updatedAt).toLocaleDateString("en-KE")}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setShowEditor(true)} className="btn-ghost border border-brand-200 flex items-center gap-1.5 text-sm">
                    <IcoEdit size={13} /> Edit
                  </button>
                  <button onClick={handleDelete} className="btn-danger text-sm px-3 py-2">
                    <IcoTrash size={13} />
                  </button>
                </div>
              </div>
              <TermsPreview terms={terms} />
            </div>
          ) : (
            <div className="card text-center py-12">
              <IcoTerms size={40} className="mx-auto text-brand-300 mb-3" />
              <h3 className="font-semibold text-brand-700">No terms set for this listing</h3>
              <p className="text-sm text-brand-400 mt-1 mb-5">Define tenancy terms, payment details, and move-in instructions.</p>
              <button onClick={() => setShowEditor(true)} className="btn-primary inline-flex items-center gap-2">
                <IcoPlus size={15} /> Create Terms
              </button>
            </div>
          )}
        </>
      )}

      {showEditor && (
        <TermsEditor
          listingId={selectedListing}
          existing={terms}
          onSave={(saved) => { setTerms(saved); setShowEditor(false); toast("Terms saved!", "success"); }}
          onClose={() => setShowEditor(false)}
        />
      )}
    </div>
  );
}

function TermsPreview({ terms: t }: { terms: PropertyTerms }) {
  const rows: Array<{ label: string; value: string | number | undefined }> = [
    { label: "Security Deposit", value: t.securityDeposit ? `${t.currency ?? "KES"} ${t.securityDeposit.toLocaleString()}` : undefined },
    { label: "Admin Fee",        value: t.adminFee ? `${t.currency ?? "KES"} ${t.adminFee.toLocaleString()}` : undefined },
    { label: "Notice Period",    value: t.noticePeriod },
    { label: "Pet Policy",       value: t.petPolicy },
    { label: "M-Pesa Paybill",   value: t.mpesaPaybill },
    { label: "M-Pesa Till",      value: t.mpesaTill },
    { label: "M-Pesa Account",   value: t.mpesaAccountNumber },
    { label: "Bank Name",        value: t.bankName },
    { label: "Account No.",      value: t.bankAccountNumber },
  ];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        {rows.filter((r) => r.value !== undefined).map((r) => (
          <div key={r.label} className="bg-brand-50 rounded-lg px-3 py-2">
            <div className="text-[10px] uppercase tracking-wider text-brand-400">{r.label}</div>
            <div className="font-semibold text-brand-800 text-sm">{r.value}</div>
          </div>
        ))}
      </div>
      {t.termsContent && (
        <div>
          <div className="text-xs font-semibold text-brand-600 uppercase tracking-wider mb-1">Terms Content</div>
          <p className="text-sm text-brand-700 whitespace-pre-line bg-brand-50 rounded-lg p-3 max-h-32 overflow-y-auto">{t.termsContent}</p>
        </div>
      )}
      {t.houseRules && (
        <div>
          <div className="text-xs font-semibold text-brand-600 uppercase tracking-wider mb-1">House Rules</div>
          <p className="text-sm text-brand-700 whitespace-pre-line bg-brand-50 rounded-lg p-3 max-h-32 overflow-y-auto">{t.houseRules}</p>
        </div>
      )}
    </div>
  );
}

const EMPTY_FORM: UpsertTermsBody = {
  title: "Tenancy Terms & Conditions",
  termsContent: "", houseRules: "", paymentTerms: "", noticePeriod: "One (1) Month",
  petPolicy: "", maintenancePolicy: "", securityDepositTerms: "",
  securityDeposit: undefined, adminFee: undefined, currency: "KES",
  mpesaPaybill: "", mpesaTill: "", mpesaAccountNumber: "",
  bankName: "", bankAccountName: "", bankAccountNumber: "", bankBranch: "",
  paymentInstructions: "", onboardingInstructions: "", accessInstructions: "", itemsToCarry: "",
};

function TermsEditor({
  listingId, existing, onSave, onClose
}: {
  listingId: string;
  existing: PropertyTerms | null;
  onSave: (t: PropertyTerms) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<UpsertTermsBody>(
    existing ? {
      title: existing.title, termsContent: existing.termsContent, houseRules: existing.houseRules,
      paymentTerms: existing.paymentTerms, noticePeriod: existing.noticePeriod,
      petPolicy: existing.petPolicy, maintenancePolicy: existing.maintenancePolicy,
      securityDepositTerms: existing.securityDepositTerms,
      securityDeposit: existing.securityDeposit, adminFee: existing.adminFee, currency: existing.currency ?? "KES",
      mpesaPaybill: existing.mpesaPaybill, mpesaTill: existing.mpesaTill, mpesaAccountNumber: existing.mpesaAccountNumber,
      bankName: existing.bankName, bankAccountName: existing.bankAccountName,
      bankAccountNumber: existing.bankAccountNumber, bankBranch: existing.bankBranch,
      paymentInstructions: existing.paymentInstructions,
      onboardingInstructions: existing.onboardingInstructions, accessInstructions: existing.accessInstructions,
      itemsToCarry: existing.itemsToCarry,
    } : { ...EMPTY_FORM }
  );
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState(0);

  const set = (k: keyof UpsertTermsBody, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  async function save() {
    setSaving(true);
    try {
      const saved = existing
        ? await termsApi.update(listingId, existing.id, form)
        : await termsApi.create(listingId, form);
      onSave(saved);
    } finally { setSaving(false); }
  }

  const SECTIONS = [
    {
      title: "General Terms",
      content: (
        <div className="space-y-4">
          <FormField label="Terms Title"><input value={form.title ?? ""} onChange={(e) => set("title", e.target.value)} className="input" /></FormField>
          <FormField label="Full Terms & Conditions"><textarea rows={5} value={form.termsContent ?? ""} onChange={(e) => set("termsContent", e.target.value)} className="input resize-none" placeholder="Enter the full tenancy agreement terms…" /></FormField>
          <FormField label="House Rules"><textarea rows={4} value={form.houseRules ?? ""} onChange={(e) => set("houseRules", e.target.value)} className="input resize-none" placeholder="No smoking indoors, quiet hours after 10pm…" /></FormField>
          <FormField label="Notice Period"><input value={form.noticePeriod ?? ""} onChange={(e) => set("noticePeriod", e.target.value)} placeholder="e.g. One (1) Month" className="input" /></FormField>
          <FormField label="Pet Policy"><input value={form.petPolicy ?? ""} onChange={(e) => set("petPolicy", e.target.value)} placeholder="e.g. No pets allowed" className="input" /></FormField>
          <FormField label="Maintenance Policy"><textarea rows={2} value={form.maintenancePolicy ?? ""} onChange={(e) => set("maintenancePolicy", e.target.value)} className="input resize-none" /></FormField>
        </div>
      ),
    },
    {
      title: "Fees & Payment",
      content: (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Currency"><input value={form.currency ?? "KES"} onChange={(e) => set("currency", e.target.value)} className="input" /></FormField>
            <FormField label="Security Deposit (KES)"><input type="number" value={form.securityDeposit ?? ""} onChange={(e) => set("securityDeposit", e.target.value ? Number(e.target.value) : undefined)} className="input" /></FormField>
            <FormField label="Admin / Processing Fee (KES)"><input type="number" value={form.adminFee ?? ""} onChange={(e) => set("adminFee", e.target.value ? Number(e.target.value) : undefined)} className="input" /></FormField>
          </div>
          <FormField label="Security Deposit Terms"><textarea rows={2} value={form.securityDepositTerms ?? ""} onChange={(e) => set("securityDepositTerms", e.target.value)} className="input resize-none" placeholder="e.g. Refundable within 14 days of vacating…" /></FormField>
          <FormField label="Payment Terms"><textarea rows={3} value={form.paymentTerms ?? ""} onChange={(e) => set("paymentTerms", e.target.value)} className="input resize-none" placeholder="e.g. Rent due on 1st of each month. Late fee of 5% after 5 days." /></FormField>
          <FormField label="Payment Instructions (general)"><textarea rows={2} value={form.paymentInstructions ?? ""} onChange={(e) => set("paymentInstructions", e.target.value)} className="input resize-none" /></FormField>
        </div>
      ),
    },
    {
      title: "M-Pesa Details",
      content: (
        <div className="space-y-4">
          <p className="text-sm text-brand-500">Customers will see these details on the payment screen when paying via M-Pesa STK Push or manually.</p>
          <FormField label="Paybill Number"><input value={form.mpesaPaybill ?? ""} onChange={(e) => set("mpesaPaybill", e.target.value)} placeholder="e.g. 247247" className="input" /></FormField>
          <FormField label="Till Number"><input value={form.mpesaTill ?? ""} onChange={(e) => set("mpesaTill", e.target.value)} placeholder="e.g. 8765432" className="input" /></FormField>
          <FormField label="Account Number / Name"><input value={form.mpesaAccountNumber ?? ""} onChange={(e) => set("mpesaAccountNumber", e.target.value)} placeholder="e.g. ACC-12345" className="input" /></FormField>
        </div>
      ),
    },
    {
      title: "Bank Transfer",
      content: (
        <div className="space-y-4">
          <p className="text-sm text-brand-500">Displayed to customers who choose to pay via bank transfer.</p>
          <FormField label="Bank Name"><input value={form.bankName ?? ""} onChange={(e) => set("bankName", e.target.value)} placeholder="e.g. Equity Bank" className="input" /></FormField>
          <FormField label="Account Name"><input value={form.bankAccountName ?? ""} onChange={(e) => set("bankAccountName", e.target.value)} className="input" /></FormField>
          <FormField label="Account Number"><input value={form.bankAccountNumber ?? ""} onChange={(e) => set("bankAccountNumber", e.target.value)} className="input" /></FormField>
          <FormField label="Branch"><input value={form.bankBranch ?? ""} onChange={(e) => set("bankBranch", e.target.value)} className="input" /></FormField>
        </div>
      ),
    },
    {
      title: "Move-in & Onboarding",
      content: (
        <div className="space-y-4">
          <p className="text-sm text-brand-500">Shown to the tenant after their application is approved and payment confirmed.</p>
          <FormField label="Onboarding Instructions">
            <textarea rows={4} value={form.onboardingInstructions ?? ""} onChange={(e) => set("onboardingInstructions", e.target.value)} className="input resize-none" placeholder="Step 1: Collect keys from property manager on Day 1…" />
          </FormField>
          <FormField label="Access Instructions">
            <textarea rows={3} value={form.accessInstructions ?? ""} onChange={(e) => set("accessInstructions", e.target.value)} className="input resize-none" placeholder="e.g. Gate code is 1234. Use the main entrance on Acacia Ave." />
          </FormField>
          <FormField label="Items to Carry on Moving Day">
            <textarea rows={3} value={form.itemsToCarry ?? ""} onChange={(e) => set("itemsToCarry", e.target.value)} className="input resize-none" placeholder="- Original ID\n- Signed lease copy\n- First month rent receipt" />
          </FormField>
        </div>
      ),
    },
  ];

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-8 px-4 pb-8 overflow-y-auto">
        <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl" onClick={(e) => e.stopPropagation()}>
          <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 bg-white rounded-t-2xl border-b border-brand-100">
            <h2 className="font-bold text-brand-900">{existing ? "Edit Terms" : "Create Terms"}</h2>
            <button onClick={onClose} className="text-brand-400 hover:text-brand-700 p-1.5 rounded-lg hover:bg-brand-50 transition"><IcoX size={18} /></button>
          </div>

          {/* Section tabs */}
          <div className="flex overflow-x-auto gap-0 border-b border-brand-100 px-4">
            {SECTIONS.map((s, i) => (
              <button key={i} onClick={() => setActiveSection(i)}
                className={`shrink-0 px-4 py-3 text-sm font-medium border-b-2 transition -mb-px ${activeSection === i ? "border-brand-teal text-brand-teal" : "border-transparent text-brand-500 hover:text-brand-700"}`}>
                {s.title}
              </button>
            ))}
          </div>

          <div className="p-6">{SECTIONS[activeSection].content}</div>

          <div className="flex items-center justify-between px-6 pb-6 pt-2 border-t border-brand-100 mt-2">
            <div className="flex gap-1.5">
              {SECTIONS.map((_, i) => (
                <button key={i} onClick={() => setActiveSection(i)}
                  className={`h-2 w-2 rounded-full transition ${activeSection === i ? "bg-brand-teal" : "bg-brand-200"}`} />
              ))}
            </div>
            <div className="flex gap-3">
              {activeSection < SECTIONS.length - 1 ? (
                <button onClick={() => setActiveSection((v) => v + 1)} className="btn-primary">Next Section →</button>
              ) : (
                <button onClick={save} disabled={saving} className="btn-primary flex items-center gap-2">
                  {saving ? <IcoLoader size={14} /> : <IcoCheck size={14} />}
                  {existing ? "Save Changes" : "Create Terms"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="field-label">{label}</label>
      {children}
    </div>
  );
}
