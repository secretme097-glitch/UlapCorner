const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('../data.db');
db.all("SELECT name, sql FROM sqlite_master WHERE type='table'", (err, rows) => {
  if (err) console.error(err);
  else console.log(JSON.stringify(rows, null, 2));
});
