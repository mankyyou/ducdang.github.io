(function() {
  function formatVND(amount) {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', minimumFractionDigits: 0 }).format(amount || 0);
  }

  function qs(name) {
    const params = new URLSearchParams(window.location.search);
    return params.get(name);
  }

  function shareKeyFromPath() {
    const parts = window.location.pathname.split('/');
    return parts[parts.length - 1];
  }

  async function loadSharedBill() {
    try {
      const key = qs('k') || shareKeyFromPath();
      if (!key) throw new Error('Missing share key');
      const resp = await fetch(`${API_BASE}/api/public/bills/${key}`);
      if (!resp.ok) throw new Error('Bill not found');
      const bill = await resp.json();

      document.getElementById('bill-title').textContent = bill.title;
      document.getElementById('bill-period').textContent = `${new Date(bill.startDate).toLocaleDateString()} → ${new Date(bill.endDate).toLocaleDateString()}`;
      document.getElementById('stat-total').textContent = formatVND(bill.totalAmount || 0);
      document.getElementById('stat-days').textContent = bill.totalDays || 0;
      document.getElementById('stat-avg').textContent = formatVND(bill.averagePerDay || 0);
      document.getElementById('stat-participants').textContent = (bill.participants?.length || 0);
      if (bill.qrImage) {
        const box = document.getElementById('qr-box');
        box.style.display = 'block';
        box.innerHTML = `<img src="${bill.qrImage}" alt="QR">`;
      }

      // Build totals per user and daily breakdown similar to PDF
      const participantMap = {};
      (bill.dailyDetails || []).forEach(detail => {
        const ids = detail.selectedParticipants && detail.selectedParticipants.length > 0
          ? detail.selectedParticipants
          : (bill.participants || []).slice(0, detail.splitCount || 0).map(p => p._id);
        if (!ids || ids.length === 0) return;
        const per = (detail.amount || 0) / ids.length;
        ids.forEach(pid => {
          const user = (bill.participants || []).find(p => p._id === pid);
          const name = user ? user.name : pid;
          if (!participantMap[name]) participantMap[name] = { total: 0, perDate: {} };
          const d = new Date(detail.date).toISOString().split('T')[0];
          if (!participantMap[name].perDate[d]) participantMap[name].perDate[d] = [];
          participantMap[name].perDate[d].push({ amount: per, description: (detail.description || '') });
          participantMap[name].total += per;
        });
      });

      const totalsList = document.getElementById('totals-list');
      totalsList.innerHTML = Object.entries(participantMap).sort((a,b)=>a[0].localeCompare(b[0]))
        .map(([name, d]) => `<div style="display:flex; justify-content:space-between; padding:8px 10px; border:1px solid #e9ecef; border-radius:8px; margin-bottom:6px;"><div>${name}</div><div style="font-weight:600;">${formatVND(d.total)}</div></div>`)
        .join('');

      const usersList = document.getElementById('users-list');
      usersList.innerHTML = Object.entries(participantMap).sort((a,b)=>a[0].localeCompare(b[0]))
        .map(([name, d]) => {
          const dates = Object.keys(d.perDate).sort();
          const dateBlocks = dates.map(dt => {
            const items = d.perDate[dt];
            const dayTotal = items.reduce((s, it) => s + (it.amount || 0), 0);
            const entries = items.filter(it => (it.description||'').length>0).map(it => `<div class="entry-row"><div>${it.description}</div><div style="font-weight:600; color:#198754;">${formatVND(it.amount)}</div></div>`).join('');
            return `<div class="date-row"><div><strong>${new Date(dt).toLocaleDateString()}</strong></div><div style="font-weight:600; color:#28a745;">${formatVND(dayTotal)}</div></div>${entries}`;
          }).join('');
          return `<div class="user-card"><div class="user-header"><h4 style="margin:0">${name}</h4><span class="pill">Tổng: ${formatVND(d.total)}</span></div>${dateBlocks}</div>`;
        }).join('');

    } catch (e) {
      document.body.innerHTML = `<div style="max-width: 720px; margin: 40px auto; color:#c00;">${e.message}</div>`;
    }
  }

  loadSharedBill();
})();


