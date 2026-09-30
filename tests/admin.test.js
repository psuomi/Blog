const request = require('supertest');

jest.mock('../database', () => ({
  get: jest.fn(),
  all: jest.fn(),
  run: jest.fn(),
}));

const db = require('../database');
const app = require('../app');

describe('GET /admin', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 403 when no user is signed in', async () => {
    const response = await request(app).get('/admin');

    expect(response.status).toBe(403);
    expect(response.text).toBe('Access denied');
    expect(db.get).not.toHaveBeenCalled();
  });

  it('returns 403 for a signed-in non-admin', async () => {
    db.get.mockImplementationOnce((_sql, _params, callback) => {
      callback(null, { username: 'writer' });
    });

    const response = await request(app)
      .get('/admin')
      .set('Cookie', 'sessionId=writer-session');

    expect(response.status).toBe(403);
    expect(response.text).toBe('Access denied');
  });

  it('renders the admin page for the admin user', async () => {
    db.get.mockImplementationOnce((_sql, _params, callback) => {
      callback(null, { username: 'admin' });
    });

    const response = await request(app)
      .get('/admin')
      .set('Cookie', 'sessionId=admin-session');

    expect(response.status).toBe(200);
    expect(response.text).toMatch(/Admin Page/);
  });
});