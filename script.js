document.getElementById('excelFile').addEventListener('change', handleFile, false);

// Globale Variablen für die Diagramm-Instanzen (wichtig für Updates)
let mobilityChart, homeofficeChart, paperChart;

function handleFile(e) {
    const file = e.target.files[0];
    const reader = new FileReader();

    reader.onload = function(e) {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, {type: 'array'});
        
        // Erste Registerkarte der Excel-Datei auslesen
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Daten in JSON-Format umwandeln
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        // Daten für die Diagramme verarbeiten
        processData(jsonData);
    };

    reader.readAsArrayBuffer(file);
}

function processData(data) {
    // 1. Zähler-Objekte für die Kategorien anlegen
    const mobilityCounts = {};
    const homeofficeCounts = {'0': 0, '1': 0, '2': 0, '3': 0, '4': 0, '5': 0};
    const paperCounts = {};

    // 2. Excel-Zeilen durchlaufen und zählen
    data.forEach(row => {
        // Mobilität auslesen (Spaltenüberschrift beachten!)
        const transport = row['Verkehrsmittel Arbeit'] || row['Anfahrt'];
        if (transport) {
            mobilityCounts[transport] = (mobilityCounts[transport] || 0) + 1;
        }

        // Homeoffice auslesen
        const hoDays = String(row['Homeoffice']);
        if (hoDays in homeofficeCounts) {
            homeofficeCounts[hoDays]++;
        }

        // Papierverbrauch auslesen
        const paper = row['Gedruckte Seiten'] || row['Papierverbrauch'];
        if (paper) {
            paperCounts[paper] = (paperCounts[paper] || 0) + 1;
        }
    });

    // 3. Diagramme mit den gezählten Daten erstellen/aktualisieren
    renderCharts(mobilityCounts, homeofficeCounts, paperCounts);
}

function renderCharts(mobilityData, hoData, paperData) {
    // Falls alte Diagramme existieren, löschen (verhindert Grafikfehler beim erneuten Upload)
    if (mobilityChart) mobilityChart.destroy();
    if (homeofficeChart) homeofficeChart.destroy();
    if (paperChart) paperChart.destroy();

    // Mobilitäts-Diagramm (Doughnut / Ring)
    const ctxM = document.getElementById('mobilityChart').getContext('2d');
    mobilityChart = new Chart(ctxM, {
        type: 'doughnut',
        data: {
            labels: Object.keys(mobilityData),
            datasets: [{
                data: Object.values(mobilityData),
                backgroundColor: ['#2c5e43', '#4ca64c', '#8cd98c', '#b3f0b3', '#a3a3a3']
            }]
        }
    });

    // Homeoffice-Diagramm (Bar / Balken)
    const ctxH = document.getElementById('homeofficeChart').getContext('2d');
    homeofficeChart = new Chart(ctxH, {
        type: 'bar',
        data: {
            labels: Object.keys(hoData).map(k => k + ' Tage'),
            datasets: [{
                label: 'Anzahl Mitarbeiter',
                data: Object.values(hoData),
                backgroundColor: '#2c5e43'
            }]
        },
        options: { scales: { y: { beginAtZero: true } } }
    });

    // Papierverbrauch-Diagramm (Pie / Kuchen)
    const ctxP = document.getElementById('paperChart').getContext('2d');
    paperChart = new Chart(ctxP, {
        type: 'pie',
        data: {
            labels: Object.keys(paperData),
            datasets: [{
                data: Object.values(paperData),
                backgroundColor: ['#b3f0b3', '#4ca64c', '#2c5e43', '#d9534f']
            }]
        }
    });
}
