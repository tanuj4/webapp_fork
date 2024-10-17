const request = require('supertest');
const { app, sequelize, User } = require('./index');
const bcrypt = require('bcrypt');

beforeAll(async () => {
    await sequelize.sync({ force: true });
});

afterAll(async () => {
    await sequelize.close();
});

afterEach(async () => {
    await User.destroy({ where: {}, truncate: true });
});

describe('Database Connection Test:', () => {
    it('should connect to the database successfully', async () => {
        try {
            await sequelize.authenticate();
            expect(true).toBe(true); 
        } catch (err) {
            expect(err).toBeNull(); 
        }
    });
});

describe('User Registration Tests:', () => {
    const userData = {
        email: 'tanujkodali0409@gmail.com',
        password: 'kodali@1972',
        first_name: 'Tanuj',
        last_name: 'kodali'
    };

    it('POST /v1/users should create a new user and return 201', async () => {
        const response = await request(app).post('/v1/users').send(userData);
        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('id');
        expect(response.body.email).toBe(userData.email);
    });

    it('POST /v1/users should return 400 for existing email', async () => {
        await request(app).post('/v1/users').send(userData);
        const response = await request(app).post('/v1/users').send(userData);
        expect(response.status).toBe(400);
        expect(response.text).toBe('User already exists with this email.');
    });
});

describe('Authentication and User Data Tests:', () => {
    const userData = {
        email: 'tanujkodali0409@gmail.com',
        password: 'kodali@1972', 
        first_name: 'Tj',
        last_name: 'kodali'
    };

    beforeAll(async () => {
        await request(app).post('/v1/users').send(userData);
    });

    it('GET /v1/users/self should return user data when authenticated', async () => {
        const response = await request(app)
            .get('/v1/users/self')
            .auth(userData.email, userData.password);
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('id');
        expect(response.body.email).toBe(userData.email);
    });

    it('GET /v1/users/self should return 401 for invalid credentials', async () => {
        const response = await request(app)
            .get('/v1/users/self')
            .auth('invalid@example.com', 'wrongpassword');
        expect(response.status).toBe(401);
        expect(response.body).toHaveProperty('message', 'Invalid username');
    });    
});
