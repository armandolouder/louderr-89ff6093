# Architecture rules

- Read inbox history through an explicit column and presentation-metadata projection; keep raw provider payloads server-side to avoid transferring media-sized JSON on every page while preserving reactions and transcriptions.
- Index both dedicated message provider-ID columns separately for OR lookups; metadata-expression indexes do not support filters on those columns.