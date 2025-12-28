"use client";

import React, { useState, useEffect } from "react";
import { db } from "@/lib/firebaseConfig";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { useAuth } from "@/components/auth/AuthProvider";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";

import { 
  ChevronDown, ChevronUp, CreditCard, DollarSign, 
  Receipt, Tag, Ticket, CheckCircle, Info 
} from "lucide-react";
import md5 from "md5";

/* ===========================================================
   CONSTANTS & RATES
=========================================================== */
const MONTHLY_TUITION = 1000; 
const REGISTRATION_FEE = 500;
const TRANSACTION_FEE_RATE = 0.05; // 5%
const VAT_RATE = 0.15; // 15%

// Valid promo codes for this logic
const VALID_PROMOS: Record<string, number> = {
  "SAVE10": 0.10,
  "EXAMREADY": 0.15,
  "WELCOME20": 0.20,
};

/* ===========================================================
   PAYFAST CONFIG
=========================================================== */
const PAYFAST_MERCHANT_ID = import.meta.env.VITE_PAYFAST_MERCHANT_ID || "";
const PAYFAST_MERCHANT_KEY = import.meta.env.VITE_PAYFAST_MERCHANT_KEY || "";
const PAYFAST_PASSPHRASE = import.meta.env.VITE_PAYFAST_PASSPHRASE || "";
const PAYFAST_SANDBOX = import.meta.env.VITE_PAYFAST_SANDBOX === "true";
const PAYFAST_URL = PAYFAST_SANDBOX ? "https://sandbox.payfast.co.za/eng/process" : "https://www.payfast.co.za/eng/process";

export default function PaymentsSection() {
  const { user } = useAuth();

  const [students, setStudents] = useState<any[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>("all");
  const [paymentType, setPaymentType] = useState<"all" | "tuition" | "registration">("all");
  const [bankDetails, setBankDetails] = useState<any>({});
  const [autoPayEnabled, setAutoPayEnabled] = useState(false);
  const [autoPayItems, setAutoPayItems] = useState<string[]>(["tuition"]); // Options: tuition, registration
  const [loading, setLoading] = useState(true);

  // Promo State
  const [promoInput, setPromoInput] = useState("");
  const [appliedPromo, setAppliedPromo] = useState("");
  const [promoDiscount, setPromoDiscount] = useState(0);

  // Collapsible states
  const [payNowOpen, setPayNowOpen] = useState(true);
  const [autoPayOpen, setAutoPayOpen] = useState(false);

  useEffect(() => {
    if (!user?.uid) return;

    const studentsQuery = query(collection(db, "students"), where("parentId", "==", user.uid), where("status", "==", "enrolled"));
    const unsubStudents = onSnapshot(studentsQuery, (snap) => {
      setStudents(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const parentRef = doc(db, "parents", user.uid);
    const unsubParent = onSnapshot(parentRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setBankDetails(data.bankDetails || {});
        setAutoPayEnabled(data.autoPayEnabled || false);
        if (data.autoPayItems) setAutoPayItems(data.autoPayItems);
      }
    });

    setLoading(false);
    return () => { unsubStudents(); unsubParent(); };
  }, [user?.uid]);

  /* ===========================================================
     CALCULATION LOGIC (REACTIVE)
  =========================================================== */
  const targetStudents = selectedStudentId === "all" ? students : students.filter(s => s.id === selectedStudentId);
  
  // 1. Base Tuition
  const rawTuition = paymentType !== "registration" ? targetStudents.length * MONTHLY_TUITION : 0;
  
  // 2. Base Registration
  const unpaidRegCount = targetStudents.filter(s => !s.registrationPaid).length;
  const rawRegistration = paymentType !== "tuition" ? unpaidRegCount * REGISTRATION_FEE : 0;

  // 3. Apply Discount (Tuition only usually, or subtotal)
  const subtotal = rawTuition + rawRegistration;
  const discountAmount = subtotal * promoDiscount;
  const amountAfterDiscount = subtotal - discountAmount;

  // 4. Fees (Calculated on the discounted amount)
  const transactionFee = amountAfterDiscount * TRANSACTION_FEE_RATE;
  const vatAmount = (amountAfterDiscount + transactionFee) * VAT_RATE;
  const finalTotal = amountAfterDiscount + transactionFee + vatAmount;

  /* ===========================================================
     HANDLERS
  =========================================================== */
  const handleApplyPromo = () => {
    const code = promoInput.trim().toUpperCase();
    if (VALID_PROMOS[code]) {
      setPromoDiscount(VALID_PROMOS[code]);
      setAppliedPromo(code);
    } else {
      alert("Invalid Promo Code");
      setPromoDiscount(0);
      setAppliedPromo("");
    }
  };

  const initiatePayFast = () => {
    if (finalTotal <= 0) return alert("Nothing to pay.");

    const payfastData: Record<string, string> = {
      merchant_id: import.meta.env.VITE_PAYFAST_MERCHANT_ID,
      merchant_key: import.meta.env.VITE_PAYFAST_MERCHANT_KEY,
      amount: finalTotal.toFixed(2),
      item_name: `School Payment: ${paymentType.toUpperCase()}`,
      item_description: `Payment for ${targetStudents.length} student(s) ${appliedPromo ? `(Promo: ${appliedPromo})` : ""}`,
      email_address: user?.email || "",
      m_payment_id: `PAY-${Date.now()}`,
    };

    // Signature generation logic would go here as per your environment
    const form = document.createElement("form");
    form.method = "POST";
    form.action = PAYFAST_URL;
    Object.entries(payfastData).forEach(([k, v]) => {
      const i = document.createElement("input");
      i.name = k; i.value = v; form.appendChild(i);
    });
    document.body.appendChild(form);
    form.submit();
  };

  const saveBankDetails = async () => {
    await updateDoc(doc(db, "parents", user.uid), { 
      bankDetails, 
      autoPayItems,
      updatedAt: serverTimestamp() 
    });
    alert("Preferences saved.");
  };

  if (loading) return <div className="p-20 text-center">Loading...</div>;

  return (
    <div className="space-y-8 max-w-4xl mx-auto p-4">
      {/* 1. MAKE PAYMENT CARD */}
      <Card className="border-0 shadow-2xl overflow-hidden">
        <CardHeader 
          className="cursor-pointer bg-indigo-600 text-white" 
          onClick={() => setPayNowOpen(!payNowOpen)}
        >
          <CardTitle className="flex justify-between items-center">
            <span className="flex items-center gap-2"><CreditCard /> Immediate Payment</span>
            {payNowOpen ? <ChevronUp /> : <ChevronDown />}
          </CardTitle>
        </CardHeader>

        {payNowOpen && (
          <CardContent className="p-6 space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <Label>Who are you paying for?</Label>
                  <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Registered Students</SelectItem>
                      {students.map(s => <SelectItem key={s.id} value={s.id}>{s.firstName} {s.lastName}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Item Selection</Label>
                  <Select value={paymentType} onValueChange={(v: any) => setPaymentType(v)}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tuition + Registration</SelectItem>
                      <SelectItem value="tuition">Tuition Only</SelectItem>
                      <SelectItem value="registration">Registration Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Promo Code Box */}
              <div className="bg-gray-50 p-4 rounded-xl border-2 border-dashed border-gray-200">
                <Label className="flex items-center gap-2"><Ticket size={16}/> Have a Promo Code?</Label>
                <div className="flex gap-2 mt-2">
                  <Input 
                    placeholder="Enter code..." 
                    value={promoInput} 
                    onChange={e => setPromoInput(e.target.value)} 
                    className="bg-white"
                  />
                  <Button onClick={handleApplyPromo} variant="secondary">Apply</Button>
                </div>
                {appliedPromo && <p className="text-green-600 text-xs mt-2 font-bold">Code {appliedPromo} Applied!</p>}
              </div>
            </div>

            {/* Fee Breakdown */}
            <div className="bg-indigo-50/50 p-6 rounded-2xl space-y-3">
              <div className="flex justify-between text-sm">
                <span>Tuition Subtotal ({targetStudents.length} Students)</span>
                <span>R{rawTuition.toFixed(2)}</span>
              </div>
              {rawRegistration > 0 && (
                <div className="flex justify-between text-sm">
                  <span>Registration Fees ({unpaidRegCount} Unpaid)</span>
                  <span>R{rawRegistration.toFixed(2)}</span>
                </div>
              )}
              {promoDiscount > 0 && (
                <div className="flex justify-between text-sm text-green-600 font-bold italic">
                  <span>Promo Discount ({promoDiscount * 100}%)</span>
                  <span>-R{discountAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-xs text-gray-500 border-t pt-2">
                <span>Transaction Processing (5%)</span>
                <span>R{transactionFee.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs text-gray-500">
                <span>VAT (15%)</span>
                <span>R{vatAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-2xl font-black text-indigo-900 pt-2">
                <span>Total Amount</span>
                <span>R{finalTotal.toFixed(2)}</span>
              </div>
            </div>

            <Button onClick={initiatePayFast} size="lg" className="w-full bg-orange-500 hover:bg-orange-600 h-16 text-xl">
              Pay Now via PayFast
            </Button>
          </CardContent>
        )}
      </Card>

      {/* 2. AUTO-PAYMENT SETUP */}
      <Card className="border-0 shadow-2xl overflow-hidden">
        <CardHeader 
          className="cursor-pointer bg-emerald-600 text-white" 
          onClick={() => setAutoPayOpen(!autoPayOpen)}
        >
          <CardTitle className="flex justify-between items-center">
            <span className="flex items-center gap-2"><CreditCard /> Auto-Debit Preferences</span>
            {autoPayOpen ? <ChevronUp /> : <ChevronDown />}
          </CardTitle>
        </CardHeader>

        {autoPayOpen && (
          <CardContent className="p-6 space-y-6">
            <Alert className="bg-emerald-50 border-emerald-200">
              <Info className="h-4 w-4 text-emerald-600" />
              <AlertDescription className="text-emerald-800">
                Auto-debits occur on the 1st of every month for the items selected below.
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              <Label className="text-lg">What should be paid automatically?</Label>
              <div className="flex flex-wrap gap-6">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="auto-tuition" 
                    checked={autoPayItems.includes("tuition")} 
                    onCheckedChange={(checked) => {
                      setAutoPayItems(prev => checked ? [...prev, "tuition"] : prev.filter(i => i !== "tuition"));
                    }}
                  />
                  <label htmlFor="auto-tuition">Monthly Tuition</label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="auto-reg" 
                    checked={autoPayItems.includes("registration")} 
                    onCheckedChange={(checked) => {
                      setAutoPayItems(prev => checked ? [...prev, "registration"] : prev.filter(i => i !== "registration"));
                    }}
                  />
                  <label htmlFor="auto-reg">Registration Fees (if pending)</label>
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Bank Name</Label>
                <Input value={bankDetails.bankName || ""} onChange={e => setBankDetails({...bankDetails, bankName: e.target.value})} />
              </div>
              <div>
                <Label>Account Number</Label>
                <Input value={bankDetails.accountNumber || ""} onChange={e => setBankDetails({...bankDetails, accountNumber: e.target.value})} />
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
              <div>
                <p className="font-bold">Active Auto-Pay Status</p>
                <p className="text-xs text-gray-500">Enable or disable monthly debiting</p>
              </div>
              <Switch checked={autoPayEnabled} onCheckedChange={setAutoPayEnabled} />
            </div>

            <Button onClick={saveBankDetails} className="w-full bg-emerald-600">
              Save Auto-Pay Preferences
            </Button>
          </CardContent>
        )}
      </Card>
    </div>
  );
}