"use client";

import React, { useState, useEffect, useRef } from "react";
import { db } from "@/lib/firebaseConfig";
import { 
  collection, query, where, onSnapshot, 
  serverTimestamp, writeBatch, doc
} from "firebase/firestore";
import { useAuth } from "@/components/auth/AuthProvider";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, CheckCircle2, Clock, Printer, ExternalLink } from "lucide-react";

// PayFast Credentials
const MERCHANT_ID = import.meta.env.VITE_PAYFAST_MERCHANT_ID;
const MERCHANT_KEY = import.meta.env.VITE_PAYFAST_MERCHANT_KEY;
const PAYFAST_URL = "https://www.payfast.co.za/eng/process"; // Use https://sandbox.payfast.co.za/eng/process for testing

const MONTHLY_TUITION = 1200; 
const REGISTRATION_FEE = 550;

export default function PaymentsSection() {
  const { user } = useAuth();
  const invoiceRef = useRef<HTMLDivElement>(null);

  const [students, setStudents] = useState<any[]>([]);
  const [invoiceHistory, setInvoiceHistory] = useState<any[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>("all");
  const [paymentType, setPaymentType] = useState<"all" | "tuition" | "registration">("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) return;

    const qStudents = query(collection(db, "students"), where("parentId", "==", user.uid));
    const unsubStudents = onSnapshot(qStudents, (snap) => {
      setStudents(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const qHistory = query(
      collection(db, "invoices"), 
      where("parentId", "==", user.uid),
      where("status", "==", "pending") // Focus on pending for the checkout
    );

    const unsubHistory = onSnapshot(qHistory, (snap) => {
      setInvoiceHistory(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });

    return () => { unsubStudents(); unsubHistory(); };
  }, [user?.uid]);

  /* ---------------- CALCULATIONS ---------------- */
 // 1. Determine which students are included
const targetStudents = selectedStudentId === "all" ? students : students.filter(s => s.id === selectedStudentId);

// 2. Logic-based totals
const includesTuition = paymentType === "all" || paymentType === "tuition" || paymentType === "both";
const includesRegistration = paymentType === "all" || paymentType === "registration" || paymentType === "both";

// 3. Calculate Fees
// Only bill registration for students who haven't paid it yet
const calcTuition = includesTuition ? targetStudents.length * MONTHLY_TUITION : 0;
const calcReg = includesRegistration ? targetStudents.filter(s => !s.registrationPaid).length * REGISTRATION_FEE : 0;

const baseAmount = calcTuition + calcReg;
const PROCESSING_FEE = 0.10 * baseAmount;
const finalTotal = baseAmount + PROCESSING_FEE;

  /* ---------------- PayFast Checkout Logic ---------------- */
  const handlePayFastCheckout = () => {
    if (finalTotal <= 0) {
      alert("No balance due to pay.");
      return;
    }

    // Prepare data for PayFast
    const itemNames = targetStudents.map(s => `${s.firstName}`).join(", ");
    const paymentData: any = {
      merchant_id: MERCHANT_ID,
      merchant_key: MERCHANT_KEY,
      amount: finalTotal.toFixed(2),
      item_name: `School Fees: ${itemNames}`,
      name_first: user?.displayName?.split(' ')[0] || "Guardian",
      email_address: user?.email || "",
      m_payment_id: `INV-${Date.now()}`, // Unique reference
      return_url: window.location.origin + "/dashboard?status=success",
      cancel_url: window.location.origin + "/dashboard?status=cancelled",
    };

    // Create a hidden form and submit it to PayFast
    const form = document.createElement("form");
    form.method = "POST";
    form.action = PAYFAST_URL;
    form.target = "_blank";

    Object.keys(paymentData).forEach((key) => {
      const input = document.createElement("input");
      input.type = "hidden";
      input.name = key;
      input.value = paymentData[key];
      form.appendChild(input);
    });

    document.body.appendChild(form);
    form.submit();
  };

 /* ---------------- Invoice Generation Logic ---------------- */
const handlePrintInvoice = async () => {
  const printContent = invoiceRef.current;
  // Ensure we have the necessary data before proceeding
  if (!printContent || !user || targetStudents.length === 0) {
    alert("Please select at least one student and ensure all data is loaded.");
    return;
  }

  // 1. Determine the category based on user selection
  const categoryMap: Record<string, string> = {
    tuition: "Monthly Tuition",
    registration: "Registration Fee",
    both: "Tuition + Registration",
    all: "Tuition + Registration"
  };
  const dynamicCategory = categoryMap[paymentType] || "School Fees";

  try {
    const batch = writeBatch(db);
    const newInvoiceRef = doc(collection(db, "invoices"));
    
    // Generate a human-readable invoice number
    const invoiceNumber = `INV-${Date.now().toString().slice(-6)}`;

    // 2. Prepare the database entry
    batch.set(newInvoiceRef, {
      invoiceId: invoiceNumber,
      parentId: user.uid,
      // Store IDs in an array so Principal can query individual student finances
      targetStudentIds: targetStudents.map(s => s.id), 
      studentNames: targetStudents.map(s => `${s.firstName} ${s.lastName}`).join(", "),
      amount: Number(finalTotal),   
      category: dynamicCategory,
      status: "pending", // This triggers the 'Red' status in Principal's stats
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      breakdown: {
        tuition: Number(calcTuition),
        registration: Number(calcReg),
        adminFee: Number(PROCESSING_FEE)
      }
    });

    // 3. Update Student Registry Status
    // This ensures the Principal's "Unpaid" stat increments in real-time
    targetStudents.forEach((student) => {
      const studentDocRef = doc(db, "students", student.id);
      batch.update(studentDocRef, { 
        paymentReceived: false,
        lastInvoiceDate: serverTimestamp(),
        outstandingBalance: true // Helper flag for quick filtering
      });
    });

    // 4. Commit to Firestore
    await batch.commit();
    
    // 5. Trigger UI Feedback & Print
    console.log(`Invoice ${invoiceNumber} generated successfully.`);
    window.print();
    
  } catch (e) {
    console.error("Invoice Save Error:", e);
    alert("System error: The invoice was not saved to the database.");
  }
};

  /* ---------------- Render Component ---------------- */
  if (loading) return <div className="p-20 text-center font-bold text-indigo-600">Syncing Records...</div>;

  return (
    <div className="space-y-6 max-w-5xl mx-auto p-4 animate-in fade-in">
      <Tabs defaultValue="pay" className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-black text-slate-900">FINANCIAL PORTAL</h2>
          <TabsList className="bg-slate-100 rounded-xl">
            <TabsTrigger value="pay" className="font-bold">New Payment</TabsTrigger>
            <TabsTrigger value="history" className="font-bold">My Invoices</TabsTrigger>
          </TabsList>
        </div>

{/* Invoice Preview */}
        <TabsContent value="pay" className="space-y-6 outline-none">
          <div className="grid lg:grid-cols-3 gap-8">
            <Card className="lg:col-span-2 border-0 shadow-2xl rounded-[2.5rem] overflow-hidden">
               <CardHeader className="bg-slate-900 text-white p-8 text-center">
                 <CardTitle className="text-xs font-black tracking-[0.3em] uppercase opacity-70">Payment Configuration</CardTitle>
               </CardHeader>
               <CardContent className="p-8 space-y-8">
                 <div className="grid md:grid-cols-2 gap-6">
                   <div className="space-y-2">
                     <Label className="text-[10px] font-bold text-slate-400 uppercase">Student</Label>
                     <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
                       <SelectTrigger className="rounded-2xl h-14 bg-slate-50 border-none font-bold"><SelectValue /></SelectTrigger>
                       <SelectContent>
                         <SelectItem value="all">All Students</SelectItem>
                         {students.map(s => <SelectItem key={s.id} value={s.id}>{s.firstName} {s.lastName}</SelectItem>)}
                       </SelectContent>
                     </Select>
                   </div>
                   <div className="space-y-2">
                     <Label className="text-[10px] font-bold text-slate-400 uppercase">Category</Label>
                    <Select value={paymentType} onValueChange={(v: any) => setPaymentType(v)}>
                      <SelectTrigger className="rounded-2xl h-14 bg-slate-50 border-none font-bold">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Full Settlement (Pending Invoices)</SelectItem>
                        <SelectItem value="tuition">Tuition Only</SelectItem>
                        <SelectItem value="registration">Registration Only</SelectItem>
                        <SelectItem value="both">Registration + Tuition</SelectItem>
                      </SelectContent>
                    </Select>
                   </div>
                 </div>

                 <div className="flex flex-col sm:flex-row gap-4">
                   <Button onClick={handlePrintInvoice} variant="outline" className="flex-1 h-16 rounded-2xl border-2 font-black gap-2">
                     <Printer size={20} /> GENERATE INVOICE
                   </Button>
                   <Button onClick={handlePayFastCheckout} className="flex-[2] h-16 bg-emerald-500 hover:bg-emerald-600 rounded-2xl font-black text-lg shadow-lg">
                     PAY ONLINE NOW (R{finalTotal.toFixed(2)}) <ExternalLink size={20} className="ml-2" />
                   </Button>
                 </div>
               </CardContent>
            </Card>

{/* Invoice Preview */}
            <div className="lg:block" ref={invoiceRef}>
               <div className="bg-white p-8 rounded-[2.5rem] border-2 border-slate-100 shadow-xl">
                 <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Billed To:</h3>
                 <p className="font-black text-slate-900 truncate">{user?.displayName || "Guardian"}</p>

                                  {/* table of fees */}
                  <table className="w-full my-6 text-sm font-bold text-slate-600">
                    <tbody className="divide-y divide-slate-100">
                      {calcTuition > 0 && (
                        <tr>
                          <td className="py-2">Tuition Fee ({targetStudents.length} Students)</td>
                          <td className="text-right text-slate-900">R{calcTuition.toFixed(2)}</td>
                        </tr>
                      )}
                      {calcReg > 0 && (
                        <tr>
                          <td className="py-2">Registration Fee</td>
                          <td className="text-right text-slate-900">R{calcReg.toFixed(2)}</td>
                        </tr>
                      )}
                      <tr className="border-t-2 border-slate-900">
                        <td className="py-2 pt-4">Admin Fee (10%)</td>
                        <td className="text-right text-slate-900 pt-4">R{PROCESSING_FEE.toFixed(2)}</td>
                      </tr>
                    </tbody>
                  </table>

                 <div className="bg-slate-900 text-white p-6 rounded-2xl text-center">
                   <p className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-400 mb-1">Total Due</p>
                   <h2 className="text-3xl font-black">R{finalTotal.toFixed(2)}</h2>
                 </div>
               </div>
            </div>
          </div>
        </TabsContent>

{/* Invoice History */}
        <TabsContent value="history" className="outline-none">
          <Card className="border-0 shadow-xl rounded-[2rem] overflow-hidden bg-white">
            <CardContent className="p-0">
              <table className="w-full">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="p-6 text-left text-[10px] font-black text-slate-400 uppercase">Date</th>
                    <th className="p-6 text-left text-[10px] font-black text-slate-400 uppercase">Description</th>
                    <th className="p-6 text-right text-[10px] font-black text-slate-400 uppercase">Amount</th>
                    <th className="p-6 text-center text-[10px] font-black text-slate-400 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {invoiceHistory.length > 0 ? invoiceHistory.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-6 text-sm font-bold text-slate-600">
                        {inv.createdAt?.toDate().toLocaleDateString() || "Recent"}
                      </td>
                      <td className="p-6">
                        <span className="text-[9px] font-black text-slate-400 uppercase">{inv.category}</span>
                        <p className="text-xs font-bold text-slate-900">{inv.studentNames}</p>
                      </td>
                      <td className="p-6 text-right font-black text-slate-900 text-lg">
                        R{(Number(inv.amount) || 0).toFixed(2)}
                      </td>
                      <td className="p-6 text-center">
                        <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase ${
                          inv.status === "paid" ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                        }`}>
                          {inv.status === "paid" ? <CheckCircle2 size={12} /> : <Clock size={12} />}
                          {inv.status === "paid" ? "PAID" : "PENDING"}
                        </div>
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan={4} className="p-20 text-center text-slate-400 font-bold italic">No invoice history found.</td></tr>
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}