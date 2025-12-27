"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
} from "firebase/firestore";
import { db } from "@/lib/firebaseConfig";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

import { Tag, Percent } from "lucide-react";

/* ================= SAMPLE PROMO CODES ================= */
const SAMPLE_PROMO_CODES = [
  { code: "WELCOME10", discount: 10 },
  { code: "SAVE15", discount: 15 },
  { code: "HOLIDAY20", discount: 20 },
  { code: "VIP25", discount: 25 },
];

/* ================= CONSTANTS ================= */
const REG_FEE = 350;
const TRANSACTION_FEE_RATE = 0.05;
const VAT_RATE = 0.15;

/* ================= TYPES ================= */
interface Student {
  id: string;
  firstName: string; 
  lastName: string;
  subjects: string[];
  regFeePaid?: boolean;
}

interface Payment {
  id: string;
  amount: number;
  timestamp: any;
}

/* ================= COMPONENT ================= */
export default function PaymentsSection() {
  const { user } = useAuth();

  const [students, setStudents] = useState<Student[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [selectedStudent, setSelectedStudent] = useState("");

  const [hasPromo, setHasPromo] = useState(false);
  const [promoInput, setPromoInput] = useState("");
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [promoValid, setPromoValid] = useState(false);
  const [promoError, setPromoError] = useState("");

  /* ================= LOAD DATA ================= */
  useEffect(() => {
    if (!user?.uid) return;

    const load = async () => {
      const sSnap = await getDocs(
        query(collection(db, "students"), where("parentId", "==", user.uid))
      );
      setStudents(sSnap.docs.map(d => ({ id: d.id, ...d.data() } as Student)));

      const pSnap = await getDocs(
        query(
          collection(db, "payments"),
          where("parentId", "==", user.uid),
          orderBy("timestamp", "desc")
        )
      );
      setPayments(pSnap.docs.map(d => ({ id: d.id, ...d.data() } as Payment)));
    };

    load();
  }, [user?.uid]);

  /* ================= PROMO VALIDATION ================= */
  const validatePromo = async () => {
    setPromoError("");
    setPromoValid(false);

    const q = query(
      collection(db, "promoCodes"),
      where("code", "==", promoInput),
      where("active", "==", true)
    );

    const snap = await getDocs(q);

    if (!snap.empty) {
      setPromoDiscount(snap.docs[0].data().discountPercent);
      setPromoValid(true);
      return;
    }

    const local = SAMPLE_PROMO_CODES.find(p => p.code === promoInput);
    if (local) {
      setPromoDiscount(local.discount);
      setPromoValid(true);
      return;
    }

    setPromoError("Invalid promo code");
  };

  /* ================= CALCULATIONS ================= */
  const selected = students.find(s => s.id === selectedStudent);
  const subjectCount = selected?.subjects?.length || 0;

  const subjectsTotal = subjectCount * 250;
  const discount = promoValid ? (subjectsTotal * promoDiscount) / 100 : 0;
  const regFee = selected?.regFeePaid ? 0 : REG_FEE;

  const base = subjectsTotal - discount + regFee;
  const transaction = base * TRANSACTION_FEE_RATE;
  const vat = (base + transaction) * VAT_RATE;
  const total = (base + transaction + vat).toFixed(2);

  /* ================= UI ================= */
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">

      {/* STUDENT */}
      <Card className="p-4">
        <select
          className="w-full p-3 border rounded"
          value={selectedStudent}
          onChange={e => setSelectedStudent(e.target.value)}
        >
          <option value="">Select Student</option>
          {students.map(s => (
            <option key={s.id} value={s.id}>
              {s.firstName} {s.lastName}
            </option>
          ))}
        </select>
      </Card>

      {/* PROMO */}
      {selected && (
        <Card className="p-4 bg-indigo-50 border-indigo-300 space-y-3">
          <label className="flex items-center gap-2">
            <Checkbox checked={hasPromo} onCheckedChange={v => setHasPromo(!!v)} />
            <span className="font-semibold flex items-center gap-1">
              <Tag size={16} /> I have a promo code
            </span>
          </label>

          {hasPromo && (
            <>
              <Input
                placeholder="PROMO CODE"
                value={promoInput}
                onChange={e => setPromoInput(e.target.value.toUpperCase())}
              />
              <Button onClick={validatePromo} variant="outline">
                Apply
              </Button>

              {promoValid && (
                <Badge className="bg-green-100 text-green-800">
                  <Percent size={14} /> {promoDiscount}% applied
                </Badge>
              )}

              {promoError && <p className="text-red-600">{promoError}</p>}
            </>
          )}
        </Card>
      )}

      {/* TOTAL */}
      {selected && (
        <Card className="p-5 bg-green-50 border-green-400">
          <div className="flex justify-between font-bold text-lg">
            <span>Total Payable</span>
            <span className="text-green-700">R{total}</span>
          </div>
        </Card>
      )}

      <Button disabled={hasPromo && !promoValid} className="w-full h-12 text-lg">
        Pay R{total}
      </Button>
    </div>
  );
}
