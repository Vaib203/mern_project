const express = require('express');
const connectDB = require('./utils/db');
const transactionRoutes = require('./routes/transactionRoutes');

const app = express();
const PORT = 5000;

connectDB();

app.use(express.json());
app.use('/api', transactionRoutes);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
