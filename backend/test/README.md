# Testing Guide

## Running Tests

Install test dependencies:
```bash
npm install --save-dev jest supertest @types/jest
```

Configure Jest in `package.json`:
```json
"jest": {
  "testEnvironment": "node",
  "testMatch": ["**/test/**/*.test.js"]
}
```

Run tests:
```bash
npm test
```

Run specific test file:
```bash
npm test -- integration/contracts.test.js
```

## Test Coverage

Currently includes:
- **Contracts**: Create, list, get, validation
- **Payments**: Filter overdue, filter upcoming, export CSV
- **Validation**: Negative test cases for invalid inputs

## Adding More Tests

1. Create test files in `test/integration/` directory
2. Import `app` from `src/app.js`
3. Use `supertest` for HTTP assertions
4. Clean up database in `afterAll` hook

Example:
```javascript
import request from 'supertest';
import app from '../../src/app.js';

test('GET /api/endpoint - description', async () => {
  const res = await request(app)
    .get('/api/endpoint')
    .set('Authorization', `Bearer ${token}`);
  
  expect(res.status).toBe(200);
});
```
