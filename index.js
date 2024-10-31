require('dotenv').config();  

const express = require('express');
const axios = require('axios'); 
const bcrypt = require('bcrypt');
const basicAuth = require('basic-auth');
const StatsD = require('hot-shots'); 
const {CloudWatchClient, PutMetricDataCommand } = require('@aws-sdk/client-cloudwatch'); 
const { S3Client, DeleteObjectCommand } = require('@aws-sdk/client-s3');

const app = express();
const port = process.env.PORT || 8080; 

const multer = require('multer');

const multerS3 = require('multer-s3');
app.use(express.json());

const { Sequelize, DataTypes } = require('sequelize');
const logger = require('./cloudwatchlog');

const statsDClient = new StatsD({ host: 'localhost', port: 8125 });

const cloudwatch = new CloudWatchClient({
    region: process.env.AWS_REGION 
});

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

    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4, 
        primaryKey: true, 
    },
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

const Image = sequelize.define('Image', {
    imageId: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true, 
    },
    id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: User, 
            key: 'id',
        }
    },
    url: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
    },

    file_name: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
    },

    fileType: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
            isIn: [['image/jpeg', 'image/png', 'image/jpg']],
        }
    },
    
    createdAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    },
    updatedAt: {
        type: DataTypes.DATE,
        defaultValue: null
    }
}, {
    timestamps: true, 
});


const s3 = new S3Client({
    region: process.env.AWS_REGION, 
});

const upload = multer({
    storage: multerS3({
        s3: s3,
        bucket: process.env.S3_BUCKET, 
        metadata: (req, file, cb) => {
            cb(null, { fieldName: file.fieldname });
        },
        key: (req, file, cb) => {
            const userId = req.user.id; 
            cb(null, `${userId}/${file.originalname}`);
        }
    }),
});




const sendCloudWatchMetric = async (metricName, value, unit) => {
    const params = {
        MetricData: [
            {
                MetricName: metricName,
                Value: value,
                Unit: unit,
            },
        ],
        Namespace: 'API-Metrics' 
    };

    try {
        const command = new PutMetricDataCommand(params);
        await cloudwatch.send(command);
        console.log(`Successfully sent metrics to CloudWatch: ${metricName} - ${value} ${unit}`);
    } catch (err) {
        logger.error('Error sending metrics to CloudWatch:', err);
    }
};

const CheckDatabaseConnection = async () => {
    
    if (process.env.NODE_ENV === 'test') {
        throw new Error('Simulated connection failure');
    }

    try {
        await sequelize.authenticate();
        return true;
    } catch (err) {
        logger.error('Database connection error:', err);
        return false;
    }
};

const CheckDownstreamAPI = async () => {
    try {
        const response = await axios.get('https://jsonplaceholder.typicode.com/posts');
        return response.status === 200;
    } catch (err) {
        logger.error('Downstream API call failed:', err);
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

        statsDClient.increment('healthcheck.requests');

        if (Database_Connected && Downstream_API) {
            res.status(200).set('Cache-Control', 'no-cache').send(); 
        } else {
            res.status(503).set('Cache-Control', 'no-cache').send(); 
        }
    } catch (err) {
        logger.error('Error during health check:', err);
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
            logger.error('All fields are required.');
            return false;
        }
        const Fieldsallowed = ['email', 'password', 'first_name', 'last_name'];
        const Fieldsreceived = Object.keys(req.body);
        const extra = Fieldsreceived.filter(field => !Fieldsallowed.includes(field));
        
        if (extra.length > 0) {
            logger.error('Extra fields are not allowed:', extra);
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
            logger.error('Error checking email:', error);
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
            logger.error('Error creating user:', error);
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

        const start = Date.now(); 
    
        try {
            const sameEmail = await CheckEmail(email);
            if (!sameEmail) {
                return res.status(400).send('User already exists with this email.');
            }
    
            const newUser = await createUser(email, password, first_name, last_name);

            const duration = Date.now() - start; 
            sendCloudWatchMetric('UserCreationTime', duration, 'Milliseconds'); 
    
            statsDClient.increment('user.creation.requests');

            return res.status(201).json(newUser);
        } catch (error) {
            logger.error('Error in user creation:', error.message);
            return res.status(400).send(error.message);
        }
        
    });

const Authenticateuser = async (req, res, next) => {
    const authorization = req.headers['authorization'];

    if (!authorization) {
        return res.status(401).json({ message: 'Authorization header is missing.' });
    }
    
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
        logger.error('Authentication error:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};
    app.get('/v1/users/self', Authenticateuser, async (req, res) => {
        const start = Date.now();  
    
        const { id, email, first_name, last_name } = req.user;
    
        try {
            statsDClient.increment('user.retrieval.requests'); 
    
            const duration = Date.now() - start;     
            logger.info(`User retrieval duration: ${duration} ms`);        
            sendCloudWatchMetric('UserRetrievalTime', duration, 'Milliseconds'); 
    
            res.status(200).json({ id, email, first_name, last_name }); 
            logger.info('User retrieved successfully');  
    
        } catch (error) {
            logger.error('Error retrieving user information:', error);
            res.status(500).send('Internal server error');
        }
    });
    
    
    app.put('/v1/users/self', Authenticateuser, async (req, res) => {
        const { first_name, last_name, password } = req.body;
    
        if (!first_name && !last_name && !password) {
            return res.status(203).send('Nothing to update.');
        }
        const start = Date.now();
    
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
                const duration = Date.now() - start; 
            sendCloudWatchMetric('UserUpdateTime', duration, 'Milliseconds'); 

           
            statsDClient.increment('user.update.requests');
                
            } else {
                return res.status(203).send('No changes made.');
            }
    
            const { id, email } = req.user;
            res.status(200).json({ id, email, first_name: req.user.first_name, last_name: req.user.last_name });
        } catch (error) {
            logger.error('Error updating user:', error);
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
app.post('/v1/user/self/pic', Authenticateuser, upload.single('profilePic'), async (req, res) => {
    const userId = req.user.id;
    const file = req.file;
    const start = Date.now(); 
    

    if (!file) {
        return res.status(400).json({ message: 'No file uploaded.' });
    }

    const allowedFileTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    if (!allowedFileTypes.includes(file.mimetype)) {
        return res.status(400).json({ message: 'Invalid file type. Only JPEG, PNG, and JPG are allowed.' });
    }

    try {
        app.post('/v1/user/self/pic', Authenticateuser, upload.single('profilePic'), async (req, res) => {
    const userId = req.user.id;
    const file = req.file;

    if (!file) {
        return res.status(400).json({ message: 'No file uploaded.' });
    }

    const allowedFileTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    if (!allowedFileTypes.includes(file.mimetype)) {
        return res.status(400).json({ message: 'Invalid file type. Only JPEG, PNG, and JPG are allowed.' });
    }

    try {
        const existingImage = await Image.findOne({ where: { id: userId } });

        if (existingImage) {
            return res.status(400).json({ message: 'Please delete your existing profile picture before uploading a new one.' });
        } else {
           
            const newImage = await Image.create({
                id: userId,
                url: file.location,
                file_name: file.originalname,
                fileType: file.mimetype,
                createdAt: new Date(),
            });

            const responseData = {
                file_name: newImage.file_name,
                id: newImage.id,
                url: newImage.url,
                upload_date: newImage.createdAt.toISOString().split('T')[0],
                user_id: userId,
            };

            const duration = Date.now() - start; 
            sendCloudWatchMetric('UserImageUploadTime', duration, 'Milliseconds'); 
            statsDClient.increment('user.Image.requests'); 


            return res.status(201).json(responseData); 
        }
    } catch (error) {
        logger.error('Error uploading profile picture:', error);
        res.status(500).json({ message: 'Server error.' });
    }
});

        const existingImage = await Image.findOne({ where: { id: userId } });

        if (existingImage) {
           
            return res.status(400).json({ message: 'Please delete your existing profile picture before uploading a new one.' });
        } else {
           
            const newImage = await Image.create({
                id: userId,
                url: file.location,
                file_name: file.originalname,
                fileType: file.mimetype,
                createdAt: new Date(),
            });

            const responseData = {
                file_name: newImage.file_name,
                id: newImage.id,
                url: newImage.url,
                upload_date: newImage.createdAt.toISOString().split('T')[0],
                user_id: userId,
            };

            return res.status(201).json(responseData); 
        }
    } catch (error) {
        logger.error('Error uploading profile picture:', error);
        res.status(500).json({ message: 'Server error.' });
    }
});


app.get('/v1/user/self/pic', Authenticateuser, async (req, res) => {
    const userId = req.user.id; 
    const start = Date.now(); 
    

   
    const image = await Image.findOne({
        where: { id: userId }
    });

    if (!image) {
        return res.status(404).json({ message: 'No profile image found.' });
    }

    const responseData = {
        file_name: image.file_name,
        id: image.id,
        url: image.url,
        upload_date: image.createdAt.toISOString().split('T')[0],
        user_id: userId
    };

    const duration = Date.now() - start; 
    sendCloudWatchMetric('UserImagegetTime', duration, 'Milliseconds'); 
    statsDClient.increment('user.Image.retrieval.requests'); 

    return res.status(200).json(responseData);
});

app.delete('/v1/user/self/pic', Authenticateuser, async (req, res) => {
    const userId = req.user.id;
    const start = Date.now(); 

    try {
        const image = await Image.findOne({ where: { id: userId } });
        
        if (!image) {
            return res.status(404).json({ message: 'No profile picture found to delete.' });
        }

      
        console.log("Bucket Name:", process.env.S3_BUCKET_NAME);
        console.log("Key:", `${userId}/${image.file_name}`);
        console.log("User ID:", userId);
        console.log("Image File Name:", image.file_name);

        const deleteParams = {
            Bucket: process.env.S3_BUCKET,
            Key: `${userId}/${image.file_name}`,
        };

        try {
            await s3.send(new DeleteObjectCommand(deleteParams));
            logger.info(`Successfully deleted image from S3: ${image.file_name}`);
        } catch (s3Error) {
            logger.error('Error deleting image from S3:', s3Error);
            return res.status(500).json({ message: 'Error deleting image from S3.' });
        }

       

        await image.destroy();

        const duration = Date.now() - start; 
        sendCloudWatchMetric('UserImagedestroyTime', duration, 'Milliseconds'); 
        statsDClient.increment('user.Image.Deletion.requests'); 
        
        return res.status(204).json({ message: 'Profile picture deleted successfully.' });

    } catch (error) {
        logger.error('Error deleting profile picture:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.all('/v1/user/self/pic', (req, res) => {
    res.sendStatus(405); 
});


app.listen(port, async () => {
        try {
            await sequelize.sync({ force: true });
    logger.info(`Health check API listening at http://localhost:${port}`);
        }
        catch (error) {
            logger.error('Failed to sync database:', error);
        }
    })

module.exports = { app, sequelize, User };