# ACID
order: 4
tint: #BDE8D2
ink: #17805E
blurb: Transactions, isolation levels, and MVCC

id: a9ab7900-2a33-4cf3-a1a0-3c4bddc356e1
Q: What does ACID stand for?
A: Atomicity, Consistency, Isolation, Durability — the four guarantees a database makes about transactions.

id: aa32ce1b-c803-4809-80ce-5c2a5cb72be2
Q: Define atomicity.
A: All or nothing: a transaction either fully completes or fully rolls back. No partial effects are ever visible. It's about failure handling, not concurrency.

id: a8edde0f-ede4-49dc-9499-8cb411e0b520
Q: Define consistency (in ACID terms).
A: Every transaction moves the database from one valid state to another — constraints and invariants (foreign keys, uniqueness, business rules) always hold.

id: 32454677-da46-4056-9302-10893cec3bf9
Q: Define isolation.
A: Concurrent transactions don't interfere with each other. The result is as if they had run one at a time (serially).

id: 5410ca11-cfd3-47c4-bfd2-7097c7e8a960
Q: Define durability.
A: Once committed, data survives crashes and power loss — via write-ahead logging, fsync to disk, and (in distributed databases) replication.

id: 39cc922c-41f3-45a6-832f-fc30048acd8a
Q: Name the four standard isolation levels, weakest to strongest.
A: Read uncommitted, read committed, repeatable read, serializable. Postgres defaults to read committed; MySQL InnoDB to repeatable read.

id: 6c8e6a1f-abf8-4ab3-8a05-807759eea946
Q: What is a dirty read?
A: Reading another transaction's uncommitted changes, which may later roll back. Prevented by read committed and above.

id: d24eab5a-c075-44d5-ac85-a09ca3a28336
Q: Non-repeatable read vs phantom read?
A: Non-repeatable: a row you already read changes between two reads. Phantom: new rows matching your query appear between two reads.

id: fc744d75-c4b3-4a4d-b749-8734cead9a4b
Q: What is a lost update?
A: Two transactions read the same value, both change it, and the second write silently overwrites the first. Prevent it with an atomic UPDATE ... SET x = x + 1, SELECT ... FOR UPDATE, or a version check.

id: 03c178cf-2874-4a1c-b6ba-a3795891702d
Q: What is write skew?
A: Two transactions read overlapping data, then each writes a different row based on it, breaking an invariant neither broke alone, like two doctors both going off call. Only serializable isolation prevents it.

id: 0184b182-5a46-46cb-8174-4d46249f086d
Q: How do databases implement atomicity and durability?
A: The write-ahead log (WAL): changes are appended to a sequential log and fsynced before commit. Crash recovery replays the log — redo committed, undo uncommitted.

id: 372a3838-94f9-4381-ab6c-7096b0959e1e
Q: What is MVCC?
A: Multi-version concurrency control: writers create new row versions instead of overwriting; each transaction reads a consistent snapshot. Readers never block writers.

id: 3dfa95c5-95bb-4b93-a606-fde9ceea3167
Q: What is snapshot isolation?
A: Each transaction reads a consistent snapshot from when it started, and a write conflict aborts the later writer. It stops dirty and non-repeatable reads but still allows write skew; Postgres's repeatable read is snapshot isolation.

id: 8cc8b29f-4119-4de0-ad63-da69fbee2483
Q: Optimistic vs pessimistic concurrency control?
A: Pessimistic locks rows up front and makes others wait. Optimistic proceeds without locks and checks a version at commit, retrying on conflict. Optimistic wins when conflicts are rare; pessimistic when they're common.

id: 2b6fdefc-99f3-4b1a-9ce5-0f9d9d72f4b1
Q: What is BASE and how does it contrast with ACID?
A: Basically Available, Soft state, Eventually consistent — the availability-first model of AP systems, trading strict guarantees for uptime and scale.

id: 166d2baf-03bc-4afd-8231-ed04bebb7414
Q: Which ACID property is the 'odd one out' and why?
A: Consistency. A, I, and D are pure database mechanisms; C is a joint responsibility — the application defines what 'valid' means, the database only enforces declared constraints.
