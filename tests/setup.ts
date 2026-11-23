// Fake values so modules that read env() work in tests. No test talks to a
// real database: anything that would is mocked.
process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
process.env.HARDCOVER_TOKEN = "";

// A US time zone, so date tests would catch the UTC "tomorrow" bug.
process.env.TZ = "America/Los_Angeles";
