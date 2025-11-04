// ============================================
// FIREBASE CONFIGURATION WITH ERROR HANDLING
// ============================================

const firebaseConfig = {
    apiKey: "AIzaSyCcVgXu_aXPGg6tsejr18EfAu8x3jTGEAU",
    authDomain: "museumai-74f2d.firebaseapp.com",
    projectId: "museumai-74f2d",
    storageBucket: "museumai-74f2d.appspot.com",
    messagingSenderId: "412950723265",
    appId: "1:412950723265:web:8e1fbe2e8b89a14c3fb686"
};

console.log("Initializing Firebase...");

try {
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
        console.log("✅ Firebase initialized successfully");
    } else {
        console.log("✅ Firebase already initialized");
    }
} catch (error) {
    console.error("❌ Firebase initialization error:", error);
    showMessage("Firebase initialization failed: " + error.message, "error");
}

const db = firebase.firestore();
console.log("Firestore instance created:", db);

// Store chart instances
let scansChartInstance = null;
let ratingsChartInstance = null;
let dwellChartInstance = null;

// ============================================
// RUN ON PAGE LOAD
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    console.log("Analytics page loaded. Initializing...");
    loadDashboardData();
});

// ============================================
// LOAD ALL DASHBOARD DATA
// ============================================

async function loadDashboardData() {
    try {
        console.log("🔄 Starting to load dashboard data...");
        
        await loadOverallStats();
        console.log("✅ Overall stats loaded");
        
        await loadPaintingStats();
        console.log("✅ Painting stats loaded");
        
        showMessage("Dashboard loaded! ✓", "success");
        
    } catch (error) {
        console.error("❌ Dashboard Error:", error);
        console.error("Error Details:", error.message);
        showMessage("Error: " + error.message, "error");
    }
}

// ============================================
// LOAD OVERALL STATS
// ============================================

async function loadOverallStats() {
    try {
        console.log("📊 Loading overall stats...");
        
        const scansSnapshot = await db.collection('analytics_scans').get();
        console.log("Total Scans documents:", scansSnapshot.size);
        document.getElementById('total-scans').innerText = scansSnapshot.size;

        const ratingsSnapshot = await db.collection('ratings').get();
        console.log("Total Ratings documents:", ratingsSnapshot.size);
        document.getElementById('total-ratings').innerText = ratingsSnapshot.size;

        const feedbackSnapshot = await db.collection('feedback').get();
        console.log("Total Feedback documents:", feedbackSnapshot.size);
        document.getElementById('total-feedback').innerText = feedbackSnapshot.size;

        // Calculate average dwell time
        const dwellSnapshot = await db.collection('analytics_dwell').get();
        console.log("Total Dwell documents:", dwellSnapshot.size);
        
        if (!dwellSnapshot.empty) {
            let totalDwell = 0;
            let count = 0;
            dwellSnapshot.forEach(doc => {
                const dwellTime = doc.data().dwellTimeSeconds || 0;
                totalDwell += dwellTime;
                count++;
                console.log("Dwell doc:", doc.data());
            });
            const avgDwell = (totalDwell / count).toFixed(1);
            console.log("Average dwell time:", avgDwell);
            document.getElementById('avg-dwell').innerText = avgDwell + 's';
        } else {
            document.getElementById('avg-dwell').innerText = '0s';
        }
        
        console.log("✅ Overall stats loaded successfully");
    } catch (error) {
        console.error("❌ Error loading stats:", error);
        throw error;
    }
}

// ============================================
// LOAD PER-PAINTING STATS & CHARTS
// ============================================

async function loadPaintingStats() {
    try {
        console.log("🖼️ Loading painting stats...");
        
        const scansSnapshot = await db.collection('analytics_scans').get();
        console.log("Scans snapshot size:", scansSnapshot.size);
        
        const paintingStats = {};
        
        // Count scans per painting
        scansSnapshot.forEach(doc => {
            const data = doc.data();
            const name = data.paintingName;
            console.log("Processing scan for painting:", name);
            
            if (!paintingStats[name]) {
                paintingStats[name] = {
                    scanCount: 0,
                    avgRating: 0,
                    avgDwell: 0,
                    ratingCount: 0,
                    dwellCount: 0
                };
            }
            paintingStats[name].scanCount++;
        });
        
        console.log("Unique paintings found:", Object.keys(paintingStats).length);
        console.log("Paintings:", Object.keys(paintingStats));
        
        // Get ratings and dwell times for each painting
        const paintingNames = Object.keys(paintingStats);
        
        for (const paintingName of paintingNames) {
            console.log("Processing stats for:", paintingName);
            
            // Get Average Rating
            const ratingsQuery = db.collection('ratings')
                .where('paintingName', '==', paintingName);
            const paintingRatings = await ratingsQuery.get();
            console.log("Ratings found for", paintingName, ":", paintingRatings.size);
            
            if (!paintingRatings.empty) {
                let totalRating = 0;
                paintingRatings.forEach(doc => {
                    const rating = doc.data().rating || 0;
                    totalRating += rating;
                    console.log("Rating:", rating);
                });
                paintingStats[paintingName].avgRating = 
                    (totalRating / paintingRatings.size).toFixed(1);
                paintingStats[paintingName].ratingCount = paintingRatings.size;
            }

            // Get Average Dwell Time
            const dwellQuery = db.collection('analytics_dwell')
                .where('paintingName', '==', paintingName);
            const paintingDwellTimes = await dwellQuery.get();
            console.log("Dwell times found for", paintingName, ":", paintingDwellTimes.size);
            
            if (!paintingDwellTimes.empty) {
                let totalDwell = 0;
                paintingDwellTimes.forEach(doc => {
                    const dwell = doc.data().dwellTimeSeconds || 0;
                    totalDwell += dwell;
                    console.log("Dwell time:", dwell);
                });
                paintingStats[paintingName].avgDwell = 
                    (totalDwell / paintingDwellTimes.size).toFixed(1);
                paintingStats[paintingName].dwellCount = paintingDwellTimes.size;
            }
        }
        
        console.log("Final painting stats:", paintingStats);
        
        // Render everything
        renderCharts(paintingStats);
        renderTable(paintingStats);
        
    } catch (error) {
        console.error("❌ Error loading painting stats:", error);
        throw error;
    }
}

// ============================================
// RENDER CHARTS
// ============================================

function renderCharts(paintingStats) {
    console.log("📈 Rendering charts...");
    
    // Prepare data
    const paintingNames = Object.keys(paintingStats)
        .sort((a, b) => paintingStats[b].scanCount - paintingStats[a].scanCount);
    
    if (paintingNames.length === 0) {
        console.log("No painting names to chart");
        return;
    }
    
    const scans = paintingNames.map(name => paintingStats[name].scanCount);
    const ratings = paintingNames.map(name => paintingStats[name].avgRating || 0);
    const dwell = paintingNames.map(name => paintingStats[name].avgDwell || 0);
    
    console.log("Chart data:", { paintingNames, scans, ratings, dwell });
    
    // Chart colors
    const chartColors = {
        primary: 'rgb(0, 123, 255)',
        primaryBg: 'rgba(0, 123, 255, 0.1)',
        secondary: 'rgb(220, 53, 69)',
        secondaryBg: 'rgba(220, 53, 69, 0.1)',
        tertiary: 'rgb(40, 167, 69)',
        tertiaryBg: 'rgba(40, 167, 69, 0.1)'
    };
    
    // Scans Chart (Bar)
    try {
        const scansCtx = document.getElementById('scansChart').getContext('2d');
        if (scansChartInstance) scansChartInstance.destroy();
        scansChartInstance = new Chart(scansCtx, {
            type: 'bar',
            data: {
                labels: paintingNames,
                datasets: [{
                    label: 'Number of Scans',
                    data: scans,
                    backgroundColor: chartColors.primaryBg,
                    borderColor: chartColors.primary,
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: { 
                    legend: { display: false },
                    title: { display: false }
                },
                scales: { 
                    y: { beginAtZero: true }
                }
            }
        });
        console.log("✅ Scans chart rendered");
    } catch (e) {
        console.error("❌ Error rendering scans chart:", e);
    }
    
    // Ratings Chart (Line)
    try {
        const ratingsCtx = document.getElementById('ratingsChart').getContext('2d');
        if (ratingsChartInstance) ratingsChartInstance.destroy();
        ratingsChartInstance = new Chart(ratingsCtx, {
            type: 'line',
            data: {
                labels: paintingNames,
                datasets: [{
                    label: 'Average Rating',
                    data: ratings,
                    borderColor: chartColors.secondary,
                    backgroundColor: chartColors.secondaryBg,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: chartColors.secondary,
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: { 
                    legend: { display: false },
                    title: { display: false }
                },
                scales: { 
                    y: { min: 0, max: 5 }
                }
            }
        });
        console.log("✅ Ratings chart rendered");
    } catch (e) {
        console.error("❌ Error rendering ratings chart:", e);
    }
    
    // Dwell Time Chart (Radar)
    try {
        const dwellCtx = document.getElementById('dwellChart').getContext('2d');
        if (dwellChartInstance) dwellChartInstance.destroy();
        dwellChartInstance = new Chart(dwellCtx, {
            type: 'radar',
            data: {
                labels: paintingNames,
                datasets: [{
                    label: 'Avg Dwell Time (sec)',
                    data: dwell,
                    borderColor: chartColors.tertiary,
                    backgroundColor: chartColors.tertiaryBg,
                    pointBackgroundColor: chartColors.tertiary,
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: { 
                    legend: { display: false },
                    title: { display: false }
                }
            }
        });
        console.log("✅ Dwell chart rendered");
    } catch (e) {
        console.error("❌ Error rendering dwell chart:", e);
    }
}

// ============================================
// RENDER TABLE
// ============================================

function renderTable(paintingStats) {
    console.log("📋 Rendering table...");
    
    const tableContainer = document.getElementById('table-container');
    
    if (Object.keys(paintingStats).length === 0) {
        console.log("No data to render in table");
        tableContainer.innerHTML = '<p class="loading">No data yet</p>';
        return;
    }
    
    let tableHTML = `
        <table>
            <thead>
                <tr>
                    <th>Painting Name</th>
                    <th>Total Scans</th>
                    <th>Ratings Received</th>
                    <th>Avg Rating</th>
                    <th>Avg Dwell (sec)</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    const sortedPaintings = Object.entries(paintingStats)
        .sort((a, b) => b[1].scanCount - a[1].scanCount);
    
    console.log("Rendering", sortedPaintings.length, "paintings");
    
    sortedPaintings.forEach(([paintingName, stats]) => {
        const avgRatingDisplay = stats.avgRating > 0 ? `${stats.avgRating} ⭐` : 'No ratings';
        const dwellDisplay = stats.avgDwell > 0 ? stats.avgDwell : 'N/A';
        
        console.log("Row:", paintingName, stats);
        
        tableHTML += `
            <tr>
                <td><strong>${paintingName}</strong></td>
                <td>${stats.scanCount}</td>
                <td>${stats.ratingCount}</td>
                <td>${avgRatingDisplay}</td>
                <td>${dwellDisplay}</td>
            </tr>
        `;
    });
    
    tableHTML += `</tbody></table>`;
    tableContainer.innerHTML = tableHTML;
    console.log("✅ Table rendered");
}

// ============================================
// SHOW MESSAGE
// ============================================

function showMessage(text, type) {
    const messageDiv = document.getElementById('analytics-message');
    if (!messageDiv) {
        console.error("Message div not found!");
        return;
    }
    messageDiv.className = type;
    messageDiv.innerText = text;
    
    if (type === 'success') {
        setTimeout(() => {
            messageDiv.innerText = '';
            messageDiv.className = '';
        }, 3000);
    }
}
