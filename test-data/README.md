# Test Data

These fixtures are intended for repeatable local smoke testing.

Files ending in `.template.json` or `.template.csv` contain placeholder tokens
such as `__TXN_ID__` and `__CSV_TXN_ID__`. The automated smoke runner replaces
those placeholders with unique values on each run so duplicate-key conflicts do
not break repeated tests.

Recommended usage:
```bash
npm run test:smoke:api
```

If you want to use the fixtures manually, copy them to a temp file and replace
the placeholder tokens before calling the API.
