// Fake values so modules that read env() work in tests. No test talks to a
// real database: anything that would is mocked.
process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
process.env.HARDCOVER_TOKEN = "";
process.env.GOOGLE_BOOKS_API_KEY = "test-google-key";

// A US time zone, so date tests would catch the UTC "tomorrow" bug.
process.env.TZ = "America/Los_Angeles";
