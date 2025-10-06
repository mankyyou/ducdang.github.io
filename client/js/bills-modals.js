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
              <button class="btn btn-small" onclick="triggerBillQRUpload()">Update QR Image</button>
              <button class="btn btn-small" onclick="openSummaryModal('${bill._id}')" style="background: linear-gradient(135deg, #28a745, #20c997);">Summary & Download PDF</button>
              <button class="btn btn-small btn-secondary" onclick="exportBillOnline('${bill._id}')">Export Online</button>
              <input id="bill-qr-input" type="file" accept="image/*" style="display:none" onchange="attachBillQRImage(this)">
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

async function ensureGlobalParticipantsLoaded() {
  try {
    if (!globalParticipants || globalParticipants.length === 0) {
      const resp = await fetch(API_BASE + '/api/participants', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (resp.ok) {
        globalParticipants = await resp.json();
      }
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('Could not load participants for summary view:', e);
  }
}

async function openSummaryModal(billId) {
  if (!billId) {
    showError('Bill ID is required to view summary');
    return;
  }
  
  currentSummaryBillId = billId;
  await generateSummaryContent(billId);
  document.getElementById('summary-modal').style.display = 'block';
}

function closeSummaryModal() {
  document.getElementById('summary-modal').style.display = 'none';
  currentSummaryBillId = null;
}

async function generateSummaryContent(billId) {
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
  
  await ensureGlobalParticipantsLoaded();
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
  const excludedParticipantIds = (typeof window !== 'undefined' && Array.isArray(window.currentSummaryExcludedParticipantIds))
    ? window.currentSummaryExcludedParticipantIds
    : [];
  const summary = calculateSingleBillSummary(bill, { excludedParticipantIds });
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
  return 'Unknown';
}

// Single Bill Summary Functions
function calculateSingleBillSummary(bill, options) {
  const excludedParticipantIds = options && Array.isArray(options.excludedParticipantIds) ? options.excludedParticipantIds : [];
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
    // Apply exclusion if provided
    if (excludedParticipantIds.length > 0) {
      participantIds = participantIds.filter(pid => !excludedParticipantIds.includes(pid));
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
  
  const excludedIds = (typeof window !== 'undefined' && Array.isArray(window.currentSummaryExcludedParticipantIds))
    ? window.currentSummaryExcludedParticipantIds
    : [];
  // Build participants for exclusion from bill.participants or derive from dailyDetails when missing
  const participantsForExclude = (bill.participants && bill.participants.length > 0)
    ? bill.participants
    : (() => {
        const idSet = new Set();
        (bill.dailyDetails || []).forEach(detail => {
          let ids = [];
          if (detail.selectedParticipants && detail.selectedParticipants.length > 0) {
            ids = detail.selectedParticipants;
          } else {
            const fallbackCount = detail.splitCount && detail.splitCount > 0 ? detail.splitCount : (bill.participants?.length || 0);
            ids = (bill.participants || []).slice(0, fallbackCount).map(p => p._id);
          }
          ids.forEach(pid => idSet.add(pid));
        });
        // Map to objects with names resolved from global list if needed
        const idsArray = Array.from(idSet);
        const candidates = idsArray.map(pid => ({ _id: pid, name: getParticipantNameById(bill, pid) }));
        // Filter out entries where name is still Unknown and we have global list to cross-check
        return candidates.map(c => {
          if (c.name && c.name !== 'Unknown') return c;
          const fromGlobal = (typeof globalParticipants !== 'undefined' ? globalParticipants : []).find(p => p._id === c._id);
          return fromGlobal ? { _id: fromGlobal._id, name: fromGlobal.name } : c;
        });
      })();

  const excludeSelectHtml = `
    <div style="margin-bottom: 1rem;">
      <div style="display: flex; justify-content: space-between; align-items: center; gap: 1rem;">
        <label style="font-weight: 600; color: #333;">Exclude participants:</label>
        <button class="btn btn-small" onclick="clearExcludedParticipants()">Clear</button>
      </div>
      <div id="exclude-participant-checkboxes" style="margin-top: 0.5rem; display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 0.5rem 1rem;">
        ${(participantsForExclude || []).map(p => `
          <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
            <input type="checkbox" value="${p._id}" ${excludedIds.includes(p._id) ? 'checked' : ''} onchange="excludeParticipantsCheckboxChanged()" />
            <span>${escapeHtml(p.name)}</span>
          </label>
        `).join('')}
      </div>
    </div>
  `;

  summaryContent.innerHTML = `
    <div style="margin-bottom: 2rem;">
      ${excludeSelectHtml}
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

// Exclude participants change handlers
function excludeParticipantsCheckboxChanged() {
  const container = document.getElementById('exclude-participant-checkboxes');
  if (!container) return;
  const selected = Array.from(container.querySelectorAll('input[type="checkbox"]:checked')).map(cb => cb.value);
  if (typeof window !== 'undefined') {
    window.currentSummaryExcludedParticipantIds = selected;
  }
  if (typeof window !== 'undefined' && window.currentSummaryBillId) {
    generateSummaryContent(window.currentSummaryBillId);
  }
}

function clearExcludedParticipants() {
  if (typeof window !== 'undefined') {
    window.currentSummaryExcludedParticipantIds = [];
  }
  const container = document.getElementById('exclude-participant-checkboxes');
  if (container) {
    Array.from(container.querySelectorAll('input[type="checkbox"]')).forEach(cb => cb.checked = false);
  }
  if (typeof window !== 'undefined' && window.currentSummaryBillId) {
    generateSummaryContent(window.currentSummaryBillId);
  }
}

// Add QR image upload helpers scoped to bill description
function triggerBillQRUpload() {
  const input = document.getElementById('bill-qr-input');
  if (input) input.click();
}

async function attachBillQRImage(inputEl) {
  try {
    const file = inputEl.files && inputEl.files[0];
    if (!file || !currentViewingBill) return;
    const reader = new FileReader();
    reader.onload = async function(e) {
      const dataUrl = e.target.result;
      const currentDesc = (currentViewingBill.description || '').trim();
      const newDesc = currentDesc; // keep description unchanged to avoid exceeding maxlength
      // Persist to server
      try {
        const response = await fetch(`${API_BASE}/api/bills/${currentViewingBill._id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({ description: newDesc, qrImage: dataUrl })
        });
        if (!response.ok) {
          // Try to parse JSON; if fails, read text to get clue (e.g., payload too large)
          let msg = 'Failed to update bill';
          try {
            const err = await response.json();
            msg = err.message || msg;
          } catch (_) {
            const errText = await response.text();
            if (errText) msg = errText;
          }
          throw new Error(msg);
        }
        const updated = await response.json();
        // Update local state and rerender
        currentViewingBill = updated;
        const index = currentBills.findIndex(b => b._id === updated._id);
        if (index !== -1) currentBills[index] = updated;
        showSuccess('QR image updated in bill description');
        renderBillDetailsContent();
      } catch (saveErr) {
        console.error(saveErr);
        showError(saveErr.message || 'Could not save QR image');
      }
    };
    reader.readAsDataURL(file);
  } catch (err) {
    console.error('attachBillQRImage error', err);
    showError('Failed to attach QR image');
  }
}

async function exportBillOnline(billId) {
  try {
    if (!billId) return;
    const resp = await fetch(`${API_BASE}/api/bills/${billId}/share`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    if (!resp.ok) {
      const txt = await resp.text();
      throw new Error(txt || 'Failed to create share link');
    }
    const data = await resp.json();
    const url = data.shareUrl || (API_BASE + '/share/' + (data.key || ''));
    showSuccess('Public link created!');
    window.open(url, '_blank');
  } catch (err) {
    console.error('exportBillOnline error', err);
    showError(err.message || 'Failed to export online');
  }
}
