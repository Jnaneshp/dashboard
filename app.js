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

  // Image preview
  const imageInput = document.getElementById('painting-image');
  if (imageInput) {
    imageInput.addEventListener('change', handleImagePreview);
  }
  
  // Load paintings on start
  loadPaintings();
});

// ✅ HANDLE IMAGE PREVIEW
function handleImagePreview(e) {
  const file = e.target.files[0];
  if (!file) return;

  // Validate size (max 2MB)
  if (file.size > 2 * 1024 * 1024) {
    alert('❌ Image too large (max 2MB)');
    e.target.value = '';
    return;
  }

  // Show preview
  const reader = new FileReader();
  reader.onload = (event) => {
    const previewContainer = document.getElementById('image-preview');
    const img = document.getElementById('preview-img');
    if (img && previewContainer) {
      img.src = event.target.result;
      img.style.display = 'block';
    }
  };
  reader.readAsDataURL(file);
  
  console.log('✅ Image selected:', file.name);
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
      alert('❌ Please fill all fields (name, artist, description)');
      return;
    }

    if (!imageFile) {
      alert('❌ Please select an image');
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
      alert('✅ Painting added successfully with image!');
      document.getElementById('paintingForm').reset();
      
      // Clear image preview
      const img = document.getElementById('preview-img');
      if (img) img.style.display = 'none';
      
      // Reload paintings list
      await new Promise(resolve => setTimeout(resolve, 500));
      loadPaintings();
      
      // Switch to paintings view
      showSection('paintings');
    } else {
      alert('❌ Error: ' + (data.error || 'Unknown error'));
    }
  } catch (err) {
    console.error('❌ Error:', err);
    alert('❌ Error: ' + err.message);
    
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
      alert('❌ Please enter painting name and artist first');
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
      genBtn.textContent = '✨ Generate with Gemini';
    }

    if (data.success) {
      document.getElementById('description').value = data.description;
      alert('✅ Description generated!');
    } else {
      alert('❌ Error: ' + (data.error || 'Failed to generate'));
    }
  } catch (err) {
    console.error('❌ Gemini Error:', err);
    alert('❌ Error: ' + err.message);
    
    const genBtn = document.getElementById('generateBtn');
    if (genBtn) {
      genBtn.disabled = false;
      genBtn.textContent = '✨ Generate with Gemini';
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
    alert('❌ All fields required');
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
      alert('✅ Painting updated!');
      loadPaintings();
    } else {
      alert('❌ Error: ' + (data.error || 'Failed to update'));
    }
  } catch (err) {
    console.error('❌ Edit Error:', err);
    alert('❌ Error: ' + err.message);
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
      alert('✅ Painting deleted!');
      loadPaintings();
    } else {
      alert('❌ Error: ' + (data.error || 'Failed to delete'));
    }
  } catch (err) {
    console.error('❌ Delete Error:', err);
    alert('❌ Error: ' + err.message);
  }
}

// ✅ DOWNLOAD QR CODE
function downloadQR(qrCode, paintingName) {
  try {
    if (!qrCode) {
      alert('❌ QR code not available');
      return;
    }

    const link = document.createElement('a');
    link.href = qrCode;
    link.download = `${paintingName.replace(/\s+/g, '_')}_qr.png`;
    link.click();
    console.log('✅ QR downloaded:', paintingName);
  } catch (err) {
    console.error('❌ Download Error:', err);
    alert('❌ Error: ' + err.message);
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
    alert('❌ Error loading analytics: ' + err.message);
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
        alert('✅ Paintings exported!');
      });
  } catch (err) {
    alert('❌ Error exporting: ' + err.message);
  }
}

// ✅ Log app status
console.log('🎨 Admin Dashboard Ready');
console.log('📍 Backend URL:', API_URL);
