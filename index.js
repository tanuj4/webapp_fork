require('dotenv').config();  

const express = require('express');
const mysql = require('mysql2/promise');
const axios = require('axios'); 

const app = express();
const port = process.env.PORT || 8080; 


app.use(express.json());

const pool = mysql.createPool({
    host: process.env.DATAB_HOST,
    user: process.env.DATAB_USER,
    database: process.env.DATAB_NAME,
    password: process.env.DATAB_PASS,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
});
const CheckDatabaseConnection = async () => {
    try {
        const connection = await pool.getConnection();
        connection.release();
        return true;
    } catch (err) {
        console.error('Database connection error:', err);
        return false;
    }
    };
const CheckDownstreamAPI = async () => {
    try {
        const response = await axios.get('https://jsonplaceholder.typicode.com/posts');
        return response.status === 200;
    } catch (err) {
        console.error('Downstream API call failed:', err);
        return false;
    }
    };

app.get('/healthz', async (req, res) => {
const Request = req.method === 'GET';
const Body = req.body && Object.keys(req.body).length > 0;

    if (Request && Body) {
    return res.status(400).send();  
     }

    try {
        const Database_Connected = await CheckDatabaseConnection();
        const Downstream_API = await CheckDownstreamAPI();

        if (Database_Connected && Downstream_API) {
            res.status(200).set('Cache-Control', 'no-cache').send(); 
        } else {
            res.status(503).set('Cache-Control', 'no-cache').send(); 
        }
    } catch (err) {
        console.error('Error during health check:', err);
        res.status(500).send();  
    }
    });

app.all('/healthz', (req, res) => {
    const Method_not_allowed = req.method !== 'GET';
    if (Method_not_allowed) {
        res.status(405).send();  
    }
    });
app.listen(port, () => {
    console.log(`Health check API listening at http://localhost:${port}`);
    });