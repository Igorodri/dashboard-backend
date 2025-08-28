const express = require('express'); 
const cors = require('cors');
const routes = require('./routes/routes.js'); 

const app = express();  

const corsOptions = {
    origin: ['http://localhost:5173'],  
    credentials: true
};

app.use(cors(corsOptions));

app.use(express.json()); 

app.use('/', routes); 

app.listen(3000, () => {
    console.log("Servidor Rodando na porta: http://localhost:3000");
});
