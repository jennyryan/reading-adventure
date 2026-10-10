// Fake values so modules that read env() work in tests. No test talks to a
// real database: anything that would is mocked.
process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
process.env.GROWNUP_PASSCODE = "open-sesame-123";
process.env.SESSION_SECRET = "test-secret-that-is-definitely-32-chars-long";
process.env.HARDCOVER_TOKEN = "";
