const low = require('lowdb');
const FileAsync = require('lowdb/adapters/FileAsync');

const adapter = new FileAsync('db.json');
const db = low(adapter);
db.then((_db: any) => _db.defaults({ rooms: {} }).write());

export default db;
