const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/photos', require('./routes/photos'));

app.listen(PORT, () => {
  console.log(`Travel Album running at http://localhost:${PORT}`);
});
