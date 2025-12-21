import React, { useState } from 'react';

interface Assignment {
  id: string;
  title: string;
  subject: string;
  dueDate: string;
  status: 'pending' | 'submitted' | 'graded';
  grade?: string;
  description: string;
}

const AssignmentManager: React.FC = () => {
  const [assignments] = useState<Assignment[]>([
    {
      id: '1',
      title: 'Quadratic Equations Worksheet',
      subject: 'Mathematics',
      dueDate: '2024-01-25',
      status: 'pending',
      description: 'Complete exercises 1-20 from Chapter 5'
    },
    {
      id: '2',
      title: 'Physics Lab Report',
      subject: 'Physics',
      dueDate: '2024-01-22',
      status: 'submitted',
      description: 'Write a detailed report on the pendulum experiment'
    },
    {
      id: '3',
      title: 'English Essay',
      subject: 'English',
      dueDate: '2024-01-20',
      status: 'graded',
      grade: 'A-',
      description: 'Write a 500-word essay on Shakespeare\'s themes'
    }
  ]);

  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'submitted': return 'bg-blue-100 text-blue-800';
      case 'graded': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (dueDate: string) => {
    const due = new Date(dueDate);
    const now = new Date();
    const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 3600 * 24));
    
    if (diffDays <= 1) return 'border-l-red-500';
    if (diffDays <= 3) return 'border-l-yellow-500';
    return 'border-l-green-500';
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Assignment Manager</h2>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
          + New Assignment
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Assignment List */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-800">All Assignments</h3>
          {assignments.map((assignment) => (
            <div 
              key={assignment.id}
              className={`p-4 border-l-4 ${getPriorityColor(assignment.dueDate)} bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors`}
              onClick={() => setSelectedAssignment(assignment)}
            >
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-semibold text-gray-900">{assignment.title}</h4>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(assignment.status)}`}>
                  {assignment.status}
                </span>
              </div>
              <p className="text-sm text-gray-600 mb-2">{assignment.subject}</p>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500">Due: {assignment.dueDate}</span>
                {assignment.grade && (
                  <span className="font-bold text-green-600">{assignment.grade}</span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Assignment Details */}
        <div>
          {selectedAssignment ? (
            <div className="bg-blue-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Assignment Details</h3>
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-gray-700">Title</h4>
                  <p className="text-gray-900">{selectedAssignment.title}</p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-700">Subject</h4>
                  <p className="text-gray-900">{selectedAssignment.subject}</p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-700">Due Date</h4>
                  <p className="text-gray-900">{selectedAssignment.dueDate}</p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-700">Description</h4>
                  <p className="text-gray-900">{selectedAssignment.description}</p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-700">Status</h4>
                  <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(selectedAssignment.status)}`}>
                    {selectedAssignment.status}
                  </span>
                </div>
                {selectedAssignment.grade && (
                  <div>
                    <h4 className="font-medium text-gray-700">Grade</h4>
                    <p className="text-2xl font-bold text-green-600">{selectedAssignment.grade}</p>
                  </div>
                )}
              </div>

              <div className="mt-6 flex space-x-3">
                {selectedAssignment.status === 'pending' && (
                  <button className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors">
                    Submit Assignment
                  </button>
                )}
                <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                  View Details
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 rounded-lg p-6 text-center">
              <p className="text-gray-500">Select an assignment to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AssignmentManager;