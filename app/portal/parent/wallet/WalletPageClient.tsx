"use client";

import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import { FamilyWallet, type WalletInvoice, type PaymentPlan, type AutopayStatus } from "@/components/portal/parent/FamilyWallet";
import { PayInvoiceModal } from "@/components/portal/parent/PayInvoiceModal";

export function WalletPageClient({
  invoices,
  paymentPlans,
  autopay,
}: {
  invoices: WalletInvoice[];
  paymentPlans: PaymentPlan[];
  autopay: AutopayStatus;
}) {
  const [payingInvoice, setPayingInvoice] = useState<WalletInvoice | null>(null);

  return (
    <>
      <FamilyWallet
        invoices={invoices}
        paymentPlans={paymentPlans}
        autopay={autopay}
        onPayInvoice={(id) => {
          const inv = invoices.find((i) => i.id === id);
          if (inv) setPayingInvoice(inv);
        }}
      />
      <AnimatePresence>
        {payingInvoice && (
          <PayInvoiceModal
            invoiceId={payingInvoice.id}
            amountCents={payingInvoice.amountCents}
            label={payingInvoice.studentName ?? "Invoice"}
            onClose={() => setPayingInvoice(null)}
            onPaid={() => window.location.reload()}
          />
        )}
      </AnimatePresence>
    </>
  );
}
