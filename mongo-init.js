// mongo-init.js  – runs once when the MongoDB container is first created
// Creates the database and seeds the compound indexes.
// (NestJS Mongoose will also create them on startup, this is a belt-and-
//  suspenders approach for production environments.)

db = db.getSiblingDB('upi_fraud_detection');

db.createCollection('transactions');

db.transactions.createIndex({ txnId: 1 }, { unique: true });
db.transactions.createIndex({ senderId: 1, createdAt: -1 });
db.transactions.createIndex({ riskLevel: 1, createdAt: -1 });
db.transactions.createIndex({ status: 1, riskLevel: 1 });
db.transactions.createIndex({ transactionTime: -1 });

print('MongoDB init complete – upi_fraud_detection database ready');