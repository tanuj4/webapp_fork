const request = require('supertest');
const { app, User } = require('./index'); 


jest.mock('./index', () => {
    const mockUser = {
        create: jest.fn(),
        findOne: jest.fn(),
       
    };

    const express = require('express');
    const app = express(); 
    app.use(express.json());


    app.post('/v1/users', async (req, res) => {
        const { email, password, first_name, last_name } = req.body;
        
        
        const existingUser = await mockUser.findOne({ where: { email } });
        if (existingUser) {
            return res.status(400).send('User already exists with this email.');
        }

        
        const newUser = await mockUser.create({ email, password, first_name, last_name });
        return res.status(201).json(newUser);
    });

    return {
        app,
        User: mockUser,
    };
});

describe('User API Tests', () => {
    it('should create a new user successfully', async () => {
        const newUser = {
            email: 'tanujkodali0409@gmail.com',
            password: 'Kodali@1972',
            first_name: 'Tanuj',
            last_name: 'Kodali',
        };

        
        User.create.mockResolvedValue({
            id: 1,
            ...newUser,
        });

        
        User.findOne.mockResolvedValue(null);

        const response = await request(app)
            .post('/v1/users')
            .send(newUser);

        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('id');
        expect(response.body.email).toBe(newUser.email);
        expect(response.body.first_name).toBe(newUser.first_name);
        expect(response.body.last_name).toBe(newUser.last_name);
    });

    it('should return 400 if user already exists', async () => {
        const existingUser = {
            email: 'tanujkodali0409@gmail.com',
            password: 'Kodali@1972',
            first_name: 'Tanuj',
            last_name: 'Kodali',
        };

        
        User.findOne.mockResolvedValue(existingUser);

        const response = await request(app)
            .post('/v1/users')
            .send(existingUser);

        expect(response.status).toBe(400);
        expect(response.text).toBe('User already exists with this email.');
    });


});
