import { useState, useEffect, useRef, useCallback } from 'react';
import { studentService } from '../services/studentService';
import QRCode from 'qrcode';
import { useReactToPrint } from 'react-to-print';
import { toast } from 'react-hot-toast';
import html2canvas from 'html2canvas';

const IDCardGenerator = () => {
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedClass, setSelectedClass] = useState('');
  const [cardSettings, setCardSettings] = useState({
    template: 'professional-blue',
    includeQR: true,
    includeBarcode: false,
    includePhoto: true,
    includeMedical: false,
    includeGuardian: false,
    includeEmergency: false,
    schoolName: 'EduTrack International School',
    schoolAddress: '123 Education Street, Academic City, AC 12345',
    schoolPhone: '(555) 123-4567',
    schoolWebsite: 'www.edutrack.edu',
    validUntil: new Date().getFullYear() + 1,
    cardType: 'standard', // standard, premium, temporary
    securityFeatures: true
  });
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generatedCards, setGeneratedCards] = useState([]);
  const [qrCodeDataURL, setQrCodeDataURL] = useState('');
  const printRef = useRef();
  const cardRef = useRef();

  const generateQRCode = useCallback(async (student) => {
    if (!student) {
      setQrCodeDataURL('');
      return Promise.resolve();
    }

    // Always generate QR code if student exists, regardless of includeQR setting
    try {
      // First try to get QR code from backend
      try {
        const qrData = await studentService.getStudentQRCode(student._id);
        if (qrData && qrData.qrCodeImage) {
          setQrCodeDataURL(qrData.qrCodeImage);
          return Promise.resolve(qrData.qrCodeImage);
        }
      } catch (backendError) {
        console.log('Backend QR not available, generating locally:', backendError.message);
      }

      // Fallback: Generate QR code locally for attendance scanning
      const qrData = {
        studentId: student.studentId,
        id: student._id,
        name: `${student.firstName} ${student.lastName}`,
        class: student.class,
        section: student.section,
        timestamp: Date.now(),
        type: 'attendance'
      };

      const qrDataString = JSON.stringify(qrData);
      const qrCodeURL = await QRCode.toDataURL(qrDataString, {
        width: 200,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });

      setQrCodeDataURL(qrCodeURL);
      return Promise.resolve(qrCodeURL);
    } catch (error) {
      console.error('Error generating QR code:', error);
      
      // Generate a simple fallback QR code with just student ID
      try {
        const fallbackData = student.studentId || 'NO_ID';
        const fallbackQR = await QRCode.toDataURL(fallbackData, {
          width: 200,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        });
        setQrCodeDataURL(fallbackQR);
        return Promise.resolve(fallbackQR);
      } catch (fallbackError) {
        console.error('Fallback QR generation failed:', fallbackError);
        setQrCodeDataURL('');
        return Promise.reject(fallbackError);
      }
    }
  }, []);

  const fetchInitialData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch students and classes from backend API
      const [studentsData, classesData] = await Promise.all([
        studentService.getAllStudents({ limit: 1000, isActive: true }),
        studentService.getClasses()
      ]);

      console.log('Backend API Response - Students:', studentsData);
      console.log('Backend API Response - Classes:', classesData);

      if (!studentsData || studentsData.length === 0) {
        toast.error('No students found. Please add students first.');
        setStudents([]);
        setClasses(classesData || []);
        return;
      }

      setStudents(studentsData);
      setClasses(classesData || []);

      // Auto-select first student and generate QR code
      setSelectedStudent(studentsData[0]);
      await generateQRCode(studentsData[0]);
      
      toast.success(`Loaded ${studentsData.length} students from database`);
    } catch (error) {
      console.error('Error fetching data from backend:', error);
      
      if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
        toast.error('Session expired. Please login again.');
      } else if (error.message?.includes('Network Error') || error.message?.includes('ERR_NETWORK')) {
        toast.error('Cannot connect to server. Please check if the backend is running.');
      } else {
        toast.error('Failed to load students data. Please try again.');
      }
      
      // Set empty state on error
      setStudents([]);
      setClasses([]);
    } finally {
      setLoading(false);
    }
  }, [generateQRCode]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  const handleStudentChange = async (e) => {
    const studentId = e.target.value;
    const student = students.find(s => s._id === studentId);
    setSelectedStudent(student);
    if (student) {
      // Always generate QR code when student is selected
      try {
        await generateQRCode(student);
      } catch (error) {
        console.error('Error generating QR code for selected student:', error);
        // Continue anyway, QR code will show placeholder
      }
    } else {
      setQrCodeDataURL('');
    }
  };

  const handleClassChange = async (e) => {
    const className = e.target.value;
    setSelectedClass(className);

    if (className === '') {
      // Show all students
      const firstStudent = students[0];
      setSelectedStudent(firstStudent);
      if (firstStudent) await generateQRCode(firstStudent);
    } else {
      try {
        // Fetch students by class from backend
        const classStudents = await studentService.getAllStudents({ 
          class: className, 
          isActive: true,
          limit: 1000 
        });
        
        console.log('Students for class', className, ':', classStudents);
        
        if (classStudents.length > 0) {
          setSelectedStudent(classStudents[0]);
          await generateQRCode(classStudents[0]);
          toast.success(`Loaded ${classStudents.length} students from ${className}`);
        } else {
          setSelectedStudent(null);
          toast.info(`No students found in ${className}`);
        }
      } catch (error) {
        console.error('Error fetching class students:', error);
        toast.error(`Failed to load students for ${className}`);
        setSelectedStudent(null);
      }
    }
  };

  const handleSettingsChange = async (setting, value) => {
    const newSettings = { ...cardSettings, [setting]: value };
    setCardSettings(newSettings);

    if (setting === 'includeQR') {
      if (value && selectedStudent) {
        await generateQRCode(selectedStudent);
      } else {
        setQrCodeDataURL('');
      }
    }
  };

  const getFilteredStudents = () => {
    if (!selectedClass) return students;
    return students.filter(s => s.class === selectedClass);
  };

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `ID_Card_${selectedStudent?.studentId || 'Student'}`,
    pageStyle: `
      @page {
        size: 86mm 54mm;
        margin: 2mm;
      }
      @media print {
        body {
          margin: 0;
          -webkit-print-color-adjust: exact;
          color-adjust: exact;
          print-color-adjust: exact;
        }
        .print-container {
          width: 82mm;
          height: 50mm;
          page-break-after: always;
          display: block !important;
        }
        .id-card {
          width: 82mm !important;
          height: 50mm !important;
          transform: scale(1) !important;
          font-size: 10px !important;
        }
        * {
          -webkit-print-color-adjust: exact !important;
          color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
      }
    `,
    onBeforePrint: () => {
      console.log('Starting print...');
      // Create print content from preview
      if (selectedStudent) {
        const previewCard = document.querySelector('.id-card-preview .id-card');
        if (previewCard && printRef.current) {
          // Clone the preview card content for printing
          const printCard = printRef.current.querySelector('.id-card');
          if (printCard) {
            // Copy all styles from preview to print version
            printCard.style.background = getCardBackground();
            printCard.style.color = getCardTextColor();
          }
        }
      }
      return Promise.resolve();
    },
    onAfterPrint: () => {
      console.log('Print completed');
      toast.success('ID Card printed successfully!');
    }
  });

  const handleSaveCard = async () => {
    if (!selectedStudent) {
      toast.error('Please select a student first');
      return;
    }

    try {
      // Create card data object
      const cardData = {
        studentId: selectedStudent._id,
        studentName: `${selectedStudent.firstName} ${selectedStudent.lastName}`,
        studentNumber: selectedStudent.studentId,
        class: selectedStudent.class,
        section: selectedStudent.section,
        template: cardSettings.template,
        cardType: cardSettings.cardType,
        schoolName: cardSettings.schoolName,
        validUntil: cardSettings.validUntil,
        includePhoto: cardSettings.includePhoto,
        includeQR: cardSettings.includeQR,
        qrCodeData: qrCodeDataURL,
        generatedAt: new Date().toISOString(),
        generatedBy: 'admin', // You can get this from auth context
        settings: cardSettings
      };

      // Save to localStorage as backup
      const savedCards = JSON.parse(localStorage.getItem('savedIDCards') || '[]');
      savedCards.push({
        id: Date.now(),
        ...cardData
      });
      localStorage.setItem('savedIDCards', JSON.stringify(savedCards));

      // You can also save to your backend API here
      // await studentService.saveIDCard(cardData);

      toast.success('ID Card saved successfully!');
      
      // Update the recently generated cards list if you have one
      setRecentCards(savedCards.slice(-10).reverse()); // Show last 10 cards
      
    } catch (error) {
      console.error('Error saving ID card:', error);
      toast.error('Failed to save ID card');
    }
  };

  // Add state for recent cards
  const [recentCards, setRecentCards] = useState([]);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0, isActive: false });

  // Load recent cards on component mount
  useEffect(() => {
    const savedCards = JSON.parse(localStorage.getItem('savedIDCards') || '[]');
    setRecentCards(savedCards.slice(-10).reverse());
  }, []);

  const handleSaveAsImage = async () => {
    if (!selectedStudent) {
      toast.error('No student selected or card not ready');
      return;
    }

    try {
      // Use the visible preview card
      const previewCard = document.querySelector('.id-card-preview .id-card');
      if (!previewCard) {
        toast.error('ID card preview not found');
        return;
      }

      // Create 4K quality canvas from the preview card
      const canvas = await html2canvas(previewCard, {
        backgroundColor: '#ffffff',
        scale: 6, // 4K quality - much higher resolution
        useCORS: true,
        allowTaint: false,
        width: 650,
        height: 400,
        windowWidth: 650,
        windowHeight: 400,
        logging: false,
        pixelRatio: 2,
        ignoreElements: (element) => {
          // Skip elements that might cause issues
          return element.tagName === 'STYLE' || element.tagName === 'SCRIPT';
        },
        onclone: (clonedDoc) => {
          // Apply all the current styles to ensure perfect reproduction
          const clonedCard = clonedDoc.querySelector('.id-card');
          if (clonedCard) {
            // Apply inline styles to ensure they're captured
            clonedCard.style.background = getCardBackground();
            clonedCard.style.color = getCardTextColor();
            clonedCard.style.borderRadius = '12px';
            clonedCard.style.padding = '16px';
            clonedCard.style.boxShadow = '0 10px 25px rgba(0, 0, 0, 0.1)';
            clonedCard.style.width = '650px';
            clonedCard.style.height = '400px';
            
            // Fix all QR code containers
            const qrContainers = clonedDoc.querySelectorAll('.bg-white');
            qrContainers.forEach(container => {
              container.style.backgroundColor = '#ffffff';
              container.style.color = '#000000';
            });
            
            // Apply placeholder styles
            const placeholders = clonedDoc.querySelectorAll('[style*="backgroundColor"]');
            placeholders.forEach(placeholder => {
              const style = getPlaceholderStyle();
              placeholder.style.backgroundColor = style.backgroundColor;
              placeholder.style.borderColor = style.borderColor;
              placeholder.style.color = style.color;
            });
            
            // Fix badge styles
            const badges = clonedDoc.querySelectorAll('[style*="getBadgeColor"]');
            badges.forEach(badge => {
              badge.style.backgroundColor = getBadgeColor();
              badge.style.color = getBadgeTextColor();
            });
            
            // Ensure all text has proper colors
            const textElements = clonedDoc.querySelectorAll('*');
            textElements.forEach(el => {
              const computedStyle = window.getComputedStyle(el);
              if (computedStyle.color === 'rgb(255, 255, 255)' && cardSettings.template === 'classic-white') {
                el.style.color = '#1f2937';
              }
            });
          }
        }
      });

      // Convert to high-quality blob and download
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.download = `ID_Card_4K_${selectedStudent.studentId}_${selectedStudent.firstName}_${selectedStudent.lastName}.png`;
          link.href = url;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
          toast.success('High-quality ID Card image saved successfully!');
        } else {
          throw new Error('Failed to create image blob');
        }
      }, 'image/png', 1.0);
    } catch (error) {
      console.error('Error saving image:', error);
      toast.error('Failed to save ID card image. Please try again.');
    }
  };

  const handleGeneratePreview = async () => {
    if (!selectedStudent) {
      toast.error('Please select a student first');
      return;
    }

    try {
      await generateQRCode(selectedStudent);
      toast.success('Preview generated successfully!');
    } catch (error) {
      console.error('Error generating preview:', error);
      toast.error('Failed to generate preview');
    }
  };

  const handleForceGenerateQR = async () => {
    if (!selectedStudent) {
      toast.error('Please select a student first');
      return;
    }

    try {
      // Force generate QR code
      const qrData = {
        studentId: selectedStudent.studentId,
        id: selectedStudent._id,
        name: `${selectedStudent.firstName} ${selectedStudent.lastName}`,
        class: selectedStudent.class,
        section: selectedStudent.section,
        timestamp: Date.now(),
        type: 'attendance'
      };

      const qrDataString = JSON.stringify(qrData);
      const qrCodeURL = await QRCode.toDataURL(qrDataString, {
        width: 200,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });

      setQrCodeDataURL(qrCodeURL);
      toast.success('QR Code generated successfully!');
    } catch (error) {
      console.error('Error generating QR code:', error);
      toast.error('Failed to generate QR code');
    }
  };

  const handleGenerateBatch = async () => {
    if (!selectedClass) {
      toast.error('Please select a class for batch generation');
      return;
    }

    const classStudents = getFilteredStudents();
    if (classStudents.length === 0) {
      toast.error('No students found in the selected class');
      return;
    }

    // Confirm batch generation
    const confirmed = window.confirm(
      `Generate ID cards for ${classStudents.length} students in ${selectedClass}?\n\nThis may take a few minutes.`
    );
    
    if (!confirmed) return;

    setGenerating(true);
    setBatchProgress({ current: 0, total: classStudents.length, isActive: true });
    const loadingToast = toast.loading('Starting batch generation...');
    
    try {
      const cards = [];
      const savedCards = JSON.parse(localStorage.getItem('savedIDCards') || '[]');
      const batchId = Date.now();
      
      for (let i = 0; i < classStudents.length; i++) {
        const student = classStudents[i];
        
        try {
          // Update progress
          setBatchProgress({ current: i + 1, total: classStudents.length, isActive: true });
          toast.loading(`Processing ${i + 1}/${classStudents.length}: ${student.firstName} ${student.lastName}`, { id: loadingToast });

          // Generate QR code for each student
          let qrCodeDataURL = '';
          if (cardSettings.includeQR) {
            const qrData = {
              studentId: student.studentId,
              id: student._id,
              name: `${student.firstName} ${student.lastName}`,
              class: student.class,
              section: student.section,
              timestamp: Date.now(),
              type: 'attendance'
            };

            qrCodeDataURL = await QRCode.toDataURL(JSON.stringify(qrData), {
              width: 200,
              margin: 2,
              color: {
                dark: '#000000',
                light: '#FFFFFF'
              }
            });
          }

          // Create card data
          const cardData = {
            id: batchId + i, // Unique ID based on batch and index
            studentId: student._id,
            studentName: `${student.firstName} ${student.lastName}`,
            studentNumber: student.studentId,
            class: student.class,
            section: student.section,
            template: cardSettings.template,
            cardType: cardSettings.cardType,
            schoolName: cardSettings.schoolName,
            validUntil: cardSettings.validUntil,
            includePhoto: cardSettings.includePhoto,
            includeQR: cardSettings.includeQR,
            qrCodeData: qrCodeDataURL,
            generatedAt: new Date().toISOString(),
            generatedBy: 'admin',
            settings: { ...cardSettings },
            batchId: batchId,
            studentData: { ...student } // Store complete student data
          };

          cards.push(cardData);
          savedCards.push(cardData);

          // Small delay to prevent overwhelming the system
          await new Promise(resolve => setTimeout(resolve, 50));

        } catch (error) {
          console.error(`Error generating card for ${student.firstName} ${student.lastName}:`, error);
          toast.error(`Failed to generate card for ${student.firstName} ${student.lastName}`);
        }
      }

      // Save all cards to localStorage
      localStorage.setItem('savedIDCards', JSON.stringify(savedCards));

      // Update the recent cards list
      setRecentCards(savedCards.slice(-50).reverse()); // Show last 50 cards

      // Reset progress
      setBatchProgress({ current: 0, total: 0, isActive: false });

      // Success notification
      toast.success(`Successfully generated ${cards.length} ID cards for ${selectedClass}!`, { id: loadingToast });

      // Show batch completion dialog with options
      showBatchCompletionDialog(cards);

    } catch (error) {
      console.error('Error generating batch:', error);
      toast.error('Failed to generate batch cards', { id: loadingToast });
      setBatchProgress({ current: 0, total: 0, isActive: false });
    } finally {
      setGenerating(false);
    }
  };

  // Show completion dialog with options
  const showBatchCompletionDialog = (cards) => {
    const options = window.confirm(
      `✅ Batch Generation Complete!\n\n` +
      `Generated ${cards.length} ID cards successfully.\n\n` +
      `Options:\n` +
      `• OK - View saved cards in the list below\n` +
      `• Cancel - Download all cards as images now`
    );

    if (!options) {
      // User chose Cancel (Download)
      handleBatchDownload(cards);
    }
    // If OK, user can view cards in the saved cards section
  };

  // Get cards from the latest batch
  const getBatchCards = () => {
    if (recentCards.length === 0) return [];
    
    // Find the latest batch ID
    const latestBatchId = Math.max(...recentCards.map(card => card.batchId || 0));
    
    // Return all cards from the latest batch
    return recentCards.filter(card => card.batchId === latestBatchId);
  };

  // Function to download all generated cards as images
  const handleBatchDownload = async (cards) => {
    if (!cards || cards.length === 0) {
      toast.error('No cards to download');
      return;
    }

    const downloadToast = toast.loading('Preparing batch download...');
    
    try {
      // Store original state
      const originalStudent = selectedStudent;
      const originalQR = qrCodeDataURL;
      const originalSettings = { ...cardSettings };

      for (let i = 0; i < cards.length; i++) {
        const card = cards[i];
        
        toast.loading(`Downloading ${i + 1}/${cards.length}: ${card.studentName}`, { id: downloadToast });

        // Find the student data
        let student = students.find(s => s._id === card.studentId);
        
        // If not found in current students, use stored student data from card
        if (!student && card.studentData) {
          student = card.studentData;
        }
        
        if (!student) {
          console.warn(`Student not found for card: ${card.studentName}`);
          continue;
        }

        // Set up the card for rendering
        setSelectedStudent(student);
        setQrCodeDataURL(card.qrCodeData || '');
        setCardSettings(card.settings || originalSettings);

        // Wait for state to update and DOM to re-render
        await new Promise(resolve => setTimeout(resolve, 500));

        // Generate and download the image
        if (cardRef.current) {
          try {
            const canvas = await html2canvas(cardRef.current, {
              scale: 6, // Ultra high quality for batch
              pixelRatio: 2,
              backgroundColor: '#ffffff',
              logging: false,
              useCORS: true,
              allowTaint: true,
              width: cardRef.current.offsetWidth,
              height: cardRef.current.offsetHeight,
              onclone: (clonedDoc) => {
                const clonedElement = clonedDoc.querySelector('[data-card-ref]') || clonedDoc.querySelector('.id-card');
                if (clonedElement) {
                  clonedElement.style.transform = 'none';
                  clonedElement.style.WebkitTransform = 'none';
                  clonedElement.style.position = 'static';
                }
              }
            });

            // Convert to blob and download
            canvas.toBlob((blob) => {
              if (blob) {
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `ID_Card_${card.studentName.replace(/\s+/g, '_')}_${card.studentNumber}_${card.class}${card.section}.png`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
              }
            }, 'image/png', 1.0);

          } catch (error) {
            console.error(`Error downloading card for ${card.studentName}:`, error);
            toast.error(`Failed to download card for ${card.studentName}`);
          }
        }

        // Small delay between downloads to prevent browser issues
        await new Promise(resolve => setTimeout(resolve, 800));
      }

      // Restore original state
      setSelectedStudent(originalStudent);
      setQrCodeDataURL(originalQR);
      setCardSettings(originalSettings);

      toast.success(`Downloaded ${cards.length} ID card images!`, { id: downloadToast });

    } catch (error) {
      console.error('Error downloading batch:', error);
      toast.error('Failed to download batch cards', { id: downloadToast });
    }
  };

  const getCardBackground = () => {
    const templates = {
      'professional-blue': 'linear-gradient(135deg, #1e40af 0%, #3b82f6 50%, #60a5fa 100%)',
      'professional-green': 'linear-gradient(135deg, #065f46 0%, #059669 50%, #34d399 100%)',
      'professional-purple': 'linear-gradient(135deg, #581c87 0%, #7c3aed 50%, #a78bfa 100%)',
      'classic-gray': 'linear-gradient(135deg, #374151 0%, #6b7280 50%, #9ca3af 100%)',
      'classic-white': 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #cbd5e1 100%)',
      'modern-red': 'linear-gradient(135deg, #991b1b 0%, #dc2626 50%, #f87171 100%)',
      'elegant-gold': 'linear-gradient(135deg, #92400e 0%, #d97706 50%, #fbbf24 100%)'
    };
    return templates[cardSettings.template] || templates['professional-blue'];
  };

  const getCardTextColor = () => {
    // Use dark text for light backgrounds
    if (cardSettings.template === 'classic-white') {
      return '#1f2937'; // Dark gray text for white background
    }
    return '#ffffff'; // White text for dark backgrounds
  };

  const getSecondaryTextColor = () => {
    // Use appropriate text color for secondary elements based on background
    if (cardSettings.template === 'classic-white') {
      return '#4b5563'; // Gray text for white background
    }
    return 'rgba(255, 255, 255, 0.8)'; // Semi-transparent white for dark backgrounds
  };

  const getBadgeColor = () => {
    // Use appropriate badge colors based on template
    if (cardSettings.template === 'classic-white') {
      return 'rgba(59, 130, 246, 0.1)'; // Light blue for white background
    }
    return 'rgba(255, 255, 255, 0.2)'; // Semi-transparent white for dark backgrounds
  };

  const getBadgeTextColor = () => {
    if (cardSettings.template === 'classic-white') {
      return '#1e40af'; // Blue text for white background
    }
    return '#ffffff'; // White text for dark backgrounds
  };

  const getPlaceholderStyle = () => {
    // Create better placeholder colors based on template
    const styles = {
      'professional-blue': {
        backgroundColor: 'rgba(59, 130, 246, 0.3)',
        borderColor: 'rgba(59, 130, 246, 0.5)',
        color: '#ffffff'
      },
      'professional-green': {
        backgroundColor: 'rgba(16, 185, 129, 0.3)',
        borderColor: 'rgba(16, 185, 129, 0.5)',
        color: '#ffffff'
      },
      'professional-purple': {
        backgroundColor: 'rgba(139, 92, 246, 0.3)',
        borderColor: 'rgba(139, 92, 246, 0.5)',
        color: '#ffffff'
      },
      'classic-gray': {
        backgroundColor: 'rgba(156, 163, 175, 0.3)',
        borderColor: 'rgba(156, 163, 175, 0.5)',
        color: '#ffffff'
      },
      'classic-white': {
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        borderColor: 'rgba(59, 130, 246, 0.3)',
        color: '#1e40af'
      },
      'modern-red': {
        backgroundColor: 'rgba(239, 68, 68, 0.3)',
        borderColor: 'rgba(239, 68, 68, 0.5)',
        color: '#ffffff'
      },
      'elegant-gold': {
        backgroundColor: 'rgba(251, 191, 36, 0.3)',
        borderColor: 'rgba(251, 191, 36, 0.5)',
        color: '#92400e'
      }
    };
    return styles[cardSettings.template] || styles['professional-blue'];
  };

  const getInitials = (firstName, lastName) => {
    return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase();
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Professional ID Card Generator</h1>
            <p className="text-gray-600 mt-1">Create official school ID cards with advanced features and professional design</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={handleGenerateBatch}
              disabled={generating || !selectedClass}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <span>
                {generating 
                  ? batchProgress.isActive 
                    ? `Generating... (${batchProgress.current}/${batchProgress.total})`
                    : 'Generating...'
                  : 'Generate Batch'
                }
              </span>
            </button>
            {batchProgress.isActive && (
              <div className="flex items-center space-x-2 bg-blue-50 px-3 py-2 rounded-lg">
                <div className="w-4 h-4">
                  <svg className="w-4 h-4 animate-spin text-blue-600" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </div>
                <span className="text-sm text-blue-700 font-medium">
                  {Math.round((batchProgress.current / batchProgress.total) * 100)}% Complete
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ID Card Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Card Design */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">ID Card Preview</h3>

          {/* Print Area */}
          <div className="flex justify-center mb-6">
            {/* Visible Preview */}
            <div className="id-card-preview">
              {selectedStudent ? (
                <div
                  className="id-card rounded-lg p-6 w-[650px] h-[400px] shadow-xl relative overflow-hidden"
                  style={{
                    background: getCardBackground(),
                    color: getCardTextColor()
                  }}
                >
                  {/* Security Features */}
                  {cardSettings.securityFeatures && (
                    <>
                      <div className="absolute top-4 right-4 w-6 h-6 bg-yellow-400 rounded-full opacity-60"></div>
                      <div className="absolute bottom-4 left-4 text-xs opacity-30 font-mono">OFFICIAL ID</div>
                      <div className="absolute top-4 left-4 w-10 h-10 border border-white border-opacity-30 rounded-full flex items-center justify-center">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                      </div>
                      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-black opacity-5"></div>
                    </>
                  )}

                  {/* Header Section */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div 
                        className="w-12 h-12 rounded-full flex items-center justify-center"
                        style={{
                          backgroundColor: getPlaceholderStyle().backgroundColor,
                          border: `2px solid ${getPlaceholderStyle().borderColor}`,
                          color: getPlaceholderStyle().color
                        }}
                      >
                        <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3z"/>
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-lg font-bold uppercase tracking-wider">{cardSettings.schoolName}</h3>
                        <p 
                          className="text-sm"
                          style={{ color: getSecondaryTextColor() }}
                        >
                          STUDENT IDENTIFICATION CARD
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold">{new Date().getFullYear()}-{new Date().getFullYear() + 1}</div>
                      <div 
                        className="text-sm"
                        style={{ color: getSecondaryTextColor() }}
                      >
                        ACADEMIC YEAR
                      </div>
                    </div>
                  </div>

                  {/* Main Content - Landscape Layout */}
                  <div className="flex h-64">
                    {/* Left Section - Photo */}
                    <div className="flex-shrink-0 mr-3">
                      {cardSettings.includePhoto && selectedStudent.profilePhoto ? (
                        <img
                          src={selectedStudent.profilePhoto}
                          alt="Student Photo"
                          className="w-32 h-40 rounded-lg object-cover shadow-lg"
                          style={{
                            backgroundColor: getPlaceholderStyle().backgroundColor,
                            border: `2px solid ${getPlaceholderStyle().borderColor}`
                          }}
                        />
                      ) : (
                        <div 
                          className="w-32 h-40 rounded-lg flex items-center justify-center shadow-lg"
                          style={{
                            backgroundColor: getPlaceholderStyle().backgroundColor,
                            border: `2px solid ${getPlaceholderStyle().borderColor}`,
                            color: getPlaceholderStyle().color
                          }}
                        >
                          <div className="text-center">
                            <svg 
                              className="w-10 h-10 mx-auto mb-2" 
                              fill="currentColor" 
                              viewBox="0 0 20 20"
                            >
                              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z" clipRule="evenodd" />
                            </svg>
                            <span className="text-xl font-bold block">
                              {getInitials(selectedStudent.firstName, selectedStudent.lastName)}
                            </span>
                            <span className="text-xs opacity-80 block mt-1">PHOTO</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Middle Section - Student Details */}
                    <div className="flex-1 flex flex-col justify-between mr-3">
                      {/* Student Information */}
                      <div>
                        <div className="mb-2">
                          <h2 className="text-xl font-bold mb-1">
                            {selectedStudent.firstName} {selectedStudent.lastName}
                          </h2>
                          <div className="flex items-center space-x-2 text-sm flex-wrap gap-y-1">
                            <span 
                              className="px-2 py-1 rounded-full font-medium text-xs"
                              style={{
                                backgroundColor: getBadgeColor(),
                                color: getBadgeTextColor()
                              }}
                            >
                              {selectedStudent.class}-{selectedStudent.section}
                            </span>
                            <span 
                              className="px-2 py-1 rounded-full font-medium text-xs"
                              style={{
                                backgroundColor: getBadgeColor(),
                                color: getBadgeTextColor()
                              }}
                            >
                              ID: {selectedStudent.studentId}
                            </span>
                            {selectedStudent.rollNumber && (
                              <span 
                                className="px-2 py-1 rounded-full font-medium text-xs"
                                style={{
                                  backgroundColor: getBadgeColor(),
                                  color: getBadgeTextColor()
                                }}
                              >
                                Roll: {selectedStudent.rollNumber}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Contact & Academic Info */}
                        <div className="grid grid-cols-2 gap-3 mb-2">
                          <div className="min-w-0">
                            <h4 
                              className="text-xs font-semibold uppercase tracking-wide mb-1"
                              style={{ color: getSecondaryTextColor() }}
                            >
                              Contact
                            </h4>
                            <div className="space-y-1">
                              {selectedStudent.email && (
                                <div 
                                  className="text-xs flex items-start"
                                  style={{ color: getSecondaryTextColor() }}
                                >
                                  <span className="mr-1 flex-shrink-0">📧</span> 
                                  <span className="truncate min-w-0">{selectedStudent.email}</span>
                                </div>
                              )}
                              {selectedStudent.phoneNumber && (
                                <div 
                                  className="text-xs flex items-center"
                                  style={{ color: getSecondaryTextColor() }}
                                >
                                  <span className="mr-1">📞</span> {selectedStudent.phoneNumber}
                                </div>
                              )}
                              {selectedStudent.dateOfBirth && (
                                <div 
                                  className="text-xs flex items-center"
                                  style={{ color: getSecondaryTextColor() }}
                                >
                                  <span className="mr-1">📅</span> {formatDate(selectedStudent.dateOfBirth)}
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <div className="min-w-0">
                            <h4 
                              className="text-xs font-semibold uppercase tracking-wide mb-1"
                              style={{ color: getSecondaryTextColor() }}
                            >
                              Academic
                            </h4>
                            <div className="space-y-1">
                              {selectedStudent.enrollmentDate && (
                                <div 
                                  className="text-xs flex items-start"
                                  style={{ color: getSecondaryTextColor() }}
                                >
                                  <span className="mr-1 flex-shrink-0">🎓</span> 
                                  <span className="truncate min-w-0">Enrolled: {formatDate(selectedStudent.enrollmentDate)}</span>
                                </div>
                              )}
                              <div 
                                className="text-xs flex items-center"
                                style={{ color: getSecondaryTextColor() }}
                              >
                                <span className="mr-1">📚</span> Active
                              </div>
                              <div 
                                className="text-xs flex items-center"
                                style={{ color: getSecondaryTextColor() }}
                              >
                                <span className="mr-1">📋</span> {cardSettings.cardType.toUpperCase()}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Emergency Contact */}
                        {cardSettings.includeEmergency && selectedStudent.emergencyContact?.name && (
                          <div className="mb-2 p-2 bg-red-500 bg-opacity-20 rounded border border-red-300">
                            <h4 className="text-xs font-semibold mb-1 text-red-100">Emergency</h4>
                            <div className="text-xs font-medium text-white">{selectedStudent.emergencyContact.name}</div>
                            {selectedStudent.emergencyContact.phone && (
                              <div className="text-xs text-white">📞 {selectedStudent.emergencyContact.phone}</div>
                            )}
                          </div>
                        )}

                        {/* Medical Information */}
                        {cardSettings.includeMedical && selectedStudent.medicalInfo?.bloodType && (
                          <div className="mb-2 p-2 bg-red-600 bg-opacity-20 rounded border border-red-400">
                            <h4 className="text-xs font-semibold mb-1 text-red-100">Medical</h4>
                            <div className="text-xs font-medium text-white">Blood: {selectedStudent.medicalInfo.bloodType}</div>
                            {selectedStudent.medicalInfo.allergies?.length > 0 && (
                              <div className="text-xs text-white">Allergies: {selectedStudent.medicalInfo.allergies.join(', ')}</div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Footer */}
                      <div className="border-t border-white border-opacity-20 pt-1 mt-auto">
                        <div className="flex justify-between items-center">
                          <div style={{ color: getSecondaryTextColor() }} className="text-xs">
                            <div className="truncate max-w-48">{cardSettings.schoolAddress}</div>
                            <div className="truncate">{cardSettings.schoolPhone}</div>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold text-xs">Valid: Dec {cardSettings.validUntil}</div>
                            <div style={{ color: getSecondaryTextColor() }} className="text-xs">Auth: _______</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right Section - QR Code and Security */}
                    <div className="flex-shrink-0 flex flex-col items-center justify-center">
                      {/* QR Code */}
                      {cardSettings.includeQR && (
                        <div className="bg-white p-3 rounded-lg shadow-lg mb-3 border-2 border-gray-300">
                          {qrCodeDataURL ? (
                            <img
                              src={qrCodeDataURL}
                              alt="QR Code for Attendance"
                              className="w-24 h-24"
                            />
                          ) : (
                            <div className="w-24 h-24 bg-gray-100 rounded flex items-center justify-center">
                              <div className="text-center">
                                <div className="w-16 h-16 bg-gray-300 rounded grid grid-cols-3 gap-1 p-1">
                                  {[...Array(9)].map((_, i) => (
                                    <div key={i} className="bg-gray-600 rounded-sm"></div>
                                  ))}
                                </div>
                                <div className="text-xs text-gray-600 mt-1">QR</div>
                              </div>
                            </div>
                          )}
                          <div className="text-xs text-center text-gray-900 mt-1 font-bold uppercase tracking-wider">SCAN</div>
                        </div>
                      )}

                      {/* Security Elements */}
                      <div className="text-center">
                        <div 
                          className="w-20 h-1 mb-2 rounded-full"
                          style={{ backgroundColor: getPlaceholderStyle().borderColor }}
                        ></div>
                        <div 
                          className="text-xs font-mono mb-1"
                          style={{ color: getSecondaryTextColor() }}
                        >
                          SEC
                        </div>
                        <div className="text-sm font-bold opacity-80">{selectedStudent.studentId.slice(-4).toUpperCase()}</div>
                        <div 
                          className="w-16 h-1 mt-2 rounded-full"
                          style={{ backgroundColor: getPlaceholderStyle().borderColor }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-6 w-[650px] h-[400px] shadow-xl flex flex-col items-center justify-center border-2 border-dashed border-gray-300">
                  <div className="bg-white p-4 rounded-full shadow-lg mb-4 border-2 border-gray-200">
                    <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <span className="text-gray-600 text-center font-medium text-lg mb-2">Select a student to preview ID card</span>
                  <span className="text-gray-500 text-center text-sm">Choose a student from the dropdown menu to generate their ID card</span>
                </div>
              )}
            </div>

            {/* Hidden Print Container - Optimized for Printing */}
            <div ref={printRef} className="print-container" style={{ position: 'absolute', left: '-9999px', top: '0' }}>
              {selectedStudent && (
                <div
                  ref={cardRef}
                  className="id-card rounded-lg p-3 shadow-xl relative overflow-hidden"
                  style={{
                    background: getCardBackground(),
                    color: getCardTextColor(),
                    width: '82mm',
                    height: '50mm',
                    fontSize: '10px'
                  }}
                >
                  {/* Header */}
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center space-x-1">
                      <div 
                        className="w-5 h-5 rounded-full flex items-center justify-center"
                        style={{
                          backgroundColor: getPlaceholderStyle().backgroundColor,
                          border: `1px solid ${getPlaceholderStyle().borderColor}`,
                          color: getPlaceholderStyle().color
                        }}
                      >
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3z"/>
                        </svg>
                      </div>
                      <div>
                        <div className="text-xs font-bold leading-tight">{cardSettings.schoolName}</div>
                        <div 
                          className="text-xs leading-tight"
                          style={{ color: getSecondaryTextColor() }}
                        >
                          STUDENT ID
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-bold">{new Date().getFullYear()}-{new Date().getFullYear() + 1}</div>
                    </div>
                  </div>

                  {/* Main Content */}
                  <div className="flex h-28">
                    {/* Photo */}
                    <div className="flex-shrink-0 mr-2">
                      {cardSettings.includePhoto && selectedStudent.profilePhoto ? (
                        <img
                          src={selectedStudent.profilePhoto}
                          alt="Student Photo"
                          className="w-16 h-20 rounded object-cover"
                          style={{
                            backgroundColor: getPlaceholderStyle().backgroundColor,
                            border: `1px solid ${getPlaceholderStyle().borderColor}`
                          }}
                        />
                      ) : (
                        <div 
                          className="w-16 h-20 rounded flex items-center justify-center"
                          style={{
                            backgroundColor: getPlaceholderStyle().backgroundColor,
                            border: `1px solid ${getPlaceholderStyle().borderColor}`,
                            color: getPlaceholderStyle().color
                          }}
                        >
                          <div className="text-center">
                            <svg 
                              className="w-5 h-5 mx-auto mb-1" 
                              fill="currentColor" 
                              viewBox="0 0 20 20"
                            >
                              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z" clipRule="evenodd" />
                            </svg>
                            <span className="text-sm font-bold block">
                              {getInitials(selectedStudent.firstName, selectedStudent.lastName)}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Details */}
                    <div className="flex-1 flex flex-col justify-between mr-2">
                      <div>
                        <div className="text-sm font-bold mb-1 leading-tight">
                          {selectedStudent.firstName} {selectedStudent.lastName}
                        </div>
                        <div className="flex flex-wrap gap-1 mb-1">
                          <span 
                            className="px-1 py-0.5 rounded text-xs font-medium"
                            style={{
                              backgroundColor: getBadgeColor(),
                              color: getBadgeTextColor()
                            }}
                          >
                            {selectedStudent.class}-{selectedStudent.section}
                          </span>
                          <span 
                            className="px-1 py-0.5 rounded text-xs font-medium"
                            style={{
                              backgroundColor: getBadgeColor(),
                              color: getBadgeTextColor()
                            }}
                          >
                            ID: {selectedStudent.studentId}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-1 text-xs">
                          <div>
                            {selectedStudent.email && (
                              <div 
                                className="truncate"
                                style={{ color: getSecondaryTextColor() }}
                              >
                                📧 {selectedStudent.email}
                              </div>
                            )}
                            {selectedStudent.phoneNumber && (
                              <div 
                                style={{ color: getSecondaryTextColor() }}
                              >
                                📞 {selectedStudent.phoneNumber}
                              </div>
                            )}
                          </div>
                          <div>
                            <div 
                              style={{ color: getSecondaryTextColor() }}
                            >
                              📚 Active
                            </div>
                            <div 
                              style={{ color: getSecondaryTextColor() }}
                            >
                              📋 {cardSettings.cardType.toUpperCase()}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-xs mt-1 pt-1 border-t border-white border-opacity-20">
                        <div className="flex justify-between">
                          <span style={{ color: getSecondaryTextColor() }}>Valid: Dec {cardSettings.validUntil}</span>
                          <span style={{ color: getSecondaryTextColor() }}>Auth: _____</span>
                        </div>
                      </div>
                    </div>

                    {/* QR Code */}
                    {cardSettings.includeQR && (
                      <div className="flex flex-col items-center justify-center">
                        {qrCodeDataURL ? (
                          <>
                            <div className="bg-white p-1 rounded border border-gray-300">
                              <img
                                src={qrCodeDataURL}
                                alt="QR Code"
                                className="w-12 h-12"
                              />
                            </div>
                            <div className="text-xs text-center mt-1 font-medium" style={{ color: getSecondaryTextColor() }}>SCAN</div>
                          </>
                        ) : (
                          <>
                            <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center">
                              <div className="w-8 h-8 bg-gray-300 rounded grid grid-cols-2 gap-0.5 p-0.5">
                                {[...Array(4)].map((_, i) => (
                                  <div key={i} className="bg-gray-600 rounded-sm"></div>
                                ))}
                              </div>
                            </div>
                            <div className="text-xs text-center mt-1 font-medium" style={{ color: getSecondaryTextColor() }}>SCAN</div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="space-y-6">
          {/* Student Selection */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Student Selection</h4>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Student</label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={selectedStudent?._id || ''}
                  onChange={handleStudentChange}
                >
                  <option value="">Choose a student...</option>
                  {getFilteredStudents().map(student => (
                    <option key={student._id} value={student._id}>
                      {student.firstName} {student.lastName} ({student.class} {student.section})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Class</label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={selectedClass}
                  onChange={handleClassChange}
                >
                  <option value="">All Classes</option>
                  {classes.map(classData => (
                    <option key={classData._id} value={classData._id}>
                      {classData._id} ({classData.count} students)
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Card Settings */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Card Settings</h4>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Template</label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={cardSettings.template}
                  onChange={(e) => handleSettingsChange('template', e.target.value)}
                >
                  <option value="professional-blue">Professional Blue</option>
                  <option value="professional-green">Professional Green</option>
                  <option value="professional-purple">Professional Purple</option>
                  <option value="classic-white">Classic White</option>
                  <option value="modern-red">Modern Red</option>
                  <option value="elegant-gold">Elegant Gold</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Card Type</label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={cardSettings.cardType}
                  onChange={(e) => handleSettingsChange('cardType', e.target.value)}
                >
                  <option value="standard">Standard</option>
                  <option value="premium">Premium</option>
                  <option value="temporary">Temporary</option>
                  <option value="staff">Staff</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">School Name</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={cardSettings.schoolName}
                  onChange={(e) => handleSettingsChange('schoolName', e.target.value)}
                  placeholder="Enter school name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">School Address</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={cardSettings.schoolAddress}
                  onChange={(e) => handleSettingsChange('schoolAddress', e.target.value)}
                  placeholder="Enter school address"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">School Phone</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={cardSettings.schoolPhone}
                  onChange={(e) => handleSettingsChange('schoolPhone', e.target.value)}
                  placeholder="Enter school phone"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">School Website</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={cardSettings.schoolWebsite}
                  onChange={(e) => handleSettingsChange('schoolWebsite', e.target.value)}
                  placeholder="Enter school website"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Valid Until Year</label>
                <input
                  type="number"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={cardSettings.validUntil}
                  onChange={(e) => handleSettingsChange('validUntil', parseInt(e.target.value))}
                  min={new Date().getFullYear()}
                  max={new Date().getFullYear() + 10}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="include-photo"
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    checked={cardSettings.includePhoto}
                    onChange={(e) => handleSettingsChange('includePhoto', e.target.checked)}
                  />
                  <label htmlFor="include-photo" className="ml-2 text-sm text-gray-700">
                    Include Student Photo
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="qr-code"
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    checked={cardSettings.includeQR}
                    onChange={(e) => handleSettingsChange('includeQR', e.target.checked)}
                  />
                  <label htmlFor="qr-code" className="ml-2 text-sm text-gray-700">
                    Include QR Code for Attendance
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="include-guardian"
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    checked={cardSettings.includeGuardian}
                    onChange={(e) => handleSettingsChange('includeGuardian', e.target.checked)}
                  />
                  <label htmlFor="include-guardian" className="ml-2 text-sm text-gray-700">
                    Include Guardian Info
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="include-emergency"
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    checked={cardSettings.includeEmergency}
                    onChange={(e) => handleSettingsChange('includeEmergency', e.target.checked)}
                  />
                  <label htmlFor="include-emergency" className="ml-2 text-sm text-gray-700">
                    Include Emergency Contact
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="include-medical"
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    checked={cardSettings.includeMedical}
                    onChange={(e) => handleSettingsChange('includeMedical', e.target.checked)}
                  />
                  <label htmlFor="include-medical" className="ml-2 text-sm text-gray-700">
                    Include Medical Info
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="security-features"
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    checked={cardSettings.securityFeatures}
                    onChange={(e) => handleSettingsChange('securityFeatures', e.target.checked)}
                  />
                  <label htmlFor="security-features" className="ml-2 text-sm text-gray-700">
                    Security Features
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="barcode"
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    checked={cardSettings.includeBarcode}
                    onChange={(e) => handleSettingsChange('includeBarcode', e.target.checked)}
                  />
                  <label htmlFor="barcode" className="ml-2 text-sm text-gray-700">
                    Include Barcode
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Actions</h4>
            <div className="space-y-3">
              <button
                onClick={handleGeneratePreview}
                disabled={!selectedStudent}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                <span>Generate Preview</span>
              </button>
              <button
                onClick={handleForceGenerateQR}
                disabled={!selectedStudent}
                className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01m0 0V9m0 3v.01" />
                </svg>
                <span>Generate QR Code</span>
              </button>
              <button
                onClick={() => {
                  if (!selectedStudent) {
                    toast.error('Please select a student first');
                    return;
                  }
                  try {
                    handlePrint();
                  } catch (error) {
                    console.error('Print error:', error);
                    toast.error('Failed to print ID card');
                  }
                }}
                disabled={!selectedStudent}
                className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H3a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-6a2 2 0 00-2-2H7a2 2 0 00-2 2v6a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                <span>Print ID Card</span>
              </button>
              <button
                onClick={handleSaveCard}
                disabled={!selectedStudent}
                className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <span>Save ID Card</span>
              </button>
              <button
                onClick={handleSaveAsImage}
                disabled={!selectedStudent}
                className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span>Save as Image</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Recently Saved Cards */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Recently Saved Cards</h3>
            <div className="flex items-center space-x-3">
              <span className="text-sm text-gray-500">{recentCards.length} saved</span>
              {recentCards.length > 0 && (
                <button
                  onClick={() => {
                    const latestBatch = getBatchCards();
                    if (latestBatch.length > 0) {
                      handleBatchDownload(latestBatch);
                    } else {
                      toast.error('No batch found. Generate cards first.');
                    }
                  }}
                  className="px-3 py-1 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 transition-colors"
                >
                  Download Latest Batch
                </button>
              )}
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          {recentCards.length > 0 ? (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Student
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ID Number
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Class
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Template
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Saved On
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {recentCards.map((card, index) => (
                  <tr key={card.id || index}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white text-sm font-medium shadow-md border-2 border-blue-300">
                          {getInitials(card.studentName.split(' ')[0], card.studentName.split(' ')[1] || '')}
                        </div>
                        <div className="ml-3">
                          <div className="text-sm font-medium text-gray-900">{card.studentName}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {card.studentNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {card.class}-{card.section}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 capitalize">
                        {card.template}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(card.generatedAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => {
                          // Re-load this card for editing/viewing
                          const student = students.find(s => s._id === card.studentId);
                          if (student) {
                            setSelectedStudent(student);
                            setCardSettings(prev => ({
                              ...prev,
                              ...card.settings
                            }));
                            if (card.qrCodeData) {
                              setQrCodeDataURL(card.qrCodeData);
                            }
                            toast.success('Card loaded for editing');
                          } else {
                            toast.error('Student not found');
                          }
                        }}
                        className="text-indigo-600 hover:text-indigo-900 mr-3"
                      >
                        Load
                      </button>
                      <button
                        onClick={() => {
                          const confirmed = window.confirm('Are you sure you want to delete this saved card?');
                          if (confirmed) {
                            const updatedCards = recentCards.filter(c => c.id !== card.id);
                            setRecentCards(updatedCards);
                            localStorage.setItem('savedIDCards', JSON.stringify(updatedCards));
                            toast.success('Card deleted');
                          }
                        }}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No saved cards</h3>
              <p className="mt-1 text-sm text-gray-500">Generate and save your first ID card to see it here.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default IDCardGenerator;
