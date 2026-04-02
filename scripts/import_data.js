const fs = require('fs');
const Papa = require('papaparse');
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, addDoc, getDocs, query, orderBy, limit } = require('firebase/firestore');
const config = require('../firebase-applet-config.json');

const app = initializeApp(config);
const db = getFirestore(app);

const CSV_PATH = "/Users/devnegi/Desktop/INVOICES 2026/ICARUS GAUR CITY.csv";

async function importData() {
    console.log("--- ICARUS DATA INGESTION PROTOCOL ACTIVATED ---");
    
    try {
        const fileContent = fs.readFileSync(CSV_PATH, 'utf8');
        const parsed = Papa.parse(fileContent, { header: true, skipEmptyLines: true });
        const rows = parsed.data;

        console.log(`Detected ${rows.length} records for ingestion.`);

        // 1. Get the current highest memberId
        const playersRef = collection(db, 'players');
        const q = query(playersRef, orderBy('memberId', 'desc'), limit(1));
        const snapshot = await getDocs(q);
        
        let lastId = 0;
        if (!snapshot.empty) {
            const lastPlayer = snapshot.docs[0].data();
            const match = lastPlayer.memberId.match(/ICR-(\d+)/);
            if (match) lastId = parseInt(match[1]);
        }
        
        console.log(`Current base index: ${lastId}`);

        // 2. Process rows
        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const nextId = lastId + i + 1;
            const memberId = `ICR-${nextId.toString().padStart(4, '0')}`;

            const player = {
                memberId: memberId,
                fullName: row['Player Name'] || 'Unknown Athlete',
                parentName: row['Billed To Name'] || 'Unknown Parent',
                contactNumber: row['Phone Number'] || 'N/A',
                address: row['Address'] || '',
                venue: row['Training Location'] || 'ICARUS CENTER',
                batch: row['Program'] || 'General Training',
                registeredAt: new Date().toISOString(),
                photoUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(row['Player Name'])}&background=0c4a6e&color=fff`,
                position: 'TBD',
                email: row['Email'] || '',
                notes: `Head Coach: ${row['Head Coach'] || 'N/A'}\nTraining Days: ${row['Days'] || 'N/A'}\nFees Ending: ${row['Fees Ending'] || 'N/A'}`
            };

            await addDoc(playersRef, player);
            console.log(`[SECURED] ${memberId}: ${player.fullName}`);
        }

        console.log("--- DATA INGESTION COMPLETE ---");
        process.exit(0);
    } catch (error) {
        console.error("INGESTION FAILURE:", error);
        process.exit(1);
    }
}

importData();
