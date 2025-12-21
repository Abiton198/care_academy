import React, { useState } from 'react';

interface AttendanceRecord {
  date: string;
  subject: string;
  status: 'present' | 'absent' | 'late';
  teacher: string;
}

const AttendanceTracker: React.FC = () => {
  const [attendanceData] = useState<AttendanceRecord[]>([
    { date: '2024-01-22', subject: 'Mathematics', status: 'present', teacher: 'Mr. Smith' },
    { date: '2024-01-22', subject: 'Physics', status: 'present', teacher: 'Dr. Johnson' },
    { date: '2024-01-22', subject: 'Chemistry', status: 'late', teacher: 'Ms. Davis' },
    { date: '2024-01-21', subject: 'Mathematics', status: 'present', teacher: 'Mr. Smith' },
    { date: '2024-01-21', subject: 'Physics', status: 'absent', teacher: 'Dr. Johnson' },
    { date: '2024-01-21', subject: 'Chemistry', status: 'present', teacher: 'Ms. Davis' },
    { date: '2024-01-20', subject: 'Mathematics', status: 'present', teacher: 'Mr. Smith' },
    { date: '2024-01-20', subject: 'Physics', status: 'present', teacher: 'Dr. Johnson' },
  ]);

  const [selectedWeek, setSelectedWeek] = useState('current');

  // Calculate attendance statistics
  const totalClasses = attendanceData.length;
  const presentCount = attendanceData.filter(record => record.status === 'present').length;
  const lateCount = attendanceData.filter(record => record.status === 'late').length;
  const absentCount = attendanceData.filter(record => record.status === 'absent').length;
  const attendancePercentage = Math.round((presentCount / totalClasses) * 100);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present': return 'bg-green-100 text-green-800';
      case 'late': return 'bg-yellow-100 text-yellow-800';
      case 'absent': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'present': return '✓';
      case 'late': return '⏰';
      case 'absent': return '✗';
      default: return '?';
    }
  };

  // Group attendance by date
  const groupedAttendance = attendanceData.reduce((acc, record) => {
    if (!acc[record.date]) {
      acc[record.date] = [];
    }
    acc[record.date].push(record);
    return acc;
  }, {} as Record<string, AttendanceRecord[]>);

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Attendance Tracker</h2>
        <select 
          value={selectedWeek}
          onChange={(e) => setSelectedWeek(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="current">Current Week</option>
          <option value="previous">Previous Week</option>
          <option value="month">This Month</option>
        </select>
      </div>

      {/* Attendance Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-blue-50 p-4 rounded-lg text-center">
          <p className="text-2xl font-bold text-blue-600">{attendancePercentage}%</p>
          <p className="text-sm text-gray-600">Overall</p>
        </div>
        <div className="bg-green-50 p-4 rounded-lg text-center">
          <p className="text-2xl font-bold text-green-600">{presentCount}</p>
          <p className="text-sm text-gray-600">Present</p>
        </div>
        <div className="bg-yellow-50 p-4 rounded-lg text-center">
          <p className="text-2xl font-bold text-yellow-600">{lateCount}</p>
          <p className="text-sm text-gray-600">Late</p>
        </div>
        <div className="bg-red-50 p-4 rounded-lg text-center">
          <p className="text-2xl font-bold text-red-600">{absentCount}</p>
          <p className="text-sm text-gray-600">Absent</p>
        </div>
      </div>

      {/* Daily Attendance Records */}
      <div className="space-y-6">
        <h3 className="text-lg font-semibold text-gray-800">Daily Records</h3>
        {Object.entries(groupedAttendance)
          .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
          .map(([date, records]) => (
            <div key={date} className="border border-gray-200 rounded-lg p-4">
              <div className="flex justify-between items-center mb-4">
                <h4 className="font-semibold text-gray-900">
                  {new Date(date).toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </h4>
                <span className="text-sm text-gray-500">
                  {records.length} classes
                </span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {records.map((record, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <h5 className="font-medium text-gray-900">{record.subject}</h5>
                      <p className="text-sm text-gray-600">{record.teacher}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-lg">{getStatusIcon(record.status)}</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(record.status)}`}>
                        {record.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
      </div>

      {/* Attendance Insights */}
      <div className="mt-8 bg-blue-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Attendance Insights</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-gray-700">Best Subject Attendance:</span>
            <span className="font-semibold text-green-600">Mathematics (100%)</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-700">Needs Improvement:</span>
            <span className="font-semibold text-yellow-600">Physics (75%)</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-700">This Week's Trend:</span>
            <span className="font-semibold text-blue-600">Improving ↗</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AttendanceTracker;