// Bills Management JavaScript
// Global variables
let currentBills = [];
let currentEditingBill = null;
let currentViewingBill = null;
let globalParticipants = [];
let currentEditingDetail = null;

// Check authentication
checkAuth();

// Initialize page
document.addEventListener('DOMContentLoaded', function() {
  loadHeader();
});

// Load shared header
async function loadHeader() {
  try {
    const response = await fetch('components/header.html');
    const headerHtml = await response.text();
    document.getElementById('header-container').innerHTML = headerHtml;
    
    // Initialize shared components with smooth transition
    initializeSharedComponents('Bills Management', 'bills-tab');
    
    // Load bills data
    await loadBillsData();
    
    // Show main content
    document.getElementById('loading').style.display = 'none';
    document.getElementById('main-content').style.display = 'block';
    
  } catch (error) {
    console.error('Error loading header:', error);
    // Show main content even if header fails
    document.getElementById('loading').style.display = 'none';
    document.getElementById('main-content').style.display = 'block';
  }
}

// Load bills data
async function loadBillsData() {
  try {
    // Load bills and stats in parallel
    const [billsResponse, statsResponse] = await Promise.all([
      fetch(API_BASE + '/api/bills', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      }),
      fetch(API_BASE + '/api/bills/stats', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      })
    ]);

    if (billsResponse.ok) {
      currentBills = await billsResponse.json();
      renderBills();
    } else {
      throw new Error('Failed to load bills');
    }

    if (statsResponse.ok) {
      const stats = await statsResponse.json();
      updateStats(stats);
    } else {
      // Don't fail if stats fail, just set to 0
      updateStats({ totalBills: 0, activeBills: 0, completedBills: 0, totalAmount: 0 });
    }

  } catch (error) {
    console.error('Error loading bills data:', error);
    showError('Failed to load bills data. Please try again.');
    currentBills = [];
    renderBills();
  }
}

// Update statistics display
function updateStats(stats) {
  document.getElementById('total-bills').textContent = stats.totalBills || 0;
  document.getElementById('active-bills').textContent = stats.activeBills || 0;
  document.getElementById('completed-bills').textContent = stats.completedBills || 0;
  document.getElementById('total-amount').textContent = formatVND(stats.totalAmount || 0);
}

// Render bills list
function renderBills() {
  const billsList = document.getElementById('bills-list');
  const emptyState = document.getElementById('empty-state');
  const mainContent = document.getElementById('main-content');

  if (currentBills.length === 0) {
    mainContent.style.display = 'none';
    emptyState.style.display = 'block';
    return;
  }

  emptyState.style.display = 'none';
  mainContent.style.display = 'block';

  billsList.innerHTML = currentBills.map(bill => `
    <div class="bill-card" data-bill-id="${bill._id}">
      <div class="bill-card-header">
        <h4 class="bill-title">${escapeHtml(bill.title)}</h4>
        <span class="bill-status status-${bill.status}">${bill.status}</span>
      </div>
      
      ${bill.description ? `<p style="color: #666; margin-bottom: 1rem;">${escapeHtml(bill.description)}</p>` : ''}
      
      <div class="bill-dates">
        ${formatDate(bill.startDate)} → ${formatDate(bill.endDate)}
      </div>
      
      <div class="bill-details">
        <div class="bill-detail">
          <div class="bill-detail-value">${formatVND(bill.totalAmount || 0)}</div>
          <div class="bill-detail-label">Total Amount</div>
        </div>
        <div class="bill-detail">
          <div class="bill-detail-value">${bill.totalDays || 0}</div>
          <div class="bill-detail-label">Days</div>
        </div>
        <div class="bill-detail">
          <div class="bill-detail-value">${bill.totalParticipants || 0}</div>
          <div class="bill-detail-label">Participants</div>
        </div>
        <div class="bill-detail">
          <div class="bill-detail-value">${formatVND(bill.averagePerDay || 0)}</div>
          <div class="bill-detail-label">Avg/Day</div>
        </div>
      </div>
      
      <div class="bill-actions">
        <button class="btn btn-small" onclick="viewBillDetails('${bill._id}')">View</button>
        <button class="btn btn-small btn-secondary" onclick="editBill('${bill._id}')">Edit</button>
        <button class="btn btn-small btn-danger" onclick="deleteBill('${bill._id}')">Delete</button>
      </div>
    </div>
  `).join('');
}

// Utility functions
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString();
}

// Vietnamese Dong formatting function
function formatVND(amount) {
  if (!amount || amount === 0) return '0₫';
  
  // Enhanced VND formatting for large amounts
  if (amount >= 1000000000) {
    // For amounts >= 1 billion VND
    return new Intl.NumberFormat('vi-VN', { 
      style: 'currency', 
      currency: 'VND',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount).replace('₫', '₫');
  } else if (amount >= 1000000) {
    // For amounts >= 1 million VND
    return new Intl.NumberFormat('vi-VN', { 
      style: 'currency', 
      currency: 'VND',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount).replace('₫', '₫');
  } else {
    // For smaller amounts
    return new Intl.NumberFormat('vi-VN', { 
      style: 'currency', 
      currency: 'VND',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount).replace('₫', '₫');
  }
}

// Format VND input while typing
function formatVNDAmount(input) {
  let value = input.value.replace(/\D/g, '');
  if (value) {
    // Add thousand separators while typing
    value = value.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    input.value = value;
  }
}

// Allow only numbers and backspace
function isNumberKey(evt) {
  const charCode = (evt.which) ? evt.which : evt.keyCode;
  if (charCode > 31 && (charCode < 48 || charCode > 57)) {
    return false;
  }
  return true;
}

// PDF Generation Functions
function generatePDFHTML(summary) {
  const currentDate = new Date().toLocaleDateString('vi-VN');
  const currentTime = new Date().toLocaleTimeString('vi-VN');
  
  // Generate user statistics HTML
  let userStatsHTML = '';
  if (summary.userStats && Object.keys(summary.userStats).length > 0) {
    Object.entries(summary.userStats).forEach(([userName, stats]) => {
      userStatsHTML += '<div class="user-card">';
      userStatsHTML += '<div class="user-header">';
      userStatsHTML += '<h4 style="margin: 0; color: #333;">' + escapeHtml(userName) + '</h4>';
      userStatsHTML += '<span class="status-badge" style="background: #667eea;">' + stats.billCount + ' bills</span>';
      userStatsHTML += '</div>';
      userStatsHTML += '<div class="user-stats">';
      userStatsHTML += '<div><strong>Total Spent:</strong> ' + formatVND(stats.totalSpent) + '</div>';
      userStatsHTML += '<div><strong>Average/Bill:</strong> ' + formatVND(stats.averagePerBill) + '</div>';
      userStatsHTML += '<div><strong>Days Involved:</strong> ' + stats.totalDays + '</div>';
      userStatsHTML += '<div><strong>Avg/Day:</strong> ' + formatVND(stats.averagePerDay) + '</div>';
      userStatsHTML += '</div>';
      userStatsHTML += '</div>';
    });
  }

  // Generate bill details HTML
  let billDetailsHTML = '';
  if (currentBills && currentBills.length > 0) {
    currentBills.forEach(bill => {
      billDetailsHTML += '<div class="bill-card">';
      billDetailsHTML += '<div class="bill-header">';
      billDetailsHTML += '<h4 style="margin: 0; color: #333;">' + escapeHtml(bill.title) + '</h4>';
      billDetailsHTML += '<span class="status-badge" style="background: ' + getStatusColor(bill.status) + ';">' + bill.status + '</span>';
      billDetailsHTML += '</div>';
      billDetailsHTML += '<div class="bill-stats">';
      billDetailsHTML += '<div><strong>Amount:</strong> ' + formatVND(bill.totalAmount || 0) + '</div>';
      billDetailsHTML += '<div><strong>Days:</strong> ' + (bill.totalDays || 0) + '</div>';
      billDetailsHTML += '<div><strong>Avg/Day:</strong> ' + formatVND(bill.averagePerDay || 0) + '</div>';
      billDetailsHTML += '<div><strong>Period:</strong> ' + formatDate(bill.startDate) + ' - ' + formatDate(bill.endDate) + '</div>';
      billDetailsHTML += '</div>';
      if (bill.description) {
        billDetailsHTML += '<div style="margin-top: 10px; font-size: 0.9rem; color: #666; font-style: italic;">"' + escapeHtml(bill.description) + '"</div>';
      }
      billDetailsHTML += '</div>';
    });
  }

  // Create final HTML using array join
  const htmlParts = [
    '<!DOCTYPE html>',
    '<html>',
    '<head>',
    '<title>Bills Summary Report</title>',
    '<style>',
    'body { font-family: Arial, sans-serif; margin: 20px; color: #333; }',
    '.header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #667eea; padding-bottom: 20px; }',
    '.section { margin-bottom: 25px; }',
    '.section h3 { color: #667eea; border-bottom: 1px solid #ddd; padding-bottom: 5px; }',
    '.stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 20px; }',
    '.stat-card { background: #f8f9fa; padding: 15px; border-radius: 8px; text-align: center; border: 1px solid #e9ecef; }',
    '.stat-number { font-size: 1.5rem; font-weight: bold; color: #667eea; }',
    '.stat-label { color: #666; font-size: 0.9rem; margin-top: 5px; }',
    '.user-card { background: white; border: 1px solid #e9ecef; border-radius: 8px; padding: 15px; margin-bottom: 10px; }',
    '.bill-card { background: white; border: 1px solid #e9ecef; border-radius: 8px; padding: 15px; margin-bottom: 10px; }',
    '.user-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }',
    '.bill-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }',
    '.user-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; font-size: 0.9rem; }',
    '.bill-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; font-size: 0.9rem; color: #666; }',
    '.status-badge { padding: 3px 8px; border-radius: 12px; font-size: 0.8rem; text-transform: uppercase; color: white; }',
    '.footer { margin-top: 30px; text-align: center; color: #666; font-size: 0.9rem; border-top: 1px solid #ddd; padding-top: 20px; }',
    '@media print { body { margin: 0; } }',
    '</style>',
    '</head>',
    '<body>',
    '<div class="header">',
    '<h1>📊 Bills Summary Report</h1>',
    '<p>Generated on ' + currentDate + ' at ' + currentTime + '</p>',
    '</div>',
    '<div class="section">',
    '<h3>📈 Overall Statistics</h3>',
    '<div class="stats-grid">',
    '<div class="stat-card"><div class="stat-number">' + summary.totalBills + '</div><div class="stat-label">Total Bills</div></div>',
    '<div class="stat-card"><div class="stat-number">' + formatVND(summary.totalAmount) + '</div><div class="stat-label">Total Amount</div></div>',
    '<div class="stat-card"><div class="stat-number">' + summary.totalDays + '</div><div class="stat-label">Total Days</div></div>',
    '<div class="stat-card"><div class="stat-number">' + formatVND(summary.averagePerDay) + '</div><div class="stat-label">Average/Day</div></div>',
    '</div>',
    '</div>',
    '<div class="section">',
    '<h3>👥 User Statistics</h3>',
    userStatsHTML,
    '</div>',
    '<div class="section">',
    '<h3>📋 Bill Details</h3>',
    billDetailsHTML,
    '</div>',
    '<div class="footer">',
    '<p>This report was generated by Bills Management System</p>',
    '<p>For questions or support, please contact the system administrator</p>',
    '</div>',
    '</body>',
    '</html>'
  ];
  
  return htmlParts.join('');
}

// Resolve participant name for PDF from bill or global list
function getParticipantNameByIdForPDF(bill, participantId) {
  const fromBill = bill?.participants?.find(p => p._id === participantId);
  if (fromBill) return fromBill.name;
  const fromGlobal = (typeof globalParticipants !== 'undefined' ? globalParticipants : []).find(p => p._id === participantId);
  if (fromGlobal) return fromGlobal.name;
  return 'Unknown';
}

function generateSingleBillPDFHTML(summary, bill, options) {
  const excludedParticipantIds = options && Array.isArray(options.excludedParticipantIds) ? options.excludedParticipantIds : [];
  const currentDate = new Date().toLocaleDateString('vi-VN');
  const currentTime = new Date().toLocaleTimeString('vi-VN');
  
  // Generate detailed user breakdown HTML (per user, per day, with totals)
  let userDetailsHTML = '';
  let totalsSummaryHTML = '';
  let participantsNames = [];
  if (bill.dailyDetails && bill.dailyDetails.length > 0) {
    // Aggregate per participant per date, preserving descriptions per Daily Detail
    const participantDetails = {};
    bill.dailyDetails.forEach(detail => {
      // Determine participants to charge for this detail
      let participantIds = [];
      if (detail.selectedParticipants && detail.selectedParticipants.length > 0) {
        participantIds = detail.selectedParticipants;
      } else {
        // Fallback for legacy records: use first N participants based on splitCount (or all if missing)
        const fallbackCount = detail.splitCount && detail.splitCount > 0 ? detail.splitCount : (bill.participants?.length || 0);
        participantIds = (bill.participants || []).slice(0, fallbackCount).map(p => p._id);
      }
      if (excludedParticipantIds.length > 0) {
        participantIds = participantIds.filter(id => !excludedParticipantIds.includes(id));
      }

      if (participantIds.length > 0) {
        const amountPerPerson = (detail.amount || 0) / participantIds.length;
        participantIds.forEach(participantId => {
          const userName = getParticipantNameByIdForPDF(bill, participantId);
          if (!participantDetails[userName]) {
            participantDetails[userName] = { totalAmount: 0, perDate: {} };
          }
          const dateKey = new Date(detail.date).toISOString().split('T')[0];
          if (!participantDetails[userName].perDate[dateKey]) {
            participantDetails[userName].perDate[dateKey] = [];
          }
          participantDetails[userName].perDate[dateKey].push({
            amount: amountPerPerson,
            description: (detail.description || '').trim()
          });
          participantDetails[userName].totalAmount += amountPerPerson;
        });
      }
    });

    // Build totals summary (user -> total)
    const totalsRows = Object.entries(participantDetails)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([userName, details]) => (
        '<tr><td style="padding:6px 8px; border:1px solid #e9ecef;">' + escapeHtml(userName) + '</td>' +
        '<td style="padding:6px 8px; border:1px solid #e9ecef; text-align:right; font-weight:600;">' + formatVND(details.totalAmount) + '</td></tr>'
      )).join('');
    totalsSummaryHTML = [
      '<div class="section">',
      '<h3>👥 Tổng mỗi người phải trả</h3>',
      '<table style="width:100%; border-collapse:collapse; margin-top:8px;">',
      '<thead><tr>',
      '<th style="text-align:left; padding:6px 8px; border:1px solid #e9ecef; background:#f8f9fa;">Người</th>',
      '<th style="text-align:right; padding:6px 8px; border:1px solid #e9ecef; background:#f8f9fa;">Tổng phải trả</th>',
      '</tr></thead>',
      '<tbody>', totalsRows, '</tbody>',
      '</table>',
      '</div>'
    ].join('');

    participantsNames = Object.keys(participantDetails).sort();

    // Generate per-user daily breakdown
    Object.entries(participantDetails).sort((a, b) => a[0].localeCompare(b[0])).forEach(([userName, details]) => {
      const dates = Object.keys(details.perDate).sort();
      userDetailsHTML += '<div class="user-card">';
      userDetailsHTML += '<div class="user-header">';
      userDetailsHTML += '<h4 style="margin: 0; color: #333;">' + escapeHtml(userName) + '</h4>';
      userDetailsHTML += '<span style="background: #28a745; color: white; padding: 0.25rem 0.75rem; border-radius: 12px; font-size: 0.9rem;">Tổng: ' + formatVND(details.totalAmount) + '</span>';
      userDetailsHTML += '</div>';
      userDetailsHTML += '<div class="daily-breakdown">';
      userDetailsHTML += '<h5 style="margin: 0.5rem 0; color: #666;">Chi tiết theo ngày:</h5>';
      dates.forEach(dateKey => {
        const entries = details.perDate[dateKey];
        const dayTotal = entries.reduce((sum, e) => sum + (e.amount || 0), 0);
        // Header row for the date with day total
        userDetailsHTML += '<div style="display: flex; justify-content: space-between; align-items: center; padding: 0.5rem; background: #f0f2f4; margin-top: 0.25rem; border-radius: 4px;">';
        userDetailsHTML += '<div><strong>' + formatDate(dateKey) + '</strong></div>';
        userDetailsHTML += '<div style="font-weight: 600; color: #28a745;">' + formatVND(dayTotal) + '</div>';
        userDetailsHTML += '</div>';
        // List each entry description (if any)
        entries.forEach((e) => {
          if ((e.description || '').length === 0) return;
          userDetailsHTML += '<div style="display:flex; justify-content: space-between; align-items:center; padding: 0.35rem 0.5rem 0.35rem 0.75rem; margin: 0.15rem 0 0.25rem; border-left: 3px solid #e9ecef; color:#555;">';
          userDetailsHTML += '<div style="font-size: 0.9rem;">' + escapeHtml(e.description) + '</div>';
          userDetailsHTML += '<div style="font-size: 0.9rem; font-weight:600; color:#198754;">' + formatVND(e.amount) + '</div>';
          userDetailsHTML += '</div>';
        });
      });
      userDetailsHTML += '</div>';
      userDetailsHTML += '</div>';
    });
  }

  // Create final HTML using array join
  const htmlParts = [
    '<!DOCTYPE html>',
    '<html>',
    '<head>',
    '<title>Bill Summary Report - ' + escapeHtml(bill.title) + '</title>',
    '<style>',
    'body { font-family: Arial, sans-serif; margin: 20px; color: #333; }',
    '.header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #667eea; padding-bottom: 20px; }',
    '.section { margin-bottom: 25px; }',
    '.section h3 { color: #667eea; border-bottom: 1px solid #ddd; padding-bottom: 5px; }',
    '.stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 20px; }',
    '.stat-card { background: #f8f9fa; padding: 15px; border-radius: 8px; text-align: center; border: 1px solid #e9ecef; }',
    '.stat-number { font-size: 1.5rem; font-weight: bold; color: #667eea; }',
    '.stat-label { color: #666; font-size: 0.9rem; margin-top: 5px; }',
    '.user-card { background: white; border: 1px solid #e9ecef; border-radius: 8px; padding: 15px; margin-bottom: 10px; }',
    '.bill-card { background: white; border: 1px solid #e9ecef; border-radius: 8px; padding: 15px; margin-bottom: 10px; }',
    '.user-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }',
    '.bill-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }',
    '.user-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; font-size: 0.9rem; }',
    '.bill-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; font-size: 0.9rem; color: #666; }',
    '.daily-breakdown { margin-top: 10px; }',
    '.daily-breakdown h5 { margin: 0.5rem 0; color: #666; font-size: 0.9rem; }',
    '.status-badge { padding: 3px 8px; border-radius: 12px; font-size: 0.8rem; text-transform: uppercase; color: white; }',
    '.footer { margin-top: 30px; text-align: center; color: #666; font-size: 0.9rem; border-top: 1px solid #ddd; padding-top: 20px; }',
    '@media print { body { margin: 0; } }',
    '</style>',
    '</head>',
    '<body>',
    '<div class="header">',
    '<h1>Bill Summary Report</h1>',
    '<h2>' + escapeHtml(bill.title) + '</h2>',
    '<p>Generated on ' + currentDate + ' at ' + currentTime + '</p>',
    (bill.qrImage ? ('<div style="margin: 12px 0; text-align: center;"><img src="' + bill.qrImage + '" alt="QR" style="max-width: 240px; max-height: 240px; border:1px solid #e9ecef; border-radius: 8px;" /></div>') : ''),
    '</div>',
    '<div class="section">',
    '<h3>Thống kê hóa đơn</h3>',
    '<div class="stats-grid">',
    '<div class="stat-card"><div class="stat-number">' + formatVND(summary.totalAmount) + '</div><div class="stat-label">Tổng chi</div></div>',
    '<div class="stat-card"><div class="stat-number">' + summary.totalDays + '</div><div class="stat-label">Số ngày</div></div>',
    '<div class="stat-card"><div class="stat-number">' + formatVND(summary.averagePerDay) + '</div><div class="stat-label">Trung bình/ngày</div></div>',
    '<div class="stat-card"><div class="stat-number">' + (summary.participantsCount || (bill.participants?.length || 0)) + '</div><div class="stat-label">Số người</div></div>',
    '</div>',
    '</div>',
    totalsSummaryHTML,
    '<div class="section">',
    '<h3>Chi tiết theo từng người</h3>',
    userDetailsHTML,
    '</div>',
    '<div class="section">',
    '<h3>Thông tin hóa đơn</h3>',
    '<div class="bill-card">',
    '<div class="bill-header">',
    '<h4 style="margin: 0; color: #333;">' + escapeHtml(bill.title) + '</h4>',
    '<span class="status-badge" style="background: ' + getStatusColor(bill.status) + ';">' + bill.status + '</span>',
    '</div>',
    '<div class="bill-stats">',
    '<div><strong>Tổng tiền:</strong> ' + formatVND(bill.totalAmount || 0) + '</div>',
    '<div><strong>Số ngày:</strong> ' + (bill.totalDays || 0) + '</div>',
    '<div><strong>TB/ngày:</strong> ' + formatVND(bill.averagePerDay || 0) + '</div>',
    '<div><strong>Thời gian:</strong> ' + formatDate(bill.startDate) + ' - ' + formatDate(bill.endDate) + '</div>',
    '</div>',
    (bill.participants && bill.participants.length
      ? ('<div style="margin-top: 8px; color:#666; font-size:0.9rem;"><strong>Thành viên:</strong> ' + bill.participants.map(p => escapeHtml(p.name)).join(', ') + '</div>')
      : (participantsNames.length ? ('<div style="margin-top: 8px; color:#666; font-size:0.9rem;"><strong>Thành viên:</strong> ' + participantsNames.map(n => escapeHtml(n)).join(', ') + '</div>') : '')
    ),
    bill.description ? '<div style="margin-top: 10px; font-size: 0.9rem; color: #666; font-style: italic;">"' + escapeHtml(bill.description) + '"</div>' : '',
    '</div>',
    '</div>',
    '<div class="footer">',
    '<p>This report was generated by Bills Management System</p>',
    '<p>For questions or support, please contact the system administrator</p>',
    '</div>',
    '</body>',
    '</html>'
  ];
  
  return htmlParts.join('');
}

function getStatusColor(status) {
  const colors = {
    'draft': '#6c757d',
    'active': '#28a745',
    'completed': '#17a2b8',
    'cancelled': '#dc3545'
  };
  return colors[status] || '#6c757d';
}

async function downloadSummaryPDF(billId) {
  try {
    console.log('downloadSummaryPDF called with billId:', billId);
    console.log('currentSummaryBillId:', currentSummaryBillId);
    
    if (!billId) {
      showError('Bill ID is required');
      return;
    }
    
    // Find the bill
    const bill = currentBills.find(b => b._id === billId);
    if (!bill) {
      showError('Bill not found');
      return;
    }
    
    // Ensure we have participants to resolve names
    if ((!globalParticipants || globalParticipants.length === 0)) {
      try {
        const resp = await fetch(API_BASE + '/api/participants', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        if (resp.ok) {
          globalParticipants = await resp.json();
        }
      } catch (e) {
        console.warn('Could not preload participants for PDF name resolution:', e);
      }
    }

    // Generate PDF for single bill only, honoring excluded participant selection in summary modal
    const excludedParticipantIds = (typeof window !== 'undefined' && Array.isArray(window.currentSummaryExcludedParticipantIds))
      ? window.currentSummaryExcludedParticipantIds
      : [];
    const summary = calculateSingleBillSummary(bill, { excludedParticipantIds });
    const htmlContent = generateSingleBillPDFHTML(summary, bill, { excludedParticipantIds });
    
    // Create a new window for PDF generation
    const summaryWindow = window.open('', '_blank');
    summaryWindow.document.write(htmlContent);
    summaryWindow.document.close();
    
    // Wait for content to load, then print
    setTimeout(() => {
      summaryWindow.print();
    }, 500);
  } catch (error) {
    console.error('Error generating PDF:', error);
    showError('Failed to generate PDF. Please try again.');
  }
}

function calculateSummaryStatistics() {
  const summary = {
    totalBills: currentBills.length,
    totalAmount: 0,
    totalDays: 0,
    averagePerDay: 0,
    userStats: {}
  };

  // Calculate overall statistics
  currentBills.forEach(bill => {
    summary.totalAmount += bill.totalAmount || 0;
    summary.totalDays += bill.totalDays || 0;
    
    // Calculate user statistics
    if (bill.participants && bill.participants.length > 0) {
      bill.participants.forEach(participant => {
        const userName = participant.name;
        if (!summary.userStats[userName]) {
          summary.userStats[userName] = {
            billCount: 0,
            totalSpent: 0,
            totalDays: 0,
            averagePerBill: 0,
            averagePerDay: 0
          };
        }
        
        summary.userStats[userName].billCount++;
        summary.userStats[userName].totalSpent += (bill.totalAmount || 0) / (bill.participants.length || 1);
        summary.userStats[userName].totalDays += bill.totalDays || 0;
      });
    }
  });

  // Calculate averages
  summary.averagePerDay = summary.totalDays > 0 ? summary.totalAmount / summary.totalDays : 0;
  
  Object.keys(summary.userStats).forEach(userName => {
    const userStats = summary.userStats[userName];
    userStats.averagePerBill = userStats.billCount > 0 ? userStats.totalSpent / userStats.billCount : 0;
    userStats.averagePerDay = userStats.totalDays > 0 ? userStats.totalSpent / userStats.totalDays : 0;
  });

  return summary;
}
