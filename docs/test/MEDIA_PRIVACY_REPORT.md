# Media-Privacy Report (T-21, SRS 3.5.1)

| | |
|---|---|
| **Date** | 2026-11-26 |
| **Environment** | Live app https://muz-dawgz.vercel.app/ (`main` @ `b32f3e1`) |
| **Tester** | Project owner (A), signed-in test account |
| **Method** | DevTools → Network during a camera + microphone practice drill |

## Results

| Guide step | Check | Result | Notes |
|---|---|---|---|
| 5 | Only expected hosts and file types (site assets, `.wasm`, `.task`, Supabase REST/Auth) | **PASS (as reported)** | Owner reported no audio or video uploaded. Host list not attached. |
| 6 | No large POST/PATCH bodies; Supabase payloads only numbers, ids, short text | **PASS (as reported)** | "None uploaded." |
| 7 | No WebSockets | Not recorded | — |
| 8 | Skeleton and chord detection keep working with the network set to Offline | **Not run** | Re-run when convenient; this also covers SRS 3.7.4 |

No HAR file was saved to the repository (`git ls-files "*.har"` is empty).

## Open
- Steps 7 and 8: a 5-minute re-run on the release build.
- Attach a redacted host list (host, path, method, status, size, type; no headers, tokens or emails) if the panel asks for evidence.
