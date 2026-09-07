# Idempotency, retries and webhooks
tint: #CAE4F2
blurb: Safe repeats, at-least-once delivery, and the patterns that keep money and SIMs consistent.

id: 5681e508-a033-4cc9-8348-5db28ba40584
Q: What does idempotent mean for an API?
A: Repeating the same request produces the same result and no extra side effects beyond the first successful call.

id: 143cacbe-7300-479b-be28-72d3f55f3501
Q: Which HTTP methods are idempotent by definition?
A: GET, PUT and DELETE. POST is not, which is why create endpoints need explicit idempotency keys.

id: 94db9390-aecb-4970-b05d-acc074459348
Q: What is an idempotency key?
A: A client-generated unique value sent with a request so the server can recognise and replay a retried call.

id: def2748e-452c-4e9d-8c26-986186ba1147
Q: How does a server implement idempotency keys?
A: Store key, request fingerprint and response; on a repeat, return the stored response instead of re-executing.

id: e8c0fb7b-f87b-4f4f-a7b1-9db7eb935b6e
Q: Why store a hash of the request body alongside the key?
A: To reject a key reused with different parameters, which signals a client bug rather than a genuine retry.

id: 9d1295d2-e071-4616-a919-edbe28217b31
Q: How long should idempotency records be kept?
A: Long enough to cover realistic retries — commonly 24 hours — then expired to bound storage growth.

id: f9876d5c-ae49-49e4-94a3-f5143ae782bc
Q: What happens when two identical requests race?
A: The second must block or fail fast; a unique constraint on the key is what actually enforces exactly-one execution.

id: b865ea6d-4e98-4f4d-be41-6d591ad86a3a
Q: Why is exponential backoff with jitter the standard retry policy?
A: Backoff stops retries amplifying an outage; jitter stops every client retrying in the same synchronised wave.

id: 5a9cd35f-8143-4691-9ad7-b4841bd3f2cc
Q: Which failures should you not retry?
A: 4xx client errors other than 429 — the request is wrong, so retrying just burns quota and hides the bug.

id: daff6172-9fed-4c41-a7c5-0c04fd0f29c3
Q: What is the thundering herd problem in retries?
A: A downstream recovers and every waiting client retries at once, knocking it straight back over.

id: 5cf72589-2777-4bc5-921a-6e9a1033f52a
Q: What does a circuit breaker do?
A: After repeated failures it stops calling a dependency for a cooldown, then lets a trial request test recovery.

id: 1bd72dd9-b44b-403f-ab4e-c82818743b25
Q: Why do webhooks use at-least-once delivery?
A: The sender cannot know whether a lost response means the receiver processed the event, so it retries and may duplicate.

id: f4d741c9-8179-40b3-8339-0a4f12d82561
Q: How should a webhook consumer handle duplicates?
A: Treat the event ID as an idempotency key and record processed IDs, so replays are recognised and dropped.

id: 397f95d2-7394-4345-9955-2fa1330b5506
Q: How are webhooks authenticated?
A: An HMAC signature over the raw body with a shared secret, verified before parsing and in constant time.

id: f476c29d-16f6-4dae-8e33-e59dfaeaad04
Q: Why must you verify the signature on the raw body?
A: Parsing and re-serialising changes bytes, so the computed HMAC no longer matches the sender's.

id: c2cd13b2-bc7d-4a7d-a0ce-0c7259c1ab21
Q: How do you prevent webhook replay attacks?
A: Include a timestamp in the signed payload, reject anything outside a short window, and dedupe on event ID.

id: c0c42862-c9aa-47f5-b03b-735a0ae43c70
Q: Why should a webhook handler return 200 immediately?
A: Acknowledge, enqueue, then process asynchronously — slow handlers cause sender timeouts and needless retries.

id: a56aa4f6-1839-4be8-9978-96c0612991de
Q: Can webhook events arrive out of order?
A: Yes. Carry a version or sequence number per resource and ignore an event older than the state you already hold.

id: 9a699e97-94e3-45df-afad-1a939ea041bd
Q: What is the dual-write problem?
A: Committing to your database and publishing an event are separate operations; a crash between them loses one.

id: fda784b2-2b0e-4243-bfee-5ded27c42995
Q: What is the transactional outbox pattern?
A: Write the event to an outbox table in the same transaction, then a relay publishes it after commit.

id: 2cd904d4-318d-4de1-87d1-136e0e1ab1c9
Q: What is a dead letter queue for?
A: Parking messages that failed every retry, so the pipeline keeps moving and failures can be inspected later.

id: 5a15d923-95c3-403b-9779-0c4f4fcceecc
Q: What is a poison message?
A: One that fails deterministically every time — retrying it forever blocks the queue, so it belongs in the DLQ.

id: 43d49e2b-7bc5-4b9f-89f4-0e9023e2d82a
Q: Why is exactly-once delivery a myth in practice?
A: You get at-least-once delivery plus idempotent processing, which yields exactly-once effects.

id: 485b2414-c07f-4702-8f2a-f1213e5cec61
Q: Interview one-liner: how do you make a payment or provisioning flow safe under retries?
A: Idempotency key at the edge, outbox for events, dedupe by event ID at the consumer, DLQ for what still fails.
