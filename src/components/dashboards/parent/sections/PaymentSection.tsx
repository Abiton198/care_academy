"use client";

import React, { useState, useEffect, useRef } from "react";
import { db } from "@/lib/firebaseConfig";
import { 
  collection, query, where, onSnapshot, 
  serverTimestamp, writeBatch, doc, orderBy
} from "firebase/firestore";
import { useAuth } from "@/components/auth/AuthProvider";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle2, Clock, Printer, ExternalLink } from "lucide-react";

// PayFast Credentials (using import.meta.env for Vite)
const MERCHANT_ID = import.meta.env.VITE_PAYFAST_MERCHANT_ID;
const MERCHANT_KEY = import.meta.env.VITE_PAYFAST_MERCHANT_KEY;
const PAYFAST_URL = "https://www.payfast.co.za/eng/process"; 

const MONTHLY_TUITION = 1200; 
const REGISTRATION_FEE = 550;

export default function PaymentsSection() {
  const { user } = useAuth();
  const invoiceRef = useRef<HTMLDivElement>(null);

  const [students, setStudents] = useState<any[]>([]);
  const [invoiceHistory, setInvoiceHistory] = useState<any[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>("all");
  const [paymentType, setPaymentType] = useState<"all" | "tuition" | "registration" | "both">("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) return;

    // Fetch Invoices: Listens for changes so UI updates instantly when paid
    const qInvoices = query(
      collection(db, "invoices"),
      where("parentId", "==", user.uid),
      orderBy("createdAt", "desc")
    );
    const unsubInvoices = onSnapshot(qInvoices, snap => {
      setInvoiceHistory(snap.docs.map(d => ({ id: d.id, ...d.data(), selected: false })));
      setLoading(false);
    });

    // Fetch Students: Needed to check registration status and names
    const qStudents = query(collection(db, "students"), where("parentId", "==", user.uid));
    const unsubStudents = onSnapshot(qStudents, snap => {
      setStudents(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => {
      unsubInvoices();
      unsubStudents();
    };
  }, [user?.uid]);

  /* ---------------- CALCULATIONS ---------------- */
  const targetStudents = selectedStudentId === "all" ? students : students.filter(s => s.id === selectedStudentId);

  const includesTuition = paymentType === "all" || paymentType === "tuition" || paymentType === "both";
  const includesRegistration = paymentType === "all" || paymentType === "registration" || paymentType === "both";

  const calcTuition = includesTuition ? targetStudents.length * MONTHLY_TUITION : 0;
  const calcReg = includesRegistration ? targetStudents.filter(s => !s.registrationPaid).length * REGISTRATION_FEE : 0;

  const baseAmount = calcTuition + calcReg;
  const PROCESSING_FEE = 0.10 * baseAmount; // 10% Admin/Gateway fee
  const finalTotal = baseAmount + PROCESSING_FEE;

  /* ---------------- PAYFAST INTEGRATION ---------------- */
  
  // Generic function to submit POST to PayFast
  const submitToPayFast = (amount: number, itemName: string, paymentId: string) => {
    if (!user) return;

    const paymentData: any = {
      merchant_id: MERCHANT_ID,
      merchant_key: MERCHANT_KEY,
      amount: amount.toFixed(2),
      item_name: itemName,
      name_first: user.displayName?.split(' ')[0] || "Guardian",
      email_address: user.email || "",
      m_payment_id: paymentId,
      return_url: `${window.location.origin}/dashboard?status=success`,
      cancel_url: `${window.location.origin}/dashboard?status=cancelled`,
    };

    const form = document.createElement("form");
    form.method = "POST";
    form.action = PAYFAST_URL;
    form.target = "_blank";

    Object.keys(paymentData).forEach(key => {
      const input = document.createElement("input");
      input.type = "hidden";
      input.name = key;
      input.value = paymentData[key];
      form.appendChild(input);
    });

    document.body.appendChild(form);
    form.submit();
    document.body.removeChild(form);
  };

  const handlePayFastCheckout = () => {
    if (finalTotal <= 0) return alert("Total amount must be greater than zero.");
    const names = targetStudents.map(s => s.firstName).join(", ");
    submitToPayFast(finalTotal, `Fees: ${names}`, `CHECKOUT-${Date.now()}`);
  };

  const handleSingleInvoicePay = (inv: any) => {
    submitToPayFast(Number(inv.amount), `Invoice: ${inv.studentNames}`, `INV-${inv.id}`);
  };

  const handleBulkInvoicePay = () => {
    const selected = invoiceHistory.filter(inv => inv.selected && inv.status !== "paid");
    if (selected.length === 0) return;

    const total = selected.reduce((sum, inv) => sum + Number(inv.amount || 0), 0);
    const names = selected.map(inv => inv.studentNames).join(", ");
    submitToPayFast(total, `Bulk Payment: ${names}`, `BULK-${Date.now()}`);
  };

  /* ---------------- INVOICE GENERATION ---------------- */
  const handlePrintInvoice = async () => {
    if (!user || targetStudents.length === 0) return alert("Select a student first.");

    try {
      const batch = writeBatch(db);
      const newInvoiceRef = doc(collection(db, "invoices"));
      const invoiceNumber = `INV-${Date.now().toString().slice(-6)}`;

      // 1. Create Invoice Record
      batch.set(newInvoiceRef, {
        invoiceId: invoiceNumber,
        parentId: user.uid,
        targetStudentIds: targetStudents.map(s => s.id), 
        studentNames: targetStudents.map(s => `${s.firstName} ${s.lastName}`).join(", "),
        amount: Number(finalTotal.toFixed(2)),   
        category: paymentType.toUpperCase(),
        status: "pending", 
        createdAt: serverTimestamp(),
        breakdown: { tuition: calcTuition, registration: calcReg, adminFee: PROCESSING_FEE }
      });

      // 2. Update Student Flags for Principal Dashboard
      targetStudents.forEach((student) => {
        batch.update(doc(db, "students", student.id), { 
          paymentReceived: false,
          outstandingBalance: true 
        });
      });

      await batch.commit();
      window.print();
    } catch (e) {
      console.error("Error generating invoice:", e);
    }
  };

  if (loading) return <div className="p-20 text-center font-bold text-indigo-600">Loading Financial Records...</div>;

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-4 animate-in fade-in">
      <Tabs defaultValue="pay" className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">FINANCIAL PORTAL</h2>
          <TabsList className="bg-slate-100 rounded-xl p-1">
            <TabsTrigger value="pay" className="font-bold rounded-lg">New Payment</TabsTrigger>
            <TabsTrigger value="history" className="font-bold rounded-lg">Invoice History</TabsTrigger>
          </TabsList>
        </div>

        {/* NEW PAYMENT TAB */}
        <TabsContent value="pay" className="space-y-6">
          <div className="grid lg:grid-cols-3 gap-8">
            <Card className="lg:col-span-2 border-0 shadow-2xl rounded-[2rem] overflow-hidden">
               <CardHeader className="bg-slate-900 text-white p-6">
                 <CardTitle className="text-xs font-black tracking-widest uppercase opacity-70">Payment Setup</CardTitle>
               </CardHeader>
               <CardContent className="p-8 space-y-8">
                 <div className="grid md:grid-cols-2 gap-6">
                   <div className="space-y-2">
                     <Label className="text-[10px] font-bold text-slate-400 uppercase">Select Student</Label>
                     <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
                       <SelectTrigger className="rounded-xl h-12 bg-slate-50 border-none font-bold">
                         <SelectValue placeholder="Select Student" />
                       </SelectTrigger>
                       <SelectContent>
                         <SelectItem value="all">All Students</SelectItem>
                         {students.map(s => <SelectItem key={s.id} value={s.id}>{s.firstName} {s.lastName}</SelectItem>)}
                       </SelectContent>
                     </Select>
                   </div>
                   <div className="space-y-2">
                     <Label className="text-[10px] font-bold text-slate-400 uppercase">Payment Category</Label>
                    <Select value={paymentType} onValueChange={(v: any) => setPaymentType(v)}>
                      <SelectTrigger className="rounded-xl h-12 bg-slate-50 border-none font-bold"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Settlement (All)</SelectItem>
                        <SelectItem value="tuition">Tuition Only</SelectItem>
                        <SelectItem value="registration">Registration Only</SelectItem>
                        <SelectItem value="both">Tuition + Registration</SelectItem>
                      </SelectContent>
                    </Select>
                   </div>
                 </div>

                 <div className="flex flex-col sm:flex-row gap-4">
                   <Button onClick={handlePrintInvoice} variant="outline" className="flex-1 h-14 rounded-xl border-2 font-black">
                     <Printer size={18} className="mr-2" /> INVOICE
                   </Button>
                   <Button onClick={handlePayFastCheckout} className="flex-[2] h-14 bg-emerald-500 hover:bg-emerald-600 rounded-xl font-black text-white shadow-lg transition-transform active:scale-95">
                     PAY R{finalTotal.toFixed(2)} NOW <ExternalLink size={18} className="ml-2" />
                   </Button>
                 </div>
               </CardContent>
            </Card>

            {/* PREVIEW CARD */}
            <div ref={invoiceRef} className="hidden lg:block">
               <div className="bg-white p-8 rounded-[2rem] border-2 border-slate-100 shadow-xl space-y-4">
                 <div className="border-b pb-4">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase mb-1">Payer Details</h3>
                    <p className="font-black text-slate-900">{user?.displayName || "Valued Parent"}</p>
                 </div>

                 <table className="w-full text-sm font-bold text-slate-600">
                    <tbody className="divide-y divide-slate-50">
                      {calcTuition > 0 && (
                        <tr><td className="py-2">Tuition Fee</td><td className="text-right">R{calcTuition.toFixed(2)}</td></tr>
                      )}
                      {calcReg > 0 && (
                        <tr><td className="py-2">Registration</td><td className="text-right">R{calcReg.toFixed(2)}</td></tr>
                      )}
                      <tr className="text-slate-400">
                        <td className="py-2">Admin/Gateway (10%)</td>
                        <td className="text-right">R{PROCESSING_FEE.toFixed(2)}</td>
                      </tr>
                    </tbody>
                 </table>

                 <div className="bg-slate-900 text-white p-6 rounded-2xl text-center">
                   <p className="text-[9px] font-black uppercase text-emerald-400 mb-1">Amount Due</p>
                   <h2 className="text-3xl font-black">R{finalTotal.toFixed(2)}</h2>
                 </div>
               </div>
            </div>
          </div>
        </TabsContent>

        {/* HISTORY TAB */}
        <TabsContent value="history">
          <Card className="border-0 shadow-xl rounded-[2rem] overflow-hidden">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase">
                    <tr>
                      <th className="p-4 text-center">
                        <input type="checkbox" onChange={(e) => {
                          const val = e.target.checked;
                          setInvoiceHistory(prev => prev.map(i => ({...i, selected: i.status !== 'paid' ? val : false})));
                        }} />
                      </th>
                      <th className="p-4 text-left">Date</th>
                      <th className="p-4 text-left">Description</th>
                      <th className="p-4 text-right">Amount</th>
                      <th className="p-4 text-center">Status</th>
                      <th className="p-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {invoiceHistory.map((inv, idx) => (
                      <tr key={inv.id} className={`hover:bg-slate-50/50 ${inv.selected ? 'bg-emerald-50/30' : ''}`}>
                        <td className="p-4 text-center">
                          {inv.status !== 'paid' && (
                            <input type="checkbox" checked={inv.selected} onChange={(e) => {
                              const copy = [...invoiceHistory];
                              copy[idx].selected = e.target.checked;
                              setInvoiceHistory(copy);
                            }} />
                          )}
                        </td>
                        <td className="p-4 text-sm font-bold">{inv.createdAt?.toDate ? inv.createdAt.toDate().toLocaleDateString() : 'N/A'}</td>
                        <td className="p-4">
                          <p className="text-xs font-black text-slate-900 uppercase">{inv.category}</p>
                          <p className="text-[10px] text-slate-500">{inv.studentNames}</p>
                        </td>
                        <td className="p-4 text-right font-black">R{Number(inv.amount).toFixed(2)}</td>
                        <td className="p-4 text-center">
                          <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[9px] font-black ${
                            inv.status === "paid" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                          }`}>
                            {inv.status === "paid" ? <CheckCircle2 size={10} /> : <Clock size={10} />}
                            {inv.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          {inv.status !== "paid" && (
                            <Button size="sm" onClick={() => handleSingleInvoicePay(inv)} className="bg-emerald-500 hover:bg-emerald-600 h-8 rounded-lg text-[10px] font-bold">
                              PAY NOW
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {/* BULK ACTION BAR */}
              {invoiceHistory.some(i => i.selected) && (
                <div className="p-4 bg-slate-900 flex justify-between items-center text-white animate-in slide-in-from-bottom">
                  <p className="font-bold text-sm">
                    Selected Total: R{invoiceHistory.filter(i => i.selected).reduce((s, i) => s + Number(i.amount), 0).toFixed(2)}
                  </p>
                  <Button onClick={handleBulkInvoicePay} className="bg-emerald-500 hover:bg-emerald-600 font-black h-10 px-6">
                    PAY SELECTED
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}