import mongoose from 'mongoose';
import LoanApplication from './src/models/LoanApplication.js';

mongoose.connect('mongodb://localhost:27017/zerocom_db')
  .then(async () => {
    const apps = await LoanApplication.find();
    console.log("Total Apps:", apps.length);
    apps.forEach(app => {
      console.log(`Token: ${app.token}, DocsCount: ${app.documents ? app.documents.length : 0}`);
    });
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
