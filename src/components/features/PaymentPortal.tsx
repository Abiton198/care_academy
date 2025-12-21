import React, { useState } from 'react';

interface Invoice {
  id: string;
  amount: number;
  dueDate: string;
  status: 'paid' | 'pending' | 'overdue';
  description: string;
  month: string;
}

interface PaymentHistory {
  id: string;
  amount: number;
  date: string;
  method: string;
  reference: string;
}

const PaymentPortal: React.FC = () => {
  const [invoices] = useState<Invoice[]>([
    {
      id: 'INV-2024-001',
      amount: 2500,
      dueDate: '2024-02-01',
      status: 'pending',
      description: 'School fees for February 2024',
      month: 'February 2024'
    },
    {
      id: 'INV-2024-002',
      amount: 2500,
      dueDate: '2024-01-01',
      status: 'overdue',
      description: 'School fees for January 2024',
      month: 'January 2024'
    },
    {
      id: 'INV-2023-012',
      amount: 2500,
      dueDate: '2023-12-01',
      status: 'paid',
      description: 'School fees for December 2023',
      month: 'December 2023'
    }
  ]);

  const [paymentHistory] = useState<PaymentHistory[]>([
    {
      id: 'PAY-001',
      amount: 2500,
      date: '2023-12-15',
      method: 'Credit Card',
      reference: 'CC-789456123'
    },
    {
      id: 'PAY-002',
      amount: 2500,
      date: '2023-11-15',
      method: 'Bank Transfer',
      reference: 'BT-456789123'
    }
  ]);

  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showPaymentForm, setShowPaymentForm] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const totalOutstanding = invoices
    .filter(inv => inv.status !== 'paid')
    .reduce((sum, inv) => sum + inv.amount, 0);

  const overdueAmount = invoices
    .filter(inv => inv.status === 'overdue')
    .reduce((sum, inv) => sum + inv.amount, 0);

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Payment Portal</h2>
        <button 
          onClick={() => setShowPaymentForm(true)}
          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
        >
          Make Payment
        </button>
      </div>

      {/* Payment Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-red-50 p-6 rounded-lg text-center">
          <h3 className="text-lg font-semibold text-red-800 mb-2">Outstanding Balance</h3>
          <p className="text-3xl font-bold text-red-600">R{totalOutstanding.toLocaleString()}</p>
        </div>
        <div className="bg-yellow-50 p-6 rounded-lg text-center">
          <h3 className="text-lg font-semibold text-yellow-800 mb-2">Overdue Amount</h3>
          <p className="text-3xl font-bold text-yellow-600">R{overdueAmount.toLocaleString()}</p>
        </div>
        <div className="bg-blue-50 p-6 rounded-lg text-center">
          <h3 className="text-lg font-semibold text-blue-800 mb-2">Next Payment Due</h3>
          <p className="text-xl font-bold text-blue-600">Feb 1, 2024</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Outstanding Invoices */}
        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Outstanding Invoices</h3>
          <div className="space-y-4">
            {invoices.filter(inv => inv.status !== 'paid').map((invoice) => (
              <div 
                key={invoice.id}
                className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                onClick={() => setSelectedInvoice(invoice)}
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="font-semibold text-gray-900">{invoice.month}</h4>
                    <p className="text-sm text-gray-600">{invoice.description}</p>
                    <p className="text-xs text-gray-500">Due: {invoice.dueDate}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-gray-900">R{invoice.amount.toLocaleString()}</p>
                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(invoice.status)}`}>
                      {invoice.status}
                    </span>
                  </div>
                </div>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedInvoice(invoice);
                    setShowPaymentForm(true);
                  }}
                  className="w-full mt-3 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors"
                >
                  Pay Now - R{invoice.amount.toLocaleString()}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Payment History */}
        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Payment History</h3>
          <div className="space-y-4">
            {paymentHistory.map((payment) => (
              <div key={payment.id} className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-semibold text-gray-900">Payment Received</h4>
                    <p className="text-sm text-gray-600">{payment.method}</p>
                    <p className="text-xs text-gray-500">Ref: {payment.reference}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-green-600">R{payment.amount.toLocaleString()}</p>
                    <p className="text-xs text-gray-500">{payment.date}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button className="w-full mt-4 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors">
            Download Statement
          </button>
        </div>
      </div>

      {/* Payment Form Modal */}
      {showPaymentForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-8 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Make Payment</h3>
            
            {selectedInvoice && (
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-semibold">{selectedInvoice.month}</h4>
                <p className="text-sm text-gray-600">{selectedInvoice.description}</p>
                <p className="text-2xl font-bold text-green-600 mt-2">R{selectedInvoice.amount.toLocaleString()}</p>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
                <select className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500">
                  <option>Credit Card</option>
                  <option>Debit Card</option>
                  <option>Bank Transfer</option>
                  <option>PayFast</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Card Number</label>
                <input 
                  type="text" 
                  placeholder="1234 5678 9012 3456"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Expiry</label>
                  <input 
                    type="text" 
                    placeholder="MM/YY"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">CVV</label>
                  <input 
                    type="text" 
                    placeholder="123"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex space-x-4 mt-8">
              <button 
                onClick={() => setShowPaymentForm(false)}
                className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
              <button className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors">
                Pay Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentPortal;