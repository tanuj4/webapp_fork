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
