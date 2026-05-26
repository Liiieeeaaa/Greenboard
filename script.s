document.getElementById('excelFile').addEventListener('change', handleFile, false);

function handleFile(e) {
    const file = e.target.files[0];
    const reader = new FileReader();

    reader.onload = function(e) {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, {type: 'array'});
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        processData(jsonData);
    };

    reader.readAsArrayBuffer(file);
}

function processData(data) {
    const mobilityCounts = {};
    const homeofficeCounts = {'0': 0, '1': 0, '2': 0, '3': 0, '4': 0, '5': 0};
    const paperCounts = {};

    data.forEach(row => {
        // Anfahrt
        const transport = row['Verkehrsmittel Arbeit'] || row['Anfahrt'];
        if (transport) {
            mobilityCounts[transport] = (mobilityCounts[transport] || 0) + 1;
        }

        // Homeoffice
        const hoDays = String(row['Homeoffice']);
        if (hoDays in homeofficeCounts) {
            homeofficeCounts[hoDays]++;
        }

        // Papier
        const paper = row['Gedruckte Seiten'] || row['Papierverbrauch'];
        if (paper) {
            paperCounts[paper] = (paperCounts[paper] || 0) + 1;
        }
    });

    renderCharts(mobilityCounts, homeofficeCounts, paperCounts);
}

function renderCharts(mobilityData, hoData, paperData) {
    // Chart 1: Mobilität
    new Chart(document.getElementById('mobilityChart'), {
        type: 'doughnut',
        data: {
            labels: Object.keys(mobilityData),
            datasets: [{
                data: Object.values(mobilityData),
                backgroundColor: ['#4CAF50', '#2196F3', '#FF9800', '#E91E63', '#9C27B0']
            }]
        }
    });

    // Chart 2: Homeoffice
    new Chart(document.getElementById('homeofficeChart'), {
        type: 'bar',
        data: {
            labels: Object.keys(hoData).map(k => k + ' Tage'),
            datasets: [{
                label: 'Mitarbeiter',
                data: Object.values(hoData),
                backgroundColor: '#4CAF50'
            }]
        },
        options: { scales: { y: { beginAtZero: true } } }
    });

    // Chart 3: Papier
    new Chart(document.getElementById('paperChart'), {
        type: 'pie',
        data: {
            labels: Object.keys(paperData),
            datasets: [{
                data: Object.values(paperData),
                backgroundColor: ['#FFEB3B', '#4CAF50', '#FF5722', '#9E9E9E']
            }]
        }
    });
}
