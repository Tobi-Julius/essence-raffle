import { PaymentsQueue } from "@/components/admin/PaymentsQueue";

export default function AdminAllPaymentsPage() {
  return (
    <div className="max-sm:max-w-89">
      <h1 className="text-2xl font-semibold text-neutral-900">Payments</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Review and verify receipts across every raffle.
      </p>
      <div className="mt-6">
        <PaymentsQueue />
      </div>
    </div>
  );
}
