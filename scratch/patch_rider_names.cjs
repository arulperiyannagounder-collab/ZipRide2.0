// Script to add riderName: "Saran" to all completed/cancelled/disputed rides
// that are missing riderName in the zipride_db.json file
const fs = require('fs');
const path = require('path');

const dbPath = path.join('c:/Users/HEMANTH/Downloads/ZipRide', 'zipride_db.json');
const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

const TERMINAL_STATUSES = ['completed', 'cancelled', 'disputed'];

let patched = 0;
db.rides = db.rides.map(ride => {
  if (TERMINAL_STATUSES.includes(ride.status) && !ride.riderName) {
    patched++;
    return { ...ride, riderName: 'Saran' };
  }
  // Also add riderName to any ride that doesn't have one (booked, assigned, etc.)
  if (!ride.riderName) {
    patched++;
    return { ...ride, riderName: 'Saran' };
  }
  return ride;
});

fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf8');
console.log(`Patched ${patched} rides with riderName: 'Saran'`);
console.log('Done!');
