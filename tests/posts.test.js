const request = require('supertest');

jest.mock('../database', () => ({
  get: jest.fn(),
  all: jest.fn(),
  run: jest.fn(),
}));

const db = require('../database');
const app = require('../app');

function mockSession(user = { username: 'alice' }) {
  db.get.mockImplementationOnce((_sql, _params, callback) => {
    callback(null, user);
  });
}

describe('blog post routes', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('renders posts for a signed-in user', async () => {
    const posts = [
      { title: 'First post', content: 'Hello blog' },
      { title: 'Second post', content: 'Another entry' },
    ];

    mockSession();
    db.all.mockImplementationOnce((_sql, callback) => {
      callback(null, posts);
    });

    const response = await request(app)
      .get('/')
      .set('Cookie', 'sessionId=alice-session');

    expect(response.status).toBe(200);
    expect(response.text).toContain('First post');
    expect(response.text).toContain('Hello blog');
    expect(response.text).toContain('Second post');
    expect(db.all).toHaveBeenCalledWith(
      'SELECT * FROM posts',
      expect.any(Function)
    );
  });

  it('redirects unauthenticated visitors away from the posts page', async () => {
    const response = await request(app).get('/');

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/auth/login');
    expect(db.all).not.toHaveBeenCalled();
  });

  it('renders the new-post form for a signed-in user', async () => {
    mockSession();

    const response = await request(app)
      .get('/new-post')
      .set('Cookie', 'sessionId=alice-session');

    expect(response.status).toBe(200);
    expect(response.text).toContain('New Post');
  });

  it('inserts a post and redirects for a signed-in user', async () => {
    mockSession();
    db.run.mockImplementationOnce((_sql, _params, callback) => {
      callback(null);
    });

    const response = await request(app)
      .post('/new-post')
      .set('Cookie', 'sessionId=alice-session')
      .type('form')
      .send({ title: 'A new post', content: 'Post body' });

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/');
    expect(db.run).toHaveBeenCalledWith(
      'INSERT INTO posts (title, content) VALUES (?, ?)',
      ['A new post', 'Post body'],
      expect.any(Function)
    );
  });

  it('does not insert a post for an unauthenticated visitor', async () => {
    const response = await request(app)
      .post('/new-post')
      .type('form')
      .send({ title: 'A new post', content: 'Post body' });

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/auth/login');
    expect(db.run).not.toHaveBeenCalled();
  });
});