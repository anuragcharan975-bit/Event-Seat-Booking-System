const request = require('supertest');
const app = require('../app');
const User = require('../models/User');
const { setupTestDatabase, clearDatabase, teardownTestDatabase } = require('./testHelper');

describe('Authentication & Authorization Suite', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterEach(async () => {
    await clearDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  // Test 1 & 2: Registration, Password Hashing, Safe User Response
  it('should successfully register a user and return a safe user object without passwordHash', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Alice Developer',
        email: 'alice@example.com',
        password: 'securePassword123'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
    expect(res.body.user).toBeDefined();
    expect(res.body.user.name).toBe('Alice Developer');
    expect(res.body.user.email).toBe('alice@example.com');
    // Ensure passwordHash is NOT returned to client
    expect(res.body.user.passwordHash).toBeUndefined();
    expect(res.body.user.password).toBeUndefined();

    // Verify password is encrypted in database
    const dbUser = await User.findOne({ email: 'alice@example.com' });
    expect(dbUser).toBeDefined();
    expect(dbUser.passwordHash).toBeDefined();
    expect(dbUser.passwordHash).not.toBe('securePassword123');
    expect(dbUser.passwordHash.startsWith('$2')).toBe(true);
  });

  // Test 3: Duplicate Email Registration
  it('should reject registration with a duplicate email and return HTTP 409', async () => {
    // First registration
    await request(app)
      .post('/api/auth/register')
      .send({
        name: 'First User',
        email: 'duplicate@example.com',
        password: 'password123'
      });

    // Attempt second registration with same email
    const duplicateRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Second User',
        email: 'duplicate@example.com',
        password: 'differentPassword456'
      });

    expect(duplicateRes.status).toBe(409);
    expect(duplicateRes.body.success).toBe(false);
    expect(duplicateRes.body.message).toMatch(/already exists/i);
  });

  // Test 1 & 19: Valid Login and Invalid Credentials
  it('should successfully login an existing user and return a JWT', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Login User',
        email: 'login@example.com',
        password: 'correctPassword123'
      });

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'login@example.com',
        password: 'correctPassword123'
      });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.success).toBe(true);
    expect(loginRes.body.token).toBeDefined();
    expect(loginRes.body.user.email).toBe('login@example.com');
    expect(loginRes.body.user.passwordHash).toBeUndefined();
  });

  it('should reject invalid password with HTTP 401', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Bad Pass User',
        email: 'badpass@example.com',
        password: 'correctPassword123'
      });

    const badPassRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'badpass@example.com',
        password: 'wrongPassword'
      });

    expect(badPassRes.status).toBe(401);
    expect(badPassRes.body.success).toBe(false);
    expect(badPassRes.body.message).toMatch(/invalid email or password/i);
  });

  it('should reject unregistered email with HTTP 401', async () => {
    const unknownRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'notfound@example.com',
        password: 'somePassword123'
      });

    expect(unknownRes.status).toBe(401);
    expect(unknownRes.body.success).toBe(false);
  });

  it('should reject registration when validation fails with HTTP 400', async () => {
    const invalidRes = await request(app)
      .post('/api/auth/register')
      .send({
        name: '',
        email: 'not-an-email',
        password: '123'
      });

    expect(invalidRes.status).toBe(400);
    expect(invalidRes.body.success).toBe(false);
    expect(invalidRes.body.errors).toBeDefined();
  });
});
