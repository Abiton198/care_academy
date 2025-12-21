"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebaseConfig";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { motion } from "framer-motion";
import { CheckCircle, Clock, AlertCircle, Receipt, Tag } from "lucide-react";

interface Student {
  id: string;
  firstName: string;
  lastName: string;
  grade: string;
  curriculum: "CAPS" | "Cambridge";
  subjects: string[];
  paymentReceived?: boolean;
  regFeePaid?: boolean;
}

interface Payment {
  id: string;
  amount: number;
  purpose: string;
  status: "success" | "pending" | "failed";
  timestamp: any;
  transactionId?: string;
}

// ──────────────────────────────────────────────────────────────
// TIERED PRICING + TRANSACTION FEE (5% + VAT 15%)
// ──────────────────────────────────────────────────────────────
const REG_FEE = 350;
const TRANSACTION_FEE_RATE = 0.05; // 5%
const VAT_RATE = 0.15; // 15%

const PRICING_TIERS = {
  CAPS: [
    { min: 1, max: 3, price: 250, discount: 0 },
    { min: 4, max: 6, price: 225, discount: 10 },
    { min: 7, max: Infinity, price: 200.5, discount: 20 },
  ],
  Cambridge: [
    { min: 1, max: 3, price: 300, discount: 0 },
    { min: 4, max: 6, price: 270, discount: 10 },
    { min: 7, max: Infinity, price: 225.5, discount: 25 },
  ],
} as const;

// Get tier
const getTier = (count: number, curriculum: "CAPS" | "Cambridge") => {
  return (
    PRICING_TIERS[curriculum].find(
      (tier) => count >= tier.min && count <= tier.max
    ) || PRICING_TIERS[curriculum][0]
  );
};

export default function PaymentsSection() {
  const { user } = useAuth();

  // PayFast Config
  const payfastMode = import.meta.env.VITE_PAYFAST_MODE;
  const merchantId = import.meta.env.VITE_PAYFAST_MERCHANT_ID;
  const merchantKey = import.meta.env.VITE_PAYFAST_MERCHANT_KEY;
  const siteUrl = import.meta.env.VITE_SITE_URL;

  const payfastUrl =
    payfastMode === "live"
      ? "https://www.payfast.co.za/eng/process"
      : "https://sandbox.payfast.co.za/eng/process";

  // State
  const [students, setStudents] = useState<Student[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [selectedStudent, setSelectedStudent] = useState("");
  const [includeRegFee, setIncludeRegFee] = useState(true);
  const [loading, setLoading] = useState(true);

  // Fetch data
  useEffect(() => {
    if (!user?.uid && !user?.email) return;

    const loadData = async () => {
      try {
        let q = query(collection(db, "students"), where("parentId", "==", user.uid));
        let snap = await getDocs(q);

        if (snap.empty) {
          q = query(collection(db, "students"), where("linkedParentId", "==", user.uid));
          snap = await getDocs(q);
        }

        if (snap.empty) {
          q = query(collection(db, "students"), where("linkedParentEmail", "==", user.email));
          snap = await getDocs(q);
        }

        const studentList = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Student));
        setStudents(studentList);

        const payQ = query(
          collection(db, "payments"),
          where("parentId", "==", user.uid),
          orderBy("timestamp", "desc")
        );
        const paySnap = await getDocs(payQ);
        const payList = paySnap.docs.map((d) => ({ id: d.id, ...d.data() } as Payment));
        setPayments(payList);
      } catch (err) {
        console.error("Error:", err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user?.uid, user?.email]);

  // Selected student
  const selected = students.find((s) => s.id === selectedStudent) || {};
  const subjectCount = (selected.subjects || []).length;
  const curriculum = selected.curriculum || "CAPS";

  // Tier logic
  const tier = getTier(subjectCount, curriculum);
  const subjectTotal = subjectCount * tier.price;
  const regFeeTotal = includeRegFee ? REG_FEE : 0;
  const baseAmount = subjectTotal + regFeeTotal;

  // Transaction Fee: 5% of base
  const transactionFee = baseAmount * TRANSACTION_FEE_RATE;

  // VAT: 15% of (base + transaction fee)
  const vat = (baseAmount + transactionFee) * VAT_RATE;

  // Final total
  const totalWithFees = (baseAmount + transactionFee + vat).toFixed(2);

  // Item name
  const first = selected.firstName || "";
  const last = selected.lastName || "";
  const itemName = first
    ? `${first} ${last} - ${curriculum} ${subjectCount} Subjects${tier.discount > 0 ? ` (${tier.discount}% off)` : ""}${includeRegFee ? " + Reg Fee" : ""}`
    : "Payment";

  // PayFast URLs
  const returnUrl = `${siteUrl}/parent/payments?status=success`;
  const cancelUrl = `${siteUrl}/parent/payments?status=cancel`;
  const notifyUrl = `${siteUrl}/.netlify/functions/payfast-notify`;

  if (loading) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-600">Loading payment portal...</p>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-5xl mx-auto space-y-8">

      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-800">Payment Portal</h1>
        <p className="text-gray-600 mt-1">Includes 5% transaction fee + 15% VAT</p>
      </div>

      {/* Student Selector */}
      <Card className="p-5 shadow-md">
        <label className="block font-semibold mb-3">Select Student</label>
        <select
          value={selectedStudent}
          onChange={(e) => setSelectedStudent(e.target.value)}
          className="border rounded-lg p-3 w-full text-lg"
          required
        >
          <option value="">-- Choose a student --</option>
          {students.map((s) => (
            <option key={s.id} value={s.id}>
              {s.firstName} {s.lastName} – {s.grade} ({s.curriculum})
            </option>
          ))}
        </select>
      </Card>

      {/* Payment Form */}
      {selectedStudent && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">

          {/* Curriculum & Subjects */}
          <Card className="p-5 bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-bold text-indigo-900">{curriculum} Curriculum</h3>
                <p className="text-sm text-gray-700 mt-1">
                  {subjectCount} subject{subjectCount !== 1 ? "s" : ""} selected
                </p>
              </div>
              {tier.discount > 0 && (
                <Badge className="bg-green-100 text-green-800 flex items-center gap-1">
                  <Tag size={14} /> {tier.discount}% OFF
                </Badge>
              )}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {(selected.subjects || []).map((sub: string) => (
                <Badge key={sub} variant="secondary" className="bg-indigo-100 text-indigo-700">
                  {sub}
                </Badge>
              ))}
            </div>
          </Card>

          {/* Registration Fee */}
          <Card className="p-5 bg-yellow-50 border-yellow-300">
            <label className="flex items-center gap-3 cursor-pointer">
              <Checkbox checked={includeRegFee} onCheckedChange={(c) => setIncludeRegFee(c as boolean)} />
              <div>
                <p className="font-semibold">Include Registration Fee (R350)</p>
                <p className="text-xs text-gray-600">Pay once per student. Skip if already paid.</p>
              </div>
            </label>
          </Card>

          {/* Payment Breakdown */}
          <Card className="p-5 bg-gray-50">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>
                  Subjects ({subjectCount} × R{tier.price.toFixed(2)})
                  {tier.discount > 0 && <span className="text-green-600 ml-1">(-{tier.discount}%)</span>}
                </span>
                <span className="font-medium">R{subjectTotal.toFixed(2)}</span>
              </div>
              {includeRegFee && (
                <div className="flex justify-between text-yellow-700">
                  <span>Registration Fee</span>
                  <span className="font-medium">R{REG_FEE.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-red-600 text-xs">
                <span>Transaction Fee (5%)</span>
                <span className="font-medium">R{transactionFee.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-red-600 text-xs">
                <span>VAT (15%)</span>
                <span className="font-medium">R{vat.toFixed(2)}</span>
              </div>
              <div className="border-t pt-3 flex justify-between font-bold text-lg">
                <span>Total Amount to Pay</span>
                <span className="text-green-600">R{totalWithFees}</span>
              </div>
            </div>
          </Card>

          {/* Pay All (with fees) */}
          <form action={payfastUrl} method="post" target="_top">
            <input type="hidden" name="merchant_id" value={merchantId} />
            <input type="hidden" name="merchant_key" value={merchantKey} />
            <input type="hidden" name="return_url" value={returnUrl} />
            <input type="hidden" name="cancel_url" value={cancelUrl} />
            <input type="hidden" name="notify_url" value={notifyUrl} />
            <input type="hidden" name="name_first" value={user?.displayName || "Parent"} />
            <input type="hidden" name="email_address" value={user?.email || ""} />
            <input type="hidden" name="m_payment_id" value={selectedStudent} />
            <input type="hidden" name="item_name" value={itemName} />
            <input type="hidden" name="amount" value={totalWithFees} />

            <Button
              type="submit"
              className="w-full h-12 text-lg font-bold bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
              disabled={subjectCount === 0}
            >
              {subjectCount === 0 ? "No Subjects" : `Pay R${totalWithFees} via PayFast`}
            </Button>
          </form>

          {/* Pay Reg Fee Only (no fee) */}
          {subjectCount > 0 && !selected.regFeePaid && (
            <form action={payfastUrl} method="post" target="_top">
              <input type="hidden" name="merchant_id" value={merchantId} />
              <input type="hidden" name="merchant_key" value={merchantKey} />
              <input type="hidden" name="return_url" value={returnUrl} />
              <input type="hidden" name="cancel_url" value={cancelUrl} />
              <input type="hidden" name="notify_url" value={notifyUrl} />
              <input type="hidden" name="name_first" value={user?.displayName || "Parent"} />
              <input type="hidden" name="email_address" value={user?.email || ""} />
              <input type="hidden" name="m_payment_id" value={`${selectedStudent}-reg`} />
              <input type="hidden" name="item_name" value={`${first} ${last} - Registration Fee`} />
              <input type="hidden" name="amount" value={REG_FEE.toFixed(2)} />

              <Button
                type="submit"
                variant="outline"
                className="w-full border-yellow-500 text-yellow-700 hover:bg-yellow-50"
              >
                Pay Registration Fee Only (R350)
              </Button>
            </form>
          )}
        </motion.div>
      )}

      {/* Payment History */}
      {payments.length > 0 && (
        <Card className="p-5 mt-8">
          <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
            <Receipt className="w-5 h-5" /> Payment History
          </h3>
          <div className="space-y-3">
            {payments.map((p) => (
              <div key={p.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg text-sm">
                <div className="flex items-center gap-3">
                  {p.status === "success" ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : p.status === "pending" ? (
                    <Clock className="w-5 h-5 text-yellow-600" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-red-600" />
                  )}
                  <div>
                    <p className="font-medium">R{p.amount.toFixed(2)}</p>
                    <p className="text-xs text-gray-600">{p.purpose}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">
                    {p.timestamp?.toDate?.()?.toLocaleDateString() || "Unknown"}
                  </p>
                  {p.transactionId && (
                    <p className="text-xs font-mono text-gray-600">ID: {p.transactionId}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* PayFast Logo */}
      <div className="text-center mt-8">
        <img
          src="https://www.payfast.co.za/images/logo/pf-logo-small.png"
          alt="PayFast"
          className="h-8 mx-auto"
        />
        <p className="text-xs text-gray-500 mt-1">Secure payment powered by PayFast</p>
      </div>
    </div>
  );
}