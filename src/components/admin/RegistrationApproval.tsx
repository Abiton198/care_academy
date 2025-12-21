import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  User, 
  GraduationCap, 
  Phone, 
  Mail, 
  MapPin,
  Calendar,
  School
} from 'lucide-react';

interface RegistrationRequest {
  id: string;
  parentData: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    idNumber: string;
    address: string;
    occupation: string;
  };
  learnerData: {
    firstName: string;
    lastName: string;
    idNumber: string;
    dateOfBirth: string;
    grade: string;
    previousSchool: string;
    medicalInfo: string;
    emergencyContact: string;
    emergencyPhone: string;
  };
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: string;
  submittedBy: string;
  reviewedAt?: string;
  reviewedBy?: string;
  rejectionReason?: string;
}

export const RegistrationApproval: React.FC = () => {
  const [registrations, setRegistrations] = useState<RegistrationRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<RegistrationRequest | null>(null);
  const [actionMessage, setActionMessage] = useState('');

  // Load registration requests from localStorage (in real app, this would be from Firebase)
  useEffect(() => {
    const loadRegistrations = () => {
      const stored = localStorage.getItem('registrationRequests');
      if (stored) {
        setRegistrations(JSON.parse(stored));
      }
    };

    loadRegistrations();
    // Refresh every 5 seconds to check for new registrations
    const interval = setInterval(loadRegistrations, 5000);
    return () => clearInterval(interval);
  }, []);

  // Filter registrations by status
  const pendingRegistrations = registrations.filter(r => r.status === 'pending');
  const approvedRegistrations = registrations.filter(r => r.status === 'approved');
  const rejectedRegistrations = registrations.filter(r => r.status === 'rejected');

  // Approve registration - creates parent and student accounts
  const handleApprove = (request: RegistrationRequest) => {
    // Update registration status
    const updatedRegistrations = registrations.map(r => 
      r.id === request.id 
        ? { ...r, status: 'approved' as const, reviewedAt: new Date().toISOString(), reviewedBy: 'admin' }
        : r
    );
    
    // Create parent account
    const parentAccount = {
      id: `parent_${Date.now()}`,
      email: request.parentData.email,
      password: 'temp123', // In real app, this would be securely generated
      role: 'parent',
      profile: {
        ...request.parentData,
        children: [`student_${Date.now()}`] // Link to student
      },
      createdAt: new Date().toISOString()
    };

    // Create student account  
    const studentAccount = {
      id: `student_${Date.now()}`,
      email: `${request.learnerData.firstName.toLowerCase()}.${request.learnerData.lastName.toLowerCase()}@student.nextgen.edu`,
      password: 'temp123', // In real app, this would be securely generated
      role: 'student',
      profile: {
        ...request.learnerData,
        parentId: parentAccount.id,
        studentNumber: `STU${Date.now().toString().slice(-6)}`,
        enrollmentDate: new Date().toISOString()
      },
      createdAt: new Date().toISOString()
    };

    // Save updated registrations
    localStorage.setItem('registrationRequests', JSON.stringify(updatedRegistrations));
    
    // Save new accounts (in real app, this would be Firebase Auth + Firestore)
    const existingUsers = JSON.parse(localStorage.getItem('users') || '[]');
    existingUsers.push(parentAccount, studentAccount);
    localStorage.setItem('users', JSON.stringify(existingUsers));

    setRegistrations(updatedRegistrations);
    setActionMessage(`Registration approved! Parent and student accounts created. Login credentials will be sent via email.`);
    setSelectedRequest(null);
  };

  // Reject registration
  const handleReject = (request: RegistrationRequest, reason: string) => {
    const updatedRegistrations = registrations.map(r => 
      r.id === request.id 
        ? { 
            ...r, 
            status: 'rejected' as const, 
            reviewedAt: new Date().toISOString(), 
            reviewedBy: 'admin',
            rejectionReason: reason
          }
        : r
    );
    
    localStorage.setItem('registrationRequests', JSON.stringify(updatedRegistrations));
    setRegistrations(updatedRegistrations);
    setActionMessage(`Registration rejected. Reason: ${reason}`);
    setSelectedRequest(null);
  };

  // Registration card component
  const RegistrationCard: React.FC<{ request: RegistrationRequest }> = ({ request }) => (
    <Card className="mb-4 hover:shadow-md transition-shadow cursor-pointer" 
          onClick={() => setSelectedRequest(request)}>
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-2">
          <div>
            <h4 className="font-semibold text-lg">
              {request.parentData.firstName} {request.parentData.lastName}
            </h4>
            <p className="text-sm text-gray-600">
              Child: {request.learnerData.firstName} {request.learnerData.lastName} (Grade {request.learnerData.grade})
            </p>
          </div>
          <Badge variant={
            request.status === 'pending' ? 'secondary' : 
            request.status === 'approved' ? 'default' : 'destructive'
          }>
            {request.status === 'pending' && <Clock className="w-3 h-3 mr-1" />}
            {request.status === 'approved' && <CheckCircle className="w-3 h-3 mr-1" />}
            {request.status === 'rejected' && <XCircle className="w-3 h-3 mr-1" />}
            {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
          </Badge>
        </div>
        <div className="flex items-center gap-4 text-sm text-gray-600">
          <span className="flex items-center gap-1">
            <Mail className="w-3 h-3" />
            {request.parentData.email}
          </span>
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {new Date(request.submittedAt).toLocaleDateString()}
          </span>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Registration Management</h2>
        <div className="flex gap-2">
          <Badge variant="secondary">{pendingRegistrations.length} Pending</Badge>
          <Badge variant="default">{approvedRegistrations.length} Approved</Badge>
          <Badge variant="destructive">{rejectedRegistrations.length} Rejected</Badge>
        </div>
      </div>

      {actionMessage && (
        <Alert className="border-green-200 bg-green-50">
          <AlertDescription className="text-green-800">
            {actionMessage}
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="pending">Pending ({pendingRegistrations.length})</TabsTrigger>
          <TabsTrigger value="approved">Approved ({approvedRegistrations.length})</TabsTrigger>
          <TabsTrigger value="rejected">Rejected ({rejectedRegistrations.length})</TabsTrigger>
        </TabsList>
        
        <TabsContent value="pending" className="space-y-4">
          {pendingRegistrations.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Clock className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600">No pending registrations</p>
              </CardContent>
            </Card>
          ) : (
            pendingRegistrations.map(request => (
              <RegistrationCard key={request.id} request={request} />
            ))
          )}
        </TabsContent>
        
        <TabsContent value="approved" className="space-y-4">
          {approvedRegistrations.map(request => (
            <RegistrationCard key={request.id} request={request} />
          ))}
        </TabsContent>
        
        <TabsContent value="rejected" className="space-y-4">
          {rejectedRegistrations.map(request => (
            <RegistrationCard key={request.id} request={request} />
          ))}
        </TabsContent>
      </Tabs>

      {/* Registration Detail Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Registration Details
                <Button variant="ghost" onClick={() => setSelectedRequest(null)}>×</Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Parent Information */}
              <div className="border rounded-lg p-4 bg-blue-50">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Parent Information
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><strong>Name:</strong> {selectedRequest.parentData.firstName} {selectedRequest.parentData.lastName}</div>
                  <div><strong>Email:</strong> {selectedRequest.parentData.email}</div>
                  <div><strong>Phone:</strong> {selectedRequest.parentData.phone}</div>
                  <div><strong>ID Number:</strong> {selectedRequest.parentData.idNumber}</div>
                  <div><strong>Occupation:</strong> {selectedRequest.parentData.occupation}</div>
                  <div className="col-span-2"><strong>Address:</strong> {selectedRequest.parentData.address}</div>
                </div>
              </div>

              {/* Learner Information */}
              <div className="border rounded-lg p-4 bg-green-50">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <GraduationCap className="w-4 h-4" />
                  Learner Information
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><strong>Name:</strong> {selectedRequest.learnerData.firstName} {selectedRequest.learnerData.lastName}</div>
                  <div><strong>Date of Birth:</strong> {selectedRequest.learnerData.dateOfBirth}</div>
                  <div><strong>Grade:</strong> {selectedRequest.learnerData.grade}</div>
                  <div><strong>ID Number:</strong> {selectedRequest.learnerData.idNumber || 'Not provided'}</div>
                  <div><strong>Previous School:</strong> {selectedRequest.learnerData.previousSchool || 'Not provided'}</div>
                  <div><strong>Emergency Contact:</strong> {selectedRequest.learnerData.emergencyContact}</div>
                  <div className="col-span-2"><strong>Emergency Phone:</strong> {selectedRequest.learnerData.emergencyPhone}</div>
                  {selectedRequest.learnerData.medicalInfo && (
                    <div className="col-span-2"><strong>Medical Info:</strong> {selectedRequest.learnerData.medicalInfo}</div>
                  )}
                </div>
              </div>

              {/* Actions */}
              {selectedRequest.status === 'pending' && (
                <div className="flex gap-4 justify-end">
                  <Button 
                    variant="outline" 
                    onClick={() => handleReject(selectedRequest, 'Incomplete documentation')}
                  >
                    Reject
                  </Button>
                  <Button 
                    onClick={() => handleApprove(selectedRequest)}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    Approve & Create Accounts
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};