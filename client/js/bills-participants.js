// Bills Participants and Daily Details Functions

// Global Participants Management
function openParticipantsModal() {
  loadGlobalParticipants();
  document.getElementById('participants-modal').style.display = 'block';
}

function closeParticipantsModal() {
  document.getElementById('participants-modal').style.display = 'none';
}

async function loadGlobalParticipants() {
  try {
    console.log('Loading global participants...');
    console.log('API_BASE:', API_BASE);
    console.log('Token:', localStorage.getItem('token') ? 'Present' : 'Missing');
    
    const response = await fetch(`${API_BASE}/api/participants`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });

    console.log('Response status:', response.status);
    console.log('Response ok:', response.ok);

    if (response.ok) {
      globalParticipants = await response.json();
      console.log('Loaded participants:', globalParticipants);
      renderGlobalParticipants();
    } else {
      const errorText = await response.text();
      console.error('Error response:', errorText);
      console.log('Falling back to extract participants from bills...');
      loadParticipantsFromBills();
    }
  } catch (error) {
    console.error('Error loading participants:', error);
    console.log('Falling back to extract participants from bills...');
    loadParticipantsFromBills();
  }
}

function loadParticipantsFromBills() {
  console.log('Extracting participants from existing bills...');
  const allParticipants = new Map();
  
  currentBills.forEach(bill => {
    if (bill.participants) {
      bill.participants.forEach(participant => {
        const key = participant.name;
        if (!allParticipants.has(key)) {
          allParticipants.set(key, {
            _id: participant._id,
            name: participant.name,
            createdAt: participant.joinedAt || new Date(),
            fromBills: true
          });
        }
      });
    }
  });
  
  globalParticipants = Array.from(allParticipants.values());
  console.log('Extracted participants:', globalParticipants);
  renderGlobalParticipants();
  
  if (globalParticipants.length === 0) {
    showError('No participants found. Please add participants to your bills first, or check if the server is running.');
  } else {
    showInfo(`Loaded ${globalParticipants.length} participants from existing bills.`);
  }
}

function renderGlobalParticipants() {
  const participantsList = document.getElementById('participants-list');
  
  if (!globalParticipants || globalParticipants.length === 0) {
    participantsList.innerHTML = `
      <div style="text-align: center; color: #666; padding: 2rem;">
        <p>No participants added yet.</p>
        <p>Click "Add New Participant" to get started.</p>
        <p style="font-size: 0.9rem; color: #999; margin-top: 1rem;">
          Note: Participants are shared across all your bills for easy reuse.
        </p>
      </div>
    `;
    return;
  }

  participantsList.innerHTML = globalParticipants.map(participant => `
    <div class="bill-card" style="padding: 1rem; margin-bottom: 0.5rem;">
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <div>
          <strong>${escapeHtml(participant.name)}</strong>
          <br><small style="color: #999;">Created: ${formatDate(participant.createdAt || participant.joinedAt || new Date())}</small>
        </div>
        <button class="btn btn-small btn-danger" onclick="removeGlobalParticipant('${participant._id}')">Remove</button>
      </div>
    </div>
  `).join('');
}

async function removeGlobalParticipant(participantId) {
  if (!confirm('Are you sure you want to remove this participant? This will remove them from all bills.')) {
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/api/participants/${participantId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });

    if (response.ok) {
      showSuccess('Participant removed successfully!');
      await loadGlobalParticipants();
      // Refresh bills to update participant lists
      await loadBillsData();
    } else {
      const error = await response.json();
      throw new Error(error.message || 'Failed to remove participant');
    }
  } catch (error) {
    console.error('Error removing participant:', error);
    showError(error.message || 'Failed to remove participant. Please try again.');
  }
}

// Participant Modal Functions
function openAddParticipantModal() {
  document.getElementById('participant-form').reset();
  document.getElementById('participant-modal').style.display = 'block';
}

function closeParticipantModal() {
  document.getElementById('participant-modal').style.display = 'none';
}

async function handleParticipantSubmit(event) {
  event.preventDefault();
  
  const formData = {
    name: document.getElementById('participant-name').value.trim()
  };

  console.log('Submitting participant:', formData);
  console.log('API_BASE:', API_BASE);

  try {
    const response = await fetch(`${API_BASE}/api/participants`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(formData)
    });

    console.log('Response status:', response.status);
    console.log('Response ok:', response.ok);

    if (response.ok) {
      showSuccess('Participant added successfully!');
      closeParticipantModal();
      
      // Refresh global participants list if modal is open
      if (document.getElementById('participants-modal').style.display === 'block') {
        await loadGlobalParticipants();
      }
    } else {
      const errorText = await response.text();
      console.error('Error response:', errorText);
      let errorMessage = 'Failed to add participant';
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.message || errorMessage;
      } catch (e) {
        console.error('Could not parse error response:', e);
      }
      throw new Error(errorMessage);
    }
  } catch (error) {
    console.error('Error adding participant:', error);
    showError(error.message || 'Failed to add participant. Please try again.');
  }
}

// Daily Detail Modal Functions
function openAddDailyDetailModal() {
  currentEditingDetail = null;
  document.getElementById('daily-detail-modal-title').textContent = 'Add Daily Detail';
  document.getElementById('daily-detail-submit-btn').textContent = 'Add Daily Detail';
  document.getElementById('daily-detail-form').reset();
  
  // Set default date to today if within bill period
  const today = new Date().toISOString().split('T')[0];
  const billStart = new Date(currentViewingBill.startDate).toISOString().split('T')[0];
  const billEnd = new Date(currentViewingBill.endDate).toISOString().split('T')[0];
  
  if (today >= billStart && today <= billEnd) {
    document.getElementById('detail-date').value = today;
  } else {
    document.getElementById('detail-date').value = billStart;
  }
  
  // Load participants for selection
  loadParticipantsSelect();
  
  document.getElementById('daily-detail-modal').style.display = 'block';
}

function loadParticipantsSelect() {
  const participantsSelect = document.getElementById('participants-select');
  
  // Use global participants if available, otherwise fallback to bill participants
  let participants = globalParticipants && globalParticipants.length > 0 
    ? globalParticipants 
    : (currentViewingBill?.participants || []);
  
  if (participants.length === 0) {
    participantsSelect.innerHTML = `
      <div style="text-align: center; color: #999; padding: 1rem;">
        <p>No participants available.</p>
        <p style="font-size: 0.9rem; margin-top: 0.5rem;">
          <a href="#" onclick="openParticipantsModal(); closeDailyDetailModal();" style="color: #007aff; text-decoration: none;">
            👥 Manage Participants
          </a> to add participants first.
        </p>
      </div>
    `;
    return;
  }
  
  participantsSelect.innerHTML = `
    <div style="margin-bottom: 0.75rem; padding: 0.5rem; background: #f8f9fa; border-radius: 6px; border-bottom: 1px solid #dee2e6;">
      <label style="display: flex; align-items: center; cursor: pointer; font-weight: 600; color: #495057;">
        <input type="checkbox" id="select-all-participants" style="margin-right: 0.5rem;" onchange="toggleSelectAllParticipants()">
        <span>Select All (${participants.length} participants)</span>
      </label>
    </div>
    ${participants.map(participant => `
      <div style="margin-bottom: 0.5rem;">
        <label style="display: flex; align-items: center; cursor: pointer; padding: 0.25rem;">
          <input type="checkbox" value="${participant._id}" style="margin-right: 0.5rem;" onchange="updateSelectedParticipants()">
          <span>${escapeHtml(participant.name)}</span>
        </label>
      </div>
    `).join('')}
  `;
}

function updateSelectedParticipants() {
  const checkboxes = document.querySelectorAll('#participants-select input[type="checkbox"]:not(#select-all-participants)');
  const selectedCheckboxes = document.querySelectorAll('#participants-select input[type="checkbox"]:not(#select-all-participants):checked');
  const selectedCount = selectedCheckboxes.length;
  const totalCount = checkboxes.length;
  
  // Update select all checkbox
  const selectAllCheckbox = document.getElementById('select-all-participants');
  if (selectAllCheckbox) {
    selectAllCheckbox.checked = selectedCount === totalCount;
    selectAllCheckbox.indeterminate = selectedCount > 0 && selectedCount < totalCount;
  }
  
  // Update visual feedback
  const participantsSelect = document.getElementById('participants-select');
  const existingFeedback = participantsSelect.querySelector('.selection-feedback');
  
  if (existingFeedback) {
    existingFeedback.remove();
  }
  
  if (selectedCount > 0) {
    const feedback = document.createElement('div');
    feedback.className = 'selection-feedback';
    feedback.style.cssText = 'margin-top: 0.5rem; padding: 0.5rem; background: #e8f4f8; border-radius: 4px; font-size: 0.9rem; color: #0c5460;';
    feedback.textContent = `${selectedCount} participant(s) selected`;
    participantsSelect.appendChild(feedback);
  }
}

function toggleSelectAllParticipants() {
  const selectAllCheckbox = document.getElementById('select-all-participants');
  const checkboxes = document.querySelectorAll('#participants-select input[type="checkbox"]:not(#select-all-participants)');
  
  checkboxes.forEach(checkbox => {
    checkbox.checked = selectAllCheckbox.checked;
  });
  
  updateSelectedParticipants();
}

function editDailyDetail(detailId) {
  const detail = currentViewingBill.dailyDetails.find(d => d._id === detailId);
  if (!detail) return;

  currentEditingDetail = detail;
  document.getElementById('daily-detail-modal-title').textContent = 'Edit Daily Detail';
  document.getElementById('daily-detail-submit-btn').textContent = 'Update Daily Detail';
  
  // Populate form
  document.getElementById('detail-date').value = detail.date.split('T')[0];
  // Format amount with commas for display (remove currency symbol for input)
  const formattedAmount = formatVND(detail.amount).replace(/[₫\s]/g, '');
  document.getElementById('detail-amount').value = formattedAmount;
  document.getElementById('detail-description').value = detail.description || '';
  
  // Load participants and select the ones from this detail
  loadParticipantsSelect();
  
  // For editing, select the previously selected participants
  setTimeout(() => {
    const checkboxes = document.querySelectorAll('#participants-select input[type="checkbox"]:not(#select-all-participants)');
    
    // Clear all selections first
    checkboxes.forEach(checkbox => checkbox.checked = false);
    
    // Select the previously selected participants
    if (detail.selectedParticipants && detail.selectedParticipants.length > 0) {
      detail.selectedParticipants.forEach(participantId => {
        const checkbox = document.querySelector(`#participants-select input[value="${participantId}"]`);
        if (checkbox) {
          checkbox.checked = true;
        }
      });
    } else {
      // Fallback: select first N participants based on splitCount (for backward compatibility)
      const splitCount = detail.splitCount || 0;
      for (let i = 0; i < Math.min(splitCount, checkboxes.length); i++) {
        checkboxes[i].checked = true;
      }
    }
    
    updateSelectedParticipants();
  }, 100);
  
  document.getElementById('daily-detail-modal').style.display = 'block';
}

function closeDailyDetailModal() {
  document.getElementById('daily-detail-modal').style.display = 'none';
  currentEditingDetail = null;
}

async function handleDailyDetailSubmit(event) {
  event.preventDefault();
  
  // Get selected participants
  const selectedCheckboxes = document.querySelectorAll('#participants-select input[type="checkbox"]:not(#select-all-participants):checked');
  const splitCount = selectedCheckboxes.length;
  
  if (splitCount === 0) {
    showError('Please select at least one participant to split the expense.');
    return;
  }
  
      // Get selected participant IDs (filter out 'on' values)
      const selectedParticipants = Array.from(selectedCheckboxes)
        .map(checkbox => checkbox.value)
        .filter(value => value !== 'on' && value !== ''); // Filter out 'on' and empty values
  
  // Get raw amount value (remove commas and spaces)
  const amountValue = document.getElementById('detail-amount').value.replace(/[,\s]/g, '');
  
  const formData = {
    date: document.getElementById('detail-date').value,
    amount: parseFloat(amountValue),
    splitCount: splitCount,
    selectedParticipants: selectedParticipants,
    description: document.getElementById('detail-description').value.trim() || undefined
  };

  console.log('Form data being sent:', formData);
  console.log('Selected participants:', selectedParticipants);

  try {
    const url = currentEditingDetail 
      ? `${API_BASE}/api/bills/${currentViewingBill._id}/daily-details/${currentEditingDetail._id}`
      : `${API_BASE}/api/bills/${currentViewingBill._id}/daily-details`;
    
    const method = currentEditingDetail ? 'PUT' : 'POST';
    
    const response = await fetch(url, {
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(formData)
    });

    if (response.ok) {
      const updatedBill = await response.json();
      currentViewingBill = updatedBill;
      const index = currentBills.findIndex(b => b._id === updatedBill._id);
      if (index !== -1) {
        currentBills[index] = updatedBill;
      }
      
      showSuccess(currentEditingDetail ? 'Daily detail updated successfully!' : 'Daily detail added successfully!');
      closeDailyDetailModal();
      renderBillDetailsContent();
    } else {
      const error = await response.json();
      throw new Error(error.message || 'Failed to save daily detail');
    }
  } catch (error) {
    console.error('Error saving daily detail:', error);
    showError(error.message || 'Failed to save daily detail. Please try again.');
  }
}

async function removeDailyDetail(detailId) {
  if (!confirm('Are you sure you want to remove this daily detail?')) {
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/api/bills/${currentViewingBill._id}/daily-details/${detailId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });

    if (response.ok) {
      const updatedBill = await response.json();
      currentViewingBill = updatedBill;
      const index = currentBills.findIndex(b => b._id === updatedBill._id);
      if (index !== -1) {
        currentBills[index] = updatedBill;
      }
      
      showSuccess('Daily detail removed successfully!');
      renderBillDetailsContent();
    } else {
      const error = await response.json();
      throw new Error(error.message || 'Failed to remove daily detail');
    }
  } catch (error) {
    console.error('Error removing daily detail:', error);
    showError(error.message || 'Failed to remove daily detail. Please try again.');
  }
}
