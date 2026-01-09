"use client";

import React, { useState, useEffect, useRef } from "react";
import { db } from "@/lib/firebaseConfig";
import { 
  collection, query, where, onSnapshot, 
  addDoc, serverTimestamp, orderBy, writeBatch, doc
} from "firebase/firestore";
import { useAuth } from "@/components/auth/AuthProvider";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, CheckCircle2, Clock, Printer, ExternalLink } from "lucide-react";

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

    // Fetch students linked to this parent
    const qStudents = query(collection(db, "students"), where("parentId", "==", user.uid));
    const unsubStudents = onSnapshot(qStudents, (snap) => {
      setStudents(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // Fetch invoice history
    const qHistory = query(
      collection(db, "invoices"), 
      where("parentId", "==", user.uid),
      orderBy("createdAt", "desc")
    );

    const unsubHistory = onSnapshot(qHistory, 
      (snap) => {
        setInvoiceHistory(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      (error) => {
        console.error("Firestore Error (History):", error);
        setLoading(false);
      }
    );

    return () => { unsubStudents(); unsubHistory(); };
  }, [user?.uid]);

  /* ---------------- CALCULATIONS (Fixed for Individual Tracking) ---------------- */
  
  // Filter students based on selection
  const targetStudents = selectedStudentId === "all" ? students : students.filter(s => s.id === selectedStudentId);
  
  // Filter pending invoices based on selection to get correct balance
  const targetInvoices = invoiceHistory.filter(inv => {
    const isPending = inv.status === "pending";
    if (selectedStudentId === "all") return isPending;
    return isPending && inv.studentId === selectedStudentId;
  });

  // Calculate raw total from existing pending invoices
  const rawTotal = targetInvoices.reduce((sum, inv) => sum + (Number(inv.amount) || 0), 0);
  
  // Alternative calculation for NEW invoices (Tuition + Registration)
  const calcTuition = paymentType !== "registration" ? targetStudents.length * MONTHLY_TUITION : 0;
  const calcReg = paymentType !== "tuition" ? targetStudents.filter(s => !s.registrationPaid).length * REGISTRATION_FEE : 0;
  
  // Final calculation logic
  const baseAmount = rawTotal > 0 ? rawTotal : (calcTuition + calcReg);
  const PROCESSING_FEE = 0.10 * baseAmount;
  const finalTotal = baseAmount + PROCESSING_FEE;

  /* ---------------- Updated handlePrintInvoice with Multi-Child Sync ---------------- */
  const handlePrintInvoice = async () => {
    const printContent = invoiceRef.current;
    if (!printContent || !user) return;

    // 1. Prevent Duplicates: Check if this specific selection already has a pending invoice
    const existingPending = invoiceHistory.find(inv => 
      inv.status === "pending" && 
      (selectedStudentId === "all" || inv.studentId === selectedStudentId)
    );
    
    if (existingPending) {
      alert(`An active invoice for R${(Number(existingPending.amount) || 0).toFixed(2)} is already pending.`);
      return;
    }

    try {
      const batch = writeBatch(db);

      // 2. Create the Invoice Document (Save as Number, not String!)
      const newInvoiceRef = doc(collection(db, "invoices"));
      batch.set(newInvoiceRef, {
        parentId: user.uid,
        studentId: selectedStudentId, // "all" or specific ID
        amount: Number(finalTotal),   // 💡 Force numeric type
        category: paymentType.toUpperCase(),
        status: "pending",
        createdAt: serverTimestamp(),
        studentNames: targetStudents.map(s => `${s.firstName} ${s.lastName}`).join(", ")
      });

      // 3. Update ALL affected students to paymentReceived: false
      targetStudents.forEach((student) => {
        const studentDocRef = doc(db, "students", student.id);
        batch.update(studentDocRef, { 
          paymentReceived: false,
          lastInvoiceDate: serverTimestamp()
        });
      });

      await batch.commit();
    } catch (e) {
      console.error("Invoice Generation Error:", e);
      alert("Failed to sync with database. Please try again.");
      return;
    }

    // 4. Print Logic
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed'; iframe.style.width = '0'; iframe.style.height = '0'; iframe.style.border = '0';
    document.body.appendChild(iframe);
    
    const htmlContent = `
      <html>
        <head><style>body { font-family: sans-serif; padding: 40px; } .header { border-bottom: 2px solid #4f46e5; padding-bottom: 20px; }</style></head>
        <body>
          <div class="header"><h2>CARE ACADEMY - TAX INVOICE</h2></div>
          ${printContent.innerHTML}
        </body>
      </html>
    `;

    const docObj = iframe.contentWindow?.document;
    if (docObj) {
      docObj.open(); docObj.write(htmlContent); docObj.close();
      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        document.body.removeChild(iframe);
      }, 500);
    }
  };

  if (loading) return <div className="p-20 text-center font-bold text-indigo-600 italic">Syncing Financial Records...</div>;

  return (
    <div className="space-y-6 max-w-5xl mx-auto p-4 animate-in fade-in duration-500">
      <Tabs defaultValue="pay" className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">FINANCIAL PORTAL</h2>
          <TabsList className="bg-slate-100 rounded-xl p-1">
            <TabsTrigger value="pay" className="font-bold rounded-lg px-6">New Payment</TabsTrigger>
            <TabsTrigger value="history" className="font-bold flex gap-2 rounded-lg px-6"><FileText size={16} /> My Invoices</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="pay" className="space-y-6 outline-none">
          <div className="grid lg:grid-cols-3 gap-8">
            <Card className="lg:col-span-2 border-0 shadow-2xl rounded-[2.5rem] overflow-hidden">
               <CardHeader className="bg-slate-900 text-white p-8 text-center">
                 <CardTitle className="text-xs font-black tracking-[0.3em] uppercase opacity-70">Settlement Configuration</CardTitle>
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
                       <SelectTrigger className="rounded-2xl h-14 bg-slate-50 border-none font-bold"><SelectValue /></SelectTrigger>
                       <SelectContent>
                         <SelectItem value="all">Full Settlement</SelectItem>
                         <SelectItem value="tuition">Tuition Only</SelectItem>
                         <SelectItem value="registration">Registration Only</SelectItem>
                       </SelectContent>
                     </Select>
                   </div>
                 </div>

                 <div className="flex flex-col sm:flex-row gap-4">
                   <Button onClick={handlePrintInvoice} variant="outline" className="flex-1 h-16 rounded-2xl border-2 font-black gap-2">
                     <Printer size={20} /> GENERATE INVOICE
                   </Button>
                   <Button asChild className="flex-[2] h-16 bg-emerald-500 hover:bg-emerald-600 rounded-2xl font-black text-lg shadow-lg">
                     <a href="https://external-payment-link.com" target="_blank">PAY ONLINE NOW <ExternalLink size={20} className="ml-2" /></a>
                   </Button>
                 </div>
               </CardContent>
            </Card>

            <div className="lg:block" ref={invoiceRef}>
               <div className="bg-white p-8 rounded-[2.5rem] border-2 border-slate-100 shadow-xl">
                 <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Billed To:</h3>
                 <p className="font-black text-slate-900 truncate">{user?.displayName || "Guardian"}</p>
                 
                 <table className="w-full my-6 text-sm">
                   <tbody>
                    <tr>
                        <td className="py-2 font-bold text-slate-600">Base Amount</td>
                        <td className="text-right font-black text-slate-900">R{(Number(baseAmount) || 0).toFixed(2)}</td>
                    </tr>
                    <tr className="border-t">
                        <td className="py-2 font-bold text-slate-600">Admin Fee (10%)</td>
                        <td className="text-right font-black text-slate-900">R{(Number(PROCESSING_FEE) || 0).toFixed(2)}</td>
                    </tr>
                   </tbody>
                 </table>

                 <div className="bg-slate-900 text-white p-6 rounded-2xl text-center">
                   <p className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-400 mb-1">Total Due</p>
                   <h2 className="text-3xl font-black">R{(Number(finalTotal) || 0).toFixed(2)}</h2>
                 </div>
               </div>
            </div>
          </div>
        </TabsContent>

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