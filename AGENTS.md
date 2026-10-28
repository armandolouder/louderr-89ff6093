# Architecture rules

- Read inbox history through an explicit column and presentation-metadata projection; keep raw provider payloads server-side to avoid transferring media-sized JSON on every page while preserving reactions and transcriptions.
- Index both dedicated message provider-ID columns separately for OR lookups; metadata-expression indexes do not support filters on those columns.
- Keep signed-in password changes in the shared account dialog, verify current credentials with signInWithPassword before updateUser (current_password alone is not reliably enforced), and keep recovery password resets separate because recovery sessions do not require it.
- Use the shared logout action for every account exit, checking the auth result and clearing the query cache before login navigation to avoid retaining another account's data.
- Printbee order lookup runs server-side with client-credentials token renewal; authenticated generators create random per-order share IDs, and public reads expose only an explicit tracking projection without recipient contacts or street addresses to prevent sequential-order enumeration and personal-data leakage.