# Feature decisions log

Every buyer request enters this log with a date, a decision, and a counter.
A "YES" only promotes to "MERGE" once the counter clears **3** and the
4-week acceptance window since v1.0 ship has elapsed.

Use this format:

```
- [YYYY-MM-DD] [YES/NO/ONE-OFF] Request: <verbatim quote>
  Counter: <n>
  Reason: <one line>
  Buyer: <handle>
```

## Seed entries (pre-launch)

- [2026-06-18] [ONE-OFF] Request: "Can we export pages as PDF for client decks?"
  Counter: 1
  Reason: Single buyer request pre-launch; surfaces in Room 2 candidates.
  Buyer: alpha-test

- [2026-06-18] [ONE-OFF] Request: "I'd like to add a guest bookings table"
  Counter: 1
  Reason: Real product concern, but no floor; log only.
  Buyer: alpha-test

- [2026-06-18] [ONE-OFF] Request: "Center the hero, the asymmetric split looks weird"
  Counter: 1
  Reason: Style opinion, not feature.
  Buyer: alpha-test
