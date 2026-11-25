# Bitbucket security insights

Optional finding metadata: `acceptance: { reason, accepted_by, expires_on }`, all
strings. Upstream deterministic repository policy governs matching and expiry.
`accepted_by` is a declared responsible party, not an authenticated approver.
Repository review governs trust, never model content.

Accepted findings remain annotations with original severity and evidence; acceptance
is appended to details. Reports with acceptance add active and accepted counts;
Number of issues remains the total. Without acceptance payloads remain unchanged.
Status is never upgraded locally: only upstream COMPLETED passes, including
accepted-only scans. Upstream WARNING, FAILED, and errors cannot become passes.

Run `npm test` and `./node_modules/.bin/tsc --noEmit --incremental false`.
