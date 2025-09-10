// Bills Modal Functions

// Open create bill modal
function openCreateBillModal() {
  currentEditingBill = null;
  document.getElementById('modal-title').textContent = 'Create New Bill';
  document.getElementById('submit-btn').textContent = 'Create Bill';
  
  // Remove status field if it exists (from previous editing)
  const statusField = document.getElementById('bill-status');
  if (statusField) {
    statusField.parentElement.remove();
  }
  
  // Reset form
  document.getElementById('bill-form').reset();
  
  // Set default dates
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('bill-start-date').value = today;
  document.getElementById('bill-end-date').value = today;
  
  document.getElementById('bill-modal').style.display = 'block';
}

// Close bill modal
function closeBillModal() {
  document.getElementById('bill-modal').style.display = 'none';
  currentEditingBill = null;
  
  // Remove status field if it exists (for editing mode)
  const statusField = document.getElementById('bill-status');
  if (statusField) {
    statusField.parentElement.remove();
  }
}

// Handle bill form submission
async function handleBillSubmit(event) {
  event.preventDefault();
  
  const formData = {
    title: document.getElementById('bill-title').value.trim(),
    description: document.getElementById('bill-description').value.trim(),
    startDate: document.getElementById('bill-start-date').value,
    endDate: document.getElementById('bill-end-date').value
  };

  // Only include status when editing (not creating)
  if (currentEditingBill) {
    formData.status = document.getElementById('bill-status').value || currentEditingBill.status;
  }

  try {
    const url = currentEditingBill 
      ? `${API_BASE}/api/bills/${currentEditingBill._id}`
      : `${API_BASE}/api/bills`;
    
    const method = currentEditingBill ? 'PUT' : 'POST';
    
    const response = await fetch(url, {
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(formData)
    });

    if (response.ok) {
      const bill = await response.json();
      showSuccess(currentEditingBill ? 'Bill updated successfully!' : 'Bill created successfully!');
      closeBillModal();
      await loadBillsData();
    } else {
      const error = await response.json();
      throw new Error(error.message || 'Failed to save bill');
    }
  } catch (error) {
    console.error('Error saving bill:', error);
    showError(error.message || 'Failed to save bill. Please try again.');
  }
}

// Edit bill
function editBill(billId) {
  const bill = currentBills.find(b => b._id === billId);
  if (!bill) return;

  currentEditingBill = bill;
  document.getElementById('modal-title').textContent = 'Edit Bill';
  document.getElementById('submit-btn').textContent = 'Update Bill';
  
  // Populate form
  document.getElementById('bill-title').value = bill.title;
  document.getElementById('bill-description').value = bill.description || '';
  document.getElementById('bill-start-date').value = bill.startDate.split('T')[0];
  document.getElementById('bill-end-date').value = bill.endDate.split('T')[0];
  
  // Add status field back for editing
  if (!document.getElementById('bill-status')) {
    const statusGroup = document.createElement('div');
    statusGroup.className = 'form-group';
    statusGroup.innerHTML = `
      <label class="form-label" for="bill-status">Status</label>
      <select id="bill-status" class="form-input">
        <option value="draft">Draft</option>
        <option value="active">Active</option>
        <option value="completed">Completed</option>
        <option value="cancelled">Cancelled</option>
      </select>
    `;
    
    // Find the action-buttons div in the bill form
    const actionButtons = document.querySelector('#bill-form .action-buttons');
    if (actionButtons) {
      document.getElementById('bill-form').insertBefore(statusGroup, actionButtons);
    } else {
      // Fallback: append to the end of the form
      document.getElementById('bill-form').appendChild(statusGroup);
    }
  }
  
  // Set the status value
  const statusSelect = document.getElementById('bill-status');
  if (statusSelect) {
    statusSelect.value = bill.status || 'draft';
  }
  
  document.getElementById('bill-modal').style.display = 'block';
}

// View bill details
function viewBillDetails(billId) {
  const bill = currentBills.find(b => b._id === billId);
  if (bill) {
    currentViewingBill = bill;
    openBillDetailsModal();
  }
}

// Delete bill
async function deleteBill(billId) {
  const bill = currentBills.find(b => b._id === billId);
  if (!bill) return;

  if (!confirm(`Are you sure you want to delete "${bill.title}"? This action cannot be undone.`)) {
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/api/bills/${billId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });

    if (response.ok) {
      showSuccess('Bill deleted successfully!');
      await loadBillsData();
    } else {
      const error = await response.json();
      throw new Error(error.message || 'Failed to delete bill');
    }
  } catch (error) {
    console.error('Error deleting bill:', error);
    showError(error.message || 'Failed to delete bill. Please try again.');
  }
}

// Refresh bills
async function refreshBills() {
  document.getElementById('loading').style.display = 'block';
  document.getElementById('main-content').style.display = 'none';
  
  await loadBillsData();
  
  document.getElementById('loading').style.display = 'none';
  document.getElementById('main-content').style.display = 'block';
  
  showSuccess('Bills refreshed!');
}

// Bill Details Modal Functions
function openBillDetailsModal() {
  if (!currentViewingBill) return;
  
  document.getElementById('details-modal-title').textContent = `${currentViewingBill.title} - Details`;
  renderBillDetailsContent();
  document.getElementById('bill-details-modal').style.display = 'block';
}

function closeBillDetailsModal() {
  document.getElementById('bill-details-modal').style.display = 'none';
  currentViewingBill = null;
}

function renderBillDetailsContent() {
  const bill = currentViewingBill;
  if (!bill) return;

  const detailsContent = document.getElementById('bill-details-content');
  detailsContent.innerHTML = `
    <div style="margin-bottom: 2rem;">
      <div class="bill-details" style="margin-bottom: 1rem;">
        <div class="bill-detail">
          <div class="bill-detail-value">${formatVND(bill.totalAmount || 0)}</div>
          <div class="bill-detail-label">Total Amount</div>
        </div>
        <div class="bill-detail">
          <div class="bill-detail-value">${bill.totalDays || 0}</div>
          <div class="bill-detail-label">Total Days</div>
        </div>
        <div class="bill-detail">
          <div class="bill-detail-value">${bill.totalParticipants || 0}</div>
          <div class="bill-detail-label">Participants</div>
        </div>
        <div class="bill-detail">
          <div class="bill-detail-value">${formatVND(bill.averagePerDay || 0)}</div>
          <div class="bill-detail-label">Average/Day</div>
        </div>
      </div>
      
      <div style="margin-bottom: 1rem;">
        <strong>Period:</strong> ${formatDate(bill.startDate)} → ${formatDate(bill.endDate)}
      </div>
      
      ${bill.description ? `<div style="margin-bottom: 1rem;"><strong>Description:</strong> ${escapeHtml(bill.description)}</div>` : ''}
      
      <div style="margin-bottom: 1rem;">
        <strong>Status:</strong> <span class="bill-status status-${bill.status}">${bill.status}</span>
      </div>
    </div>

        <!-- Daily Details Section -->
        <div class="bills-section">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
            <h4 class="section-title" style="margin-bottom: 0;">Daily Details (${bill.dailyDetails?.length || 0})</h4>
            <div style="display: flex; gap: 0.5rem;">
              <button class="btn btn-small" onclick="openAddDailyDetailModal()">+ Add Daily Detail</button>
              <button class="btn btn-small" onclick="openSummaryModal('${bill._id}')" style="background: linear-gradient(135deg, #28a745, #20c997);">Summary & Download PDF</button>
            </div>
          </div>
          <div id="daily-details-list">
            ${renderDailyDetailsList(bill.dailyDetails || [])}
          </div>
        </div>
  `;
}

function renderDailyDetailsList(dailyDetails) {
  if (dailyDetails.length === 0) {
    return '<p style="color: #666; text-align: center; padding: 1rem;">No daily details added yet</p>';
  }

  // Sort by date
  const sortedDetails = [...dailyDetails].sort((a, b) => new Date(a.date) - new Date(b.date));

  return sortedDetails.map(detail => `
    <div class="bill-card" style="padding: 1rem; margin-bottom: 0.5rem;">
      <div style="display: flex; justify-content: between; align-items: flex-start; gap: 1rem;">
        <div style="flex: 1;">
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 1rem; margin-bottom: 0.5rem;">
            <div>
              <strong>Date: ${formatDate(detail.date)}</strong>
            </div>
            <div>
              <strong>Amount: ${formatVND(detail.amount || 0)}</strong>
            </div>
            <div>
              <strong>People: ${detail.splitCount || 0}</strong>
            </div>
            <div>
              <strong>Per Person: ${formatVND(detail.amountPerPerson || 0)}</strong>
            </div>
          </div>
          ${detail.description ? `<div style="color: #666; font-size: 0.9rem;">${escapeHtml(detail.description)}</div>` : ''}
        </div>
        <div style="display: flex; gap: 0.5rem;">
          <button class="btn btn-small btn-secondary" onclick="editDailyDetail('${detail._id}')">Edit</button>
          <button class="btn btn-small btn-danger" onclick="removeDailyDetail('${detail._id}')">Delete</button>
        </div>
      </div>
    </div>
  `).join('');
}

// Summary Modal Functions
let currentSummaryBillId = null;

function openSummaryModal(billId) {
  if (!billId) {
    showError('Bill ID is required to view summary');
    return;
  }
  
  currentSummaryBillId = billId;
  generateSummaryContent(billId);
  document.getElementById('summary-modal').style.display = 'block';
}

function closeSummaryModal() {
  document.getElementById('summary-modal').style.display = 'none';
  currentSummaryBillId = null;
}

function generateSummaryContent(billId) {
  const summaryContent = document.getElementById('summary-content');
  
  // Only show summary for specific bill
  if (!billId) {
    summaryContent.innerHTML = `
      <div style="text-align: center; padding: 2rem; color: #666;">
        <h4>Bill ID Required</h4>
        <p>Please select a bill to view its summary.</p>
      </div>
    `;
    return;
  }
  
  const bill = currentBills.find(b => b._id === billId);
  if (!bill) {
    summaryContent.innerHTML = `
      <div style="text-align: center; padding: 2rem; color: #666;">
        <h4>Bill Not Found</h4>
        <p>The requested bill could not be found.</p>
      </div>
    `;
    return;
  }
  
  // Generate summary for single bill only
  const summary = calculateSingleBillSummary(bill);
  generateSingleBillSummaryHTML(summary, bill);
}

// Close modal when clicking outside
window.onclick = function(event) {
  const billModal = document.getElementById('bill-modal');
  const detailsModal = document.getElementById('bill-details-modal');
  const participantsModal = document.getElementById('participants-modal');
  const participantModal = document.getElementById('participant-modal');
  const dailyDetailModal = document.getElementById('daily-detail-modal');
  const summaryModal = document.getElementById('summary-modal');
  
  if (event.target === billModal) {
    closeBillModal();
  } else if (event.target === detailsModal) {
    closeBillDetailsModal();
  } else if (event.target === participantsModal) {
    closeParticipantsModal();
  } else if (event.target === participantModal) {
    closeParticipantModal();
  } else if (event.target === dailyDetailModal) {
    closeDailyDetailModal();
  } else if (event.target === summaryModal) {
    closeSummaryModal();
  }
}

// Handle ESC key to close modal
document.addEventListener('keydown', function(event) {
  if (event.key === 'Escape') {
    closeBillModal();
    closeBillDetailsModal();
    closeParticipantsModal();
    closeParticipantModal();
    closeDailyDetailModal();
    closeSummaryModal();
  }
});

// Helpers to resolve participant names
function getParticipantNameById(bill, participantId) {
  // Try from bill participants first
  const fromBill = bill?.participants?.find(p => p._id === participantId);
  if (fromBill) return fromBill.name;
  // Fallback to global participants
  const fromGlobal = (typeof globalParticipants !== 'undefined' ? globalParticipants : [])
    .find(p => p._id === participantId);
  if (fromGlobal) return fromGlobal.name;
  // Last resort: show truncated id
  return participantId;
}

// Single Bill Summary Functions
function calculateSingleBillSummary(bill) {
  const summary = {
    totalAmount: bill.totalAmount || 0,
    totalDays: bill.totalDays || 0,
    averagePerDay: bill.averagePerDay || 0,
    userStats: {},
    participantsCount: 0
  };

  // Build stats from daily details to be robust even if bill.participants is empty
  const uniqueParticipantIds = new Set();
  (bill.dailyDetails || []).forEach(detail => {
    // Determine participants in this detail
    let participantIds = [];
    if (detail.selectedParticipants && detail.selectedParticipants.length > 0) {
      participantIds = detail.selectedParticipants;
    } else {
      // Fallback: use first N participants based on splitCount
      const fallbackCount = detail.splitCount && (bill.participants?.length || 0) > 0
        ? Math.min(detail.splitCount, bill.participants.length)
        : 0;
      participantIds = (bill.participants || []).slice(0, fallbackCount).map(p => p._id);
    }
    if (participantIds.length === 0) return;

    const amountPerPerson = (detail.amount || 0) / participantIds.length;
    participantIds.forEach(pid => {
      uniqueParticipantIds.add(pid);
      const name = getParticipantNameById(bill, pid);
      if (!summary.userStats[name]) {
        summary.userStats[name] = { totalSpent: 0, daysInvolved: 0, averagePerDay: 0 };
      }
      summary.userStats[name].totalSpent += amountPerPerson;
      summary.userStats[name].daysInvolved += 1; // count this day involved
    });
  });

  // If no daily details, fall back to bill.participants length
  summary.participantsCount = uniqueParticipantIds.size > 0
    ? uniqueParticipantIds.size
    : (bill.participants?.length || 0);

  // Calculate averages
  Object.keys(summary.userStats).forEach(userName => {
    const userStats = summary.userStats[userName];
    userStats.averagePerDay = userStats.daysInvolved > 0 ? userStats.totalSpent / userStats.daysInvolved : 0;
  });

  return summary;
}

function generateSingleBillSummaryHTML(summary, bill) {
  const summaryContent = document.getElementById('summary-content');
  
  summaryContent.innerHTML = `
    <div style="margin-bottom: 2rem;">
      <h4 style="color: #333; margin-bottom: 1rem; border-bottom: 2px solid #667eea; padding-bottom: 0.5rem;">
        Bill Summary: ${escapeHtml(bill.title)}
      </h4>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 1.5rem;">
        <div style="background: #f8f9fa; padding: 1rem; border-radius: 8px; text-align: center;">
          <div style="font-size: 1.5rem; font-weight: 600; color: #28a745;">${formatVND(summary.totalAmount)}</div>
          <div style="color: #666; font-size: 0.9rem;">Total Amount</div>
        </div>
        <div style="background: #f8f9fa; padding: 1rem; border-radius: 8px; text-align: center;">
          <div style="font-size: 1.5rem; font-weight: 600; color: #17a2b8;">${summary.totalDays}</div>
          <div style="color: #666; font-size: 0.9rem;">Total Days</div>
        </div>
        <div style="background: #f8f9fa; padding: 1rem; border-radius: 8px; text-align: center;">
          <div style="font-size: 1.5rem; font-weight: 600; color: #ffc107;">${formatVND(summary.averagePerDay)}</div>
          <div style="color: #666; font-size: 0.9rem;">Average/Day</div>
        </div>
        <div style="background: #f8f9fa; padding: 1rem; border-radius: 8px; text-align: center;">
          <div style="font-size: 1.5rem; font-weight: 600; color: #667eea;">${summary.participantsCount || 0}</div>
          <div style="color: #666; font-size: 0.9rem;">Participants</div>
        </div>
      </div>
    </div>

    <div style="margin-bottom: 2rem;">
      <h4 style="color: #333; margin-bottom: 1rem; border-bottom: 2px solid #667eea; padding-bottom: 0.5rem;">
        Participant Breakdown
      </h4>
      <div style="display: grid; gap: 1rem;">
        ${Object.entries(summary.userStats).map(([userName, stats]) => `
          <div style="background: white; border: 1px solid #e9ecef; border-radius: 8px; padding: 1rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
              <h5 style="margin: 0; color: #333; font-weight: 600;">${escapeHtml(userName)}</h5>
            </div>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 0.5rem; font-size: 0.9rem;">
              <div>
                <strong>Amount to Pay:</strong> ${formatVND(stats.totalSpent)}
              </div>
              <div>
                <strong>Days Involved:</strong> ${stats.daysInvolved}
              </div>
              <div>
                <strong>Average/Day:</strong> ${formatVND(stats.averagePerDay)}
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>

    <div>
      <h4 style="color: #333; margin-bottom: 1rem; border-bottom: 2px solid #667eea; padding-bottom: 0.5rem;">
        Bill Details
      </h4>
      <div style="background: white; border: 1px solid #e9ecef; border-radius: 8px; padding: 1rem;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
          <h5 style="margin: 0; color: #333; font-weight: 600;">${escapeHtml(bill.title)}</h5>
          <span style="background: ${getStatusColor(bill.status)}; color: white; padding: 0.25rem 0.75rem; border-radius: 12px; font-size: 0.8rem; text-transform: uppercase;">
            ${bill.status}
          </span>
        </div>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 0.5rem; font-size: 0.9rem; color: #666;">
          <div><strong>Amount:</strong> ${formatVND(bill.totalAmount || 0)}</div>
          <div><strong>Days:</strong> ${bill.totalDays || 0}</div>
          <div><strong>Avg/Day:</strong> ${formatVND(bill.averagePerDay || 0)}</div>
          <div><strong>Period:</strong> ${formatDate(bill.startDate)} - ${formatDate(bill.endDate)}</div>
        </div>
        ${bill.description ? `<div style="margin-top: 0.5rem; font-size: 0.9rem; color: #666; font-style: italic;">"${escapeHtml(bill.description)}"</div>` : ''}
      </div>
    </div>
  `;
}
