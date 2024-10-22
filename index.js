require('dotenv').config();  

const express = require('express');
const axios = require('axios'); 
const bcrypt = require('bcrypt');
const basicAuth = require('basic-auth');

const app = express();
const port = process.env.PORT || 8080; 


app.use(express.json());

const { Sequelize, DataTypes } = require('sequelize');

let sequelize;
if (process.env.NODE_ENV === 'test') {

    sequelize = {
        define: () => ({
            create: jest.fn(),
            findOne: jest.fn(),
        }),
        authenticate: jest.fn().mockResolvedValue(true),
        sync: jest.fn().mockResolvedValue(true),
    };
} else {
   
    sequelize = new Sequelize(process.env.DATAB_NAME, process.env.DATAB_USER, process.env.DATAB_PASS, {
        host: process.env.DATAB_HOST,
        dialect: 'mysql',
        port: '3306',
        logging: false
    });
}

const User = sequelize.define('User', {
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
    },
    first_name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    last_name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false
    },
    account_created: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    },
    account_updated: {
        type: DataTypes.DATE,
        defaultValue: null
    }
}, {
    timestamps: false
});


const CheckDatabaseConnection = async () => {
    
    if (process.env.NODE_ENV === 'test') {
        throw new Error('Simulated connection failure');
    }

    try {
        await sequelize.authenticate();
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
    
    const QueryParams = (req, res, next) => {
        if (Object.keys(req.query).length > 0) {
            return res.status(400).send('Query parameters are not allowed.');
        }
        next();
    };
    
    app.use(QueryParams);
    
app.all('/healthz', (req, res) => {
    const Method_not_allowed = req.method !== 'GET';
    if (Method_not_allowed) {
        res.status(405).send();  
    }
    });

const CheckFields = (req) => {
        const { email, password, first_name, last_name } = req.body;
        if (!email || !password || !first_name || !last_name) {
            console.error('All fields are required.');
            return false;
        }
        const Fieldsallowed = ['email', 'password', 'first_name', 'last_name'];
        const Fieldsreceived = Object.keys(req.body);
        const extra = Fieldsreceived.filter(field => !Fieldsallowed.includes(field));
        
        if (extra.length > 0) {
            console.error('Extra fields are not allowed:', extra);
            return false;
        }
    
        return true;
    };


    
const CheckEmail = async (email) => {
        try {
            const existingUser = await User.findOne({ where: { email } });
            if (existingUser) {
                return false;  
            }
            return true;  
        } catch (error) {
            console.error('Error checking email:', error);
            throw new Error('Database error');
        }
    };

    const createUser = async (email, password, first_name, last_name) => {
        try {
            const hashedPassword = await bcrypt.hash(password, 10);
    
            const newUser = await User.create({
                email,
                password: hashedPassword,
                first_name,
                last_name,
            });
    
            const { id } = newUser;
            return { id, email, first_name, last_name };
        } catch (error) {
            console.error('Error creating user:', error);
            throw new Error('Could not create user');
        }
    };
  
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
app.post('/v1/users', async (req, res) => {
        const fieldsValid = CheckFields(req);
        if (!fieldsValid) {
            return res.status(400).send('All fields are required or create only the given fields.');
        }
    
        const { email, password, first_name, last_name } = req.body;

        if (password.length < 8) {
            return res.status(400).send('Password must be at least 8 characters long.');
        }

        if (!emailRegex.test(email)) {
            return res.status(400).send('check the email format.');
        }
    
        try {
            const sameEmail = await CheckEmail(email);
            if (!sameEmail) {
                return res.status(400).send('User already exists with this email.');
            }
    
            const newUser = await createUser(email, password, first_name, last_name);
            return res.status(201).json(newUser);
        } catch (error) {
            console.error('Error in user creation:', error.message);
            return res.status(400).send(error.message);
        }
        
    });

const Authenticateuser = async (req, res, next) => {
        const { authorization } = req.headers;
    
        const credentials = Buffer.from(authorization.split(' ')[1], 'base64').toString('ascii');
        const [email, password] = credentials.split(':');
    
        if (!email || !password) {
            return res.status(401).json({ message: 'Email or password is missing' });
        }
    
        try {
            const user = await User.findOne({ where: { email } });
            if (!user) {
                return res.status(401).json({ message: 'Invalid username' });
            }
    
            const isPasswordValid = await bcrypt.compare(password, user.password);
            if (!isPasswordValid) {
                return res.status(401).json({ message: 'Invalid password' });
            }
    
           
            req.user = user;
            next();
        } catch (error) {
            console.error('Authentication error:', error);
            return res.status(500).json({ message: 'Internal server error' });
        }
    };
    
app.get('/v1/users/self', Authenticateuser, (req, res) => {
        const { id, email, first_name, last_name } = req.user;
        res.status(200).json({ id, email, first_name, last_name });
    });
    
    app.put('/v1/users/self', Authenticateuser, async (req, res) => {
        const { first_name, last_name, password } = req.body;
    
        if (!first_name && !last_name && !password) {
            return res.status(400).send('Nothing to update.');
        }
    
        try {
            let updated = false;
    
            if (first_name && first_name !== req.user.first_name) {
                req.user.first_name = first_name;
                updated = true;
            }
    
            if (last_name && last_name !== req.user.last_name) {
                req.user.last_name = last_name;
                updated = true;
            }
    
            if (password) {
                if (password.trim() === '') {
                    return res.status(400).send('Password must be a non-empty string.');
                }
                if (password.length < 8) {
                    return res.status(400).send('Password must be at least 8 characters long.');
                }
                req.user.password = await bcrypt.hash(password, 10);
                updated = true;
            }
    
            if (updated) {
                req.user.account_updated = new Date();
                await req.user.save();
            } else {
                return res.status(400).send('No changes made.');
            }
    
            const { id, email } = req.user;
            res.status(200).json({ id, email, first_name: req.user.first_name, last_name: req.user.last_name });
        } catch (error) {
            console.error('Error updating user:', error);
            res.status(500).send('Server error.');
        }
    });
    
app.all('/v1/users', (req, res) => {
    const Method_not_allowed2 = req.method !== 'POST';
    if (Method_not_allowed2) {
        res.status(405).send();  
    }
});

app.all('/v1/users/self', (req, res) => {
    const Method_not_allowed3 = req.method !== 'PUT' && req.method !== 'GET';
    if (Method_not_allowed3) {
        res.status(405).send();  
    }
});


app.listen(port, async () => {
        try {
            await sequelize.sync({ force: true });
    console.log(`Health check API listening at http://localhost:${port}`);
        }
        catch (error) {
            console.error('Failed to sync database:', error);
        }
    })

module.exports = { app, sequelize, User };

  
