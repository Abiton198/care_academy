import React from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface Props {
  open: boolean;
  onPayNow: () => void;
  onLater: () => void;
  invoiceCount: number;
}

const PendingInvoiceModal: React.FC<Props> = ({
  open,
  onPayNow,
  onLater,
  invoiceCount,
}) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <Card className="w-[90%] max-w-md p-6 rounded-2xl shadow-xl animate-in fade-in zoom-in">
        <h2 className="text-lg font-black mb-2">
          Gentle Payment Reminder 💛
        </h2>

        <p className="text-sm text-slate-600 mb-5 leading-relaxed">
          You currently have{" "}
          <span className="font-bold text-slate-900">
            {invoiceCount} pending invoice{invoiceCount > 1 ? "s" : ""}
          </span>{" "}
          awaiting settlement.
          <br />
          Please settle it at your convenience to avoid any service disruption.
        </p>

        <div className="flex justify-end gap-3">
          <Button
            variant="outline"
            className="rounded-xl"
            onClick={onLater}
          >
            Later
          </Button>

          <Button
            className="rounded-xl bg-emerald-600 hover:bg-emerald-700"
            onClick={onPayNow}
          >
            Pay Now
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default PendingInvoiceModal;
