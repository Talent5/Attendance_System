import { useState, useEffect } from 'react';
import QRCode from 'qrcode';

const PrintIdCard = ({ student, onClose }) => {
  const [qrCodeUrl, setQrCodeUrl] = useState('');

  useEffect(() => {
    const generateQRCode = async () => {
      try {
        // Use the actual QR data from database if available, otherwise generate new
        let qrData;
        if (student.qrCodeData) {
          // Use existing QR data from database
          qrData = student.qrCodeData;
        } else {
          // Generate new QR data for attendance scanning
          qrData = JSON.stringify({
            studentId: student.studentId,
            id: student._id,
            name: `${student.firstName} ${student.lastName}`,
            class: student.class,
            section: student.section,
            type: 'attendance',
            timestamp: Date.now()
          });
        }
        
        const url = await QRCode.toDataURL(qrData, {
          width: 200,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        });
        setQrCodeUrl(url);
      } catch (error) {
        console.error('Error generating QR code:', error);
      }
    };

    if (student) {
      generateQRCode();
    }
  }, [student]);

  const handlePrint = () => {
    const printContent = document.getElementById('printable-id-card');
    const printWindow = window.open('', '_blank');
    
    printWindow.document.write(`
      <html>
        <head>
          <title>Student ID Card - ${student.firstName} ${student.lastName}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 20px;
              background: white;
            }
            .id-card {
              width: 3.375in;
              height: 2.125in;
              border: 2px solid #1e40af;
              border-radius: 8px;
              padding: 16px;
              background: linear-gradient(135deg, #f3f4f6 0%, #ffffff 100%);
              box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
              margin: 0 auto;
              position: relative;
            }
            .header {
              text-align: center;
              margin-bottom: 12px;
            }
            .school-name {
              font-size: 14px;
              font-weight: bold;
              color: #1e40af;
              margin-bottom: 4px;
            }
            .id-title {
              font-size: 10px;
              color: #6b7280;
            }
            .content {
              display: flex;
              align-items: center;
              gap: 12px;
            }
            .qr-code {
              flex-shrink: 0;
            }
            .qr-code img {
              width: 60px;
              height: 60px;
            }
            .student-info {
              flex: 1;
            }
            .student-name {
              font-size: 12px;
              font-weight: bold;
              color: #111827;
              margin-bottom: 4px;
            }
            .student-details {
              font-size: 9px;
              color: #6b7280;
              line-height: 1.3;
            }
            .footer {
              position: absolute;
              bottom: 8px;
              right: 12px;
              font-size: 8px;
              color: #9ca3af;
            }
            @media print {
              body { margin: 0; padding: 0; }
              .id-card { margin: 0; box-shadow: none; }
            }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.focus();
    
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getAge = (birthDate) => {
    if (!birthDate) return null;
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    return age;
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-auto max-w-2xl shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">Student ID Card</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Printable ID Card */}
          <div id="printable-id-card" className="mb-6">
            <div className="id-card w-[540px] h-[340px] border-2 border-blue-600 rounded-lg p-6 bg-gradient-to-br from-blue-50 to-white shadow-lg mx-auto relative">
              <div className="header text-center mb-4">
                <div className="school-name text-xl font-bold text-blue-600 mb-1">
                  EduTrack International School
                </div>
                <div className="id-title text-sm text-gray-500">
                  STUDENT IDENTIFICATION CARD
                </div>
              </div>
              
              <div className="content flex items-start gap-6">
                {/* Photo Section */}
                <div className="flex-shrink-0">
                  {student.profilePhoto ? (
                    <img 
                      src={student.profilePhoto} 
                      alt="Student Photo" 
                      className="w-24 h-32 rounded-lg object-cover border-2 border-blue-300 shadow-md"
                    />
                  ) : (
                    <div className="w-24 h-32 bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg border-2 border-blue-300 shadow-md flex items-center justify-center">
                      <div className="text-center">
                        <svg className="w-8 h-8 text-blue-600 mx-auto mb-2" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z" clipRule="evenodd" />
                        </svg>
                        <span className="text-blue-800 font-bold text-lg">
                          {student.firstName?.charAt(0)}{student.lastName?.charAt(0)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Student Information */}
                <div className="student-info flex-1">
                  <div className="student-name text-xl font-bold text-gray-900 mb-2">
                    {`${student.firstName} ${student.lastName}`}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    {/* Left Column */}
                    <div className="student-details text-sm text-gray-700 space-y-2">
                      <div className="flex items-center">
                        <span className="font-semibold text-blue-700 w-16">ID:</span>
                        <span className="bg-blue-100 px-2 py-1 rounded text-blue-800 font-mono">
                          {student.studentId}
                        </span>
                      </div>
                      <div className="flex items-center">
                        <span className="font-semibold text-blue-700 w-16">Class:</span>
                        <span className="bg-green-100 px-2 py-1 rounded text-green-800">
                          {student.class}{student.section ? `-${student.section}` : ''}
                        </span>
                      </div>
                      {student.rollNumber && (
                        <div className="flex items-center">
                          <span className="font-semibold text-blue-700 w-16">Roll:</span>
                          <span>{student.rollNumber}</span>
                        </div>
                      )}
                      {student.dateOfBirth && (
                        <div className="flex items-center">
                          <span className="font-semibold text-blue-700 w-16">DOB:</span>
                          <span>{formatDate(student.dateOfBirth)}</span>
                        </div>
                      )}
                      {student.dateOfBirth && (
                        <div className="flex items-center">
                          <span className="font-semibold text-blue-700 w-16">Age:</span>
                          <span>{getAge(student.dateOfBirth)} years</span>
                        </div>
                      )}
                    </div>
                    
                    {/* Right Column */}
                    <div className="student-details text-sm text-gray-700 space-y-2">
                      {student.email && (
                        <div>
                          <span className="font-semibold text-blue-700 block">Email:</span>
                          <span className="text-xs break-all">{student.email}</span>
                        </div>
                      )}
                      {student.phoneNumber && (
                        <div>
                          <span className="font-semibold text-blue-700 block">Phone:</span>
                          <span>{student.phoneNumber}</span>
                        </div>
                      )}
                      <div>
                        <span className="font-semibold text-blue-700 block">Guardian:</span>
                        <span className="text-xs">{student.guardianName}</span>
                        {student.guardianPhone && (
                          <div className="text-xs text-gray-600">{student.guardianPhone}</div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Emergency & Medical Info */}
                  <div className="mt-3 grid grid-cols-2 gap-4">
                    {student.emergencyContact?.name && (
                      <div className="bg-red-50 p-2 rounded border border-red-200">
                        <div className="text-xs font-semibold text-red-700 mb-1">Emergency Contact</div>
                        <div className="text-xs text-red-800">{student.emergencyContact.name}</div>
                        {student.emergencyContact.phone && (
                          <div className="text-xs text-red-700">{student.emergencyContact.phone}</div>
                        )}
                      </div>
                    )}
                    
                    {student.medicalInfo?.bloodType && (
                      <div className="bg-orange-50 p-2 rounded border border-orange-200">
                        <div className="text-xs font-semibold text-orange-700 mb-1">Medical Info</div>
                        <div className="text-xs text-orange-800">Blood: {student.medicalInfo.bloodType}</div>
                        {student.medicalInfo.allergies?.length > 0 && (
                          <div className="text-xs text-orange-700">
                            Allergies: {student.medicalInfo.allergies.slice(0, 2).join(', ')}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* QR Code Section */}
                <div className="qr-code flex-shrink-0 text-center">
                  {qrCodeUrl ? (
                    <div className="bg-white p-3 rounded-lg shadow-md border-2 border-gray-300">
                      <img 
                        src={qrCodeUrl} 
                        alt="QR Code for Attendance" 
                        className="w-20 h-20 mx-auto"
                      />
                      <div className="text-xs text-gray-600 mt-2 font-semibold">SCAN FOR</div>
                      <div className="text-xs text-gray-600 font-semibold">ATTENDANCE</div>
                    </div>
                  ) : (
                    <div className="bg-white p-3 rounded-lg shadow-md border-2 border-gray-300 w-20 h-20 flex items-center justify-center">
                      <div className="text-center">
                        <div className="w-16 h-16 bg-gray-200 rounded grid grid-cols-4 gap-1 p-1">
                          {[...Array(16)].map((_, i) => (
                            <div key={i} className="bg-gray-500 rounded-sm"></div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Footer */}
              <div className="footer absolute bottom-3 left-6 right-6 flex justify-between items-center text-xs text-gray-500 border-t border-gray-300 pt-2">
                <div>
                  <div>Valid Until: December {new Date().getFullYear() + 1}</div>
                  <div>Enrollment: {formatDate(student.enrollmentDate)}</div>
                </div>
                <div className="text-right">
                  <div>ID Card #{student.studentId}</div>
                  <div>Generated: {formatDate(new Date())}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-center space-x-3">
            <button
              onClick={handlePrint}
              className="px-6 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Print ID Card
            </button>
            <button
              onClick={onClose}
              className="px-6 py-2 text-sm font-medium text-gray-700 bg-gray-200 border border-gray-300 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrintIdCard;
