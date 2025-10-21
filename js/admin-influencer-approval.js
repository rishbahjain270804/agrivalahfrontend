// Admin Influencer Approval UI
const section = document.getElementById('influencerListSection');

async function loadPendingInfluencers() {
  section.innerHTML = '<div class="alert alert-info">Loading pending influencer registrations...</div>';
  try {
    const res = await fetch('/api/admin/dashboard');
    const data = await res.json();
    if (!data.influencers || !Array.isArray(data.influencers)) throw new Error('Invalid data');
    const pending = data.influencers.filter(i => !i.approved);
    if (pending.length === 0) {
      section.innerHTML = '<div class="alert alert-success">No pending influencer registrations.</div>';
      return;
    }
    let html = '<table class="table table-bordered"><thead><tr><th>Name</th><th>Contact</th><th>Type</th><th>Region</th><th>Action</th></tr></thead><tbody>';
    for (const inf of pending) {
      html += `<tr>
        <td>${inf.name}</td>
        <td>${inf.contact_number}</td>
        <td>${inf.type}</td>
        <td>${inf.region || ''}</td>
        <td><button class="btn btn-success btn-sm" onclick="approveInfluencer('${inf._id}', this)">Approve</button></td>
      </tr>`;
    }
    html += '</tbody></table>';
    section.innerHTML = html;
  } catch (err) {
    section.innerHTML = `<div class='alert alert-danger'>Failed to load influencers: ${err.message}</div>`;
  }
}

window.approveInfluencer = async function(id, btn) {
  btn.disabled = true;
  btn.textContent = 'Approving...';
  try {
    const res = await fetch('/api/admin/approve-influencer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ influencerId: id })
    });
    const data = await res.json();
    if (data.success) {
      btn.parentElement.innerHTML = `<span class='text-success'>Approved<br>Coupon: <b>${data.couponCode}</b></span>`;
    } else {
      btn.disabled = false;
      btn.textContent = 'Approve';
      alert('Approval failed: ' + (data.message || 'Unknown error'));
    }
  } catch (err) {
    btn.disabled = false;
    btn.textContent = 'Approve';
    alert('Error: ' + err.message);
  }
};

loadPendingInfluencers();
