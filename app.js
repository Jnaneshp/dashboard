const API_URL = 'https://backend-02-reru.onrender.com/api';

console.log('🚀 App.js loaded - API URL:', API_URL);

// ✅ SHOW/HIDE SECTIONS
function showSection(section, btn) {
  console.log('📍 Showing section:', section);
  
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  const sectionEl = document.getElementById(section);
  if (sectionEl) sectionEl.classList.add('active');
  
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');

  if (section === 'paintings') {
    loadPaintings();
  } else if (section === 'analytics') {
    loadAnalytics();
  }
}

// ✅ Initialize on DOM Load
document.addEventListener('DOMContentLoaded', () => {
  console.log('✅ DOM Loaded');
  
  // Setup form
  const form = document.getElementById('paintingForm');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      console.log('📝 Form submitted');
      await addPainting();
    });
  }

  // Setup file upload zone
  setupFileUploadZone();
  
  // Load paintings on start
  loadPaintings();
});

// ✅ SETUP FILE UPLOAD WITH DRAG-DROP
function setupFileUploadZone() {
  const imageUploadZone = document.getElementById('image-upload-zone') || document.querySelector('.image-upload');
  const fileInput = document.getElementById('painting-image');
  const previewContainer = document.getElementById('image-preview-container');
  const previewImg = document.getElementById('preview-img');

  if (!imageUploadZone || !fileInput) {
    console.warn('⚠️ Image upload elements not found');
    return;
  }

  // ✅ CLICK TO UPLOAD
  fileInput.addEventListener('change', handleFileSelect);

  // ✅ DRAG & DROP EVENTS
  imageUploadZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
    imageUploadZone.classList.add('drag-over');
  });

  imageUploadZone.addEventListener('dragleave', (e) => {
    e.preventDefault();
    e.stopPropagation();
    imageUploadZone.classList.remove('drag-over');
  });

  imageUploadZone.addEventListener('drop', (e) => {
    e.preventDefault();
    e.stopPropagation();
    imageUploadZone.classList.remove('drag-over');
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      fileInput.files = files;
      handleFileSelect();
    }
  });

  // ✅ FILE SELECTION HANDLER
  function handleFileSelect() {
    const file = fileInput.files[0];
    
    if (!file) {
      if (previewContainer) previewContainer.style.display = 'none';
      return;
    }

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      showToast('❌ Only JPG, PNG, and WebP images are supported', 'error');
      fileInput.value = '';
      return;
    }

    // Validate file size (2MB max)
    const maxSize = 2 * 1024 * 1024;
    if (file.size > maxSize) {
      showToast('❌ Image size must be less than 2MB', 'error');
      fileInput.value = '';
      return;
    }

    // Show preview
    const reader = new FileReader();
    reader.onload = (event) => {
      if (previewImg && previewContainer) {
        previewImg.src = event.target.result;
        previewContainer.style.display = 'block';
        showToast(`✅ Image loaded: ${file.name}`, 'success');
      }
    };
    reader.readAsDataURL(file);
    
    console.log('✅ Image selected:', file.name);
  }
}

// ✅ TOAST NOTIFICATION
function showToast(message, type = 'info') {
  const toastContainer = document.getElementById('toast-container');
  if (!toastContainer) return;
  
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  toastContainer.appendChild(toast);
  
  setTimeout(() => toast.remove(), 3000);
}

// ✅ ADD PAINTING FUNCTION (WITH IMAGE SUPPORT)
async function addPainting() {
  try {
    const name = document.getElementById('paintingName')?.value.trim() || '';
    const artist = document.getElementById('artistName')?.value.trim() || '';
    const description = document.getElementById('description')?.value.trim() || '';
    const imageInput = document.getElementById('painting-image');
    const imageFile = imageInput?.files[0];

    console.log('📤 Sending painting data:', { name, artist, description });

    // Validation
    if (!name || !artist || !description) {
      showToast('❌ Please fill all fields (name, artist, description)', 'error');
      return;
    }

    if (!imageFile) {
      showToast('❌ Please select an image', 'error');
      return;
    }

    // Show loading
    const submitBtn = document.querySelector('#paintingForm button[type="submit"]');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = '⏳ Adding...';
    }

    // Convert image to Base64
    const imageBase64 = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(imageFile);
    });

    // Send to backend
    const response = await fetch(`${API_URL}/paintings/add`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name,
        artist,
        description,
        image: imageBase64,
        imageType: imageFile.type
      })
    });

    console.log('📨 Response status:', response.status);
    const data = await response.json();
    console.log('✅ Response data:', data);

    // Reset button
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = '➕ Add Painting';
    }

    if (data.success) {
      showToast('✅ Painting added successfully with image!', 'success');
      document.getElementById('paintingForm').reset();
      
      // Clear image preview
      const previewContainer = document.getElementById('image-preview-container');
      if (previewContainer) previewContainer.style.display = 'none';
      
      // Reload paintings list
      await new Promise(resolve => setTimeout(resolve, 500));
      loadPaintings();
      
      // Switch to paintings view
      showSection('paintings');
    } else {
      showToast('❌ Error: ' + (data.error || 'Unknown error'), 'error');
    }
  } catch (err) {
    console.error('❌ Error:', err);
    showToast('❌ Error: ' + err.message, 'error');
    
    // Reset button
    const submitBtn = document.querySelector('#paintingForm button[type="submit"]');
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = '➕ Add Painting';
    }
  }
}

// ✅ GENERATE DESCRIPTION WITH GEMINI
async function generateDescription() {
  try {
    const name = document.getElementById('paintingName')?.value.trim() || '';
    const artist = document.getElementById('artistName')?.value.trim() || '';

    if (!name || !artist) {
      showToast('❌ Please enter painting name and artist first', 'error');
      return;
    }

    console.log('🤖 Calling Gemini for:', name, artist);
    
    const genBtn = document.getElementById('generateBtn');
    if (genBtn) {
      genBtn.disabled = true;
      genBtn.textContent = '⏳ Generating...';
    }

    const response = await fetch(`${API_URL}/gemini/generate-description`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paintingName: name, artist })
    });

    console.log('📨 Gemini Response status:', response.status);
    const data = await response.json();
    console.log('✅ Gemini data:', data);

    if (genBtn) {
      genBtn.disabled = false;
      genBtn.textContent = '✨ Generate with AI';
    }

    if (data.success) {
      document.getElementById('description').value = data.description;
      showToast('✅ Description generated!', 'success');
    } else {
      showToast('❌ Error: ' + (data.error || 'Failed to generate'), 'error');
    }
  } catch (err) {
    console.error('❌ Gemini Error:', err);
    showToast('❌ Error: ' + err.message, 'error');
    
    const genBtn = document.getElementById('generateBtn');
    if (genBtn) {
      genBtn.disabled = false;
      genBtn.textContent = '✨ Generate with AI';
    }
  }
}

// ✅ LOAD PAINTINGS (WITH IMAGES)
async function loadPaintings() {
  try {
    console.log('📤 Fetching paintings from:', `${API_URL}/paintings/all`);
    
    const response = await fetch(`${API_URL}/paintings/all`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    const paintings = Array.isArray(data) ? data : (data.data || []);
    console.log('✅ Paintings loaded:', paintings.length);

    const paintingsList = document.getElementById('paintingsList');
    
    if (!paintings || paintings.length === 0) {
      paintingsList.innerHTML = '<p style="color: #aaa; grid-column: 1/-1; text-align: center; padding: 40px;">📭 No paintings added yet. Click "+ Add Painting" to get started!</p>';
      return;
    }

    paintingsList.innerHTML = '';

    paintings.forEach((painting, index) => {
      const card = document.createElement('div');
      card.className = 'painting-card';
      
      // Build image HTML
      let imageHTML = '';
      if (painting.image) {
        imageHTML = `<div class="painting-image"><img src="${painting.image}" alt="${painting.name}" style="width: 100%; height: 150px; object-fit: cover; border-radius: 8px;"></div>`;
      }
      
      // Build QR HTML
      let qrHTML = '';
      if (painting.qrCode) {
        qrHTML = `<div class="qr-preview-container"><img src="${painting.qrCode}" class="qr-preview" alt="QR Code" title="Scan this QR code"></div>`;
      }
      
      card.innerHTML = `
        <div class="card-content">
          ${imageHTML}
          <div class="card-text">
            <h3>${painting.name}</h3>
            <p class="artist"><strong>Artist:</strong> ${painting.artist}</p>
            <p class="description">${painting.description.substring(0, 100)}${painting.description.length > 100 ? '...' : ''}</p>
            <div class="card-meta">
              <span class="scan-count">📊 Scans: ${painting.scans || 0}</span>
            </div>
          </div>
          ${qrHTML}
        </div>
        <div class="card-buttons">
          <button class="card-btn edit-btn" onclick="editPaintingModal('${painting._id}', '${painting.name.replace(/'/g, "\\'")}', '${painting.artist.replace(/'/g, "\\'")}')">✏️ Edit</button>
          <button class="card-btn download-btn" onclick="downloadQR('${painting.qrCode}', '${painting.name.replace(/'/g, "\\'")}')">⬇️ QR</button>
          <button class="card-btn delete-btn" onclick="deletePainting('${painting._id}', '${painting.name.replace(/'/g, "\\'")}')">🗑️ Delete</button>
        </div>
      `;
      paintingsList.appendChild(card);
    });
  } catch (err) {
    console.error('❌ Error loading paintings:', err);
    const paintingsList = document.getElementById('paintingsList');
    if (paintingsList) {
      paintingsList.innerHTML = `<p style="color: red; grid-column: 1/-1; padding: 20px;">❌ Error loading paintings: ${err.message}</p>`;
    }
  }
}

// ✅ EDIT PAINTING (Modal Version)
async function editPaintingModal(id, currentName, currentArtist) {
  const newName = prompt('Edit painting name:', currentName);
  if (newName === null) return;

  const newArtist = prompt('Edit artist name:', currentArtist);
  if (newArtist === null) return;

  const newDescription = prompt('Edit description:');
  if (newDescription === null) return;

  if (!newName || !newArtist || !newDescription) {
    showToast('❌ All fields required', 'error');
    return;
  }

  await editPainting(id, newName, newArtist, newDescription);
}

// ✅ EDIT PAINTING
async function editPainting(id, name, artist, description) {
  try {
    console.log('✏️ Editing painting:', id);

    const response = await fetch(`${API_URL}/paintings/edit/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, artist, description })
    });

    const data = await response.json();
    
    if (data.success) {
      showToast('✅ Painting updated!', 'success');
      loadPaintings();
    } else {
      showToast('❌ Error: ' + (data.error || 'Failed to update'), 'error');
    }
  } catch (err) {
    console.error('❌ Edit Error:', err);
    showToast('❌ Error: ' + err.message, 'error');
  }
}

// ✅ DELETE PAINTING
async function deletePainting(id, paintingName = 'Painting') {
  try {
    if (!confirm(`🗑️ Are you sure you want to delete "${paintingName}"? This cannot be undone!`)) return;

    console.log('🗑️ Deleting painting:', id);

    const response = await fetch(`${API_URL}/paintings/delete/${id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' }
    });

    const data = await response.json();
    
    if (data.success) {
      showToast('✅ Painting deleted!', 'success');
      loadPaintings();
    } else {
      showToast('❌ Error: ' + (data.error || 'Failed to delete'), 'error');
    }
  } catch (err) {
    console.error('❌ Delete Error:', err);
    showToast('❌ Error: ' + err.message, 'error');
  }
}

// ✅ DOWNLOAD QR CODE
function downloadQR(qrCode, paintingName) {
  try {
    if (!qrCode) {
      showToast('❌ QR code not available', 'error');
      return;
    }

    const link = document.createElement('a');
    link.href = qrCode;
    link.download = `${paintingName.replace(/\s+/g, '_')}_qr.png`;
    link.click();
    console.log('✅ QR downloaded:', paintingName);
  } catch (err) {
    console.error('❌ Download Error:', err);
    showToast('❌ Error: ' + err.message, 'error');
  }
}

// ✅ LOAD ANALYTICS
async function loadAnalytics() {
  try {
    console.log('📊 Fetching analytics...');
    
    const response = await fetch(`${API_URL}/analytics/stats`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const analytics = await response.json();
    console.log('✅ Analytics loaded:', analytics);

    // Update dashboard
    document.getElementById('totalScans').textContent = analytics.totalScans || 0;
    document.getElementById('qrScans').textContent = analytics.qrScans || 0;
    document.getElementById('imageScans').textContent = analytics.imageScans || 0;
    document.getElementById('visionScans').textContent = analytics.visionApiScans || 0;

    // Most scanned painting
    const mostScanned = document.getElementById('mostScannedPainting');
    if (mostScanned) {
      mostScanned.textContent = analytics.mostScannedPainting || 'None yet';
    }

    // Paintings table
    const paintingsTable = document.getElementById('paintingsTable');
    if (paintingsTable && analytics.paintings) {
      paintingsTable.innerHTML = '';
      
      analytics.paintings.forEach(painting => {
        const row = document.createElement('tr');
        const date = painting.lastScannedAt 
          ? new Date(painting.lastScannedAt).toLocaleDateString() 
          : 'Never';
        
        row.innerHTML = `
          <td>${painting.name}</td>
          <td>${painting.artist}</td>
          <td><strong>${painting.scans || 0}</strong></td>
          <td>${date}</td>
        `;
        paintingsTable.appendChild(row);
      });
    }

    console.log('✅ Analytics displayed');
  } catch (err) {
    console.error('❌ Error loading analytics:', err);
    showToast('❌ Error loading analytics: ' + err.message, 'error');
  }
}

// ✅ EXPORT PAINTINGS AS JSON
function exportPaintings() {
  try {
    fetch(`${API_URL}/paintings/all`)
      .then(r => r.json())
      .then(data => {
        const paintings = Array.isArray(data) ? data : (data.data || []);
        const dataStr = JSON.stringify(paintings, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `paintings_${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        showToast('✅ Paintings exported!', 'success');
      });
  } catch (err) {
    showToast('❌ Error exporting: ' + err.message, 'error');
  }
}

// ✅ Log app status
console.log('🎨 Admin Dashboard Ready');
console.log('📍 Backend URL:', API_URL);
