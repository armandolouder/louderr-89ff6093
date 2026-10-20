# Architecture rules

- Read inbox history through an explicit column and presentation-metadata projection; keep raw provider payloads server-side to avoid transferring media-sized JSON on every page while preserving reactions and transcriptions.
- Index both dedicated message provider-ID columns separately for OR lookups; metadata-expression indexes do not support filters on those columns.
- Keep signed-in password changes in the shared account dialog with server validation of the current password; keep recovery password resets separate because recovery sessions do not require it.
- Use the shared logout action for every account exit, checking the auth result and clearing the query cache before login navigation to avoid retaining another account's data.