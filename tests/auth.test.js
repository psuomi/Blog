const request = require('supertest');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

jest.mock('../database', () => ({
  get: jest.fn(),
  all: jest.fn(),
  run: jest.fn(),
}));

const db = require('../database');
const app = require('../app');

const passwordHash = bcrypt.hashSync('correct-password', 4);

function mockUser(user) {
  db.get.mockImplementationOnce((_sql, _params, callback) => {
    callback(null, user);
  });
}

describe('POST /auth/login', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('sets a session cookie and redirects for valid credentials', async () => {
    mockUser({ username: 'alice', password: passwordHash });
    db.run.mockImplementationOnce((_sql, _params, callback) => {
      callback(null);
    });

    const response = await request(app)
      .post('/auth/login')
      .type('form')
      .send({ username: 'alice', password: 'correct-password' });

    const expectedSessionId = crypto
      .createHash('sha256')
      .update('alice')
      .digest('hex');

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/');
    expect(response.headers['set-cookie'][0]).toContain(
      `sessionId=${expectedSessionId}`
    );
    expect(response.headers['set-cookie'][0]).toMatch(/HttpOnly/i);
    expect(db.run).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE users SET sessionId'),
      [expectedSessionId, 'alice'],
      expect.any(Function)
    );
  });

  it('renders an error for an incorrect password', async () => {
    mockUser({ username: 'alice', password: passwordHash });

    const response = await request(app)
      .post('/auth/login')
      .type('form')
      .send({ username: 'alice', password: 'wrong-password' });

    expect(response.status).toBe(200);
    expect(response.text).toContain('Invalid username or password');
    expect(db.run).not.toHaveBeenCalled();
  });

  it('renders an error when the username does not exist', async () => {
    mockUser(undefined);

    const response = await request(app)
      .post('/auth/login')
      .type('form')
      .send({ username: 'unknown', password: 'some-password' });

    expect(response.status).toBe(200);
    expect(response.text).toContain('Invalid username or password');
    expect(db.run).not.toHaveBeenCalled();
  });
});

describe('POST /auth/register', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('creates a user with a hashed password and redirects to login', async () => {
    db.get.mockImplementationOnce((_sql, _params, callback) => {
      callback(null, undefined);
    });
    db.run.mockImplementationOnce((_sql, _params, callback) => {
      callback(null);
    });

    const response = await request(app)
      .post('/auth/register')
      .type('form')
      .send({ username: 'alice', password: 'secret-password' });

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/auth/login');

    const insertArgs = db.run.mock.calls[0][1];
    expect(insertArgs[0]).toBe('alice');
    expect(bcrypt.compareSync('secret-password', insertArgs[1])).toBe(true);
    expect(insertArgs[1]).not.toBe('secret-password');
    expect(insertArgs[2]).toBe(0);
  });

  it('does not insert a duplicate username', async () => {
    db.get.mockImplementationOnce((_sql, _params, callback) => {
      callback(null, { username: 'alice' });
    });

    const response = await request(app)
      .post('/auth/register')
      .type('form')
      .send({ username: 'alice', password: 'secret-password' });

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/auth/login');
    expect(db.run).not.toHaveBeenCalled();
  });
});

describe('GET /auth/logout', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('clears the session cookie and redirects to login', async () => {
    const response = await request(app).get('/auth/logout');

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/auth/login');
    expect(response.headers['set-cookie'][0]).toContain('sessionId=;');
  });
});