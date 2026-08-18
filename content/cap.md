# CAP theorem
order: 3
tint: #F7C7D6
ink: #B84268
blurb: Partitions, trade-offs, and PACELC

id: c2396dd8-28eb-48b2-9233-586f19161ee8
Q: What do the three letters in CAP stand for?
A: Consistency, Availability, Partition tolerance. A distributed system can only guarantee two of the three at once.

id: 0c6c496a-d778-46d4-95e5-dce77a704b06
Q: CAP theorem in one sentence?
A: During a network partition, a distributed system must choose between consistency and availability — it can't have both.

id: 413b6f35-7372-425c-ad31-7af99f7d14a4
Q: Define consistency (in CAP terms).
A: Every read receives the most recent write or an error. All nodes appear to hold one up-to-date value (linearizability).

id: 23ef1803-5bc4-4aaa-a03a-4d95dcb36729
Q: Define availability (in CAP terms).
A: Every request to a non-failing node gets a non-error response — though the data may be stale.

id: 0c82146d-ecca-4ce0-b5db-563c899d384d
Q: Define partition tolerance.
A: The system keeps operating even when network failures split nodes into groups that can't communicate.

id: 5be1fb53-d279-4a95-840c-4b62f1d71386
Q: Why is 'CA' not a real choice for distributed systems?
A: Network partitions are unavoidable in any real network, so P is mandatory. The actual trade-off is only C vs A during a partition.

id: 6852c674-897c-4b5f-9dfa-12a52d93619d
Q: Name some CP systems.
A: ZooKeeper, etcd, HBase, MongoDB (default config), Google Spanner. They refuse or delay requests rather than serve stale data.

id: 7446cea3-adf7-4054-95fb-7b90ff1bf42b
Q: Name some AP systems.
A: Cassandra, DynamoDB (default reads), CouchDB, DNS. They stay responsive and reconcile conflicts later (eventual consistency).

id: 7779d1ef-8450-4e15-b1b4-bf8adaa3c1cf
Q: What is PACELC?
A: If Partition: choose Availability or Consistency. Else (normal operation): choose Latency or Consistency. It covers the trade-off even when the network is healthy.

id: 6b2affe0-a6c5-40ec-b212-48076c66d1a6
Q: When should you choose CP in a system design interview?
A: When stale or conflicting data causes real harm: ticket booking, inventory, payments, auction bids, distributed locks, leader election.

id: 7dbb51f7-d566-4b73-8fb3-2afb2c490487
Q: When should you choose AP?
A: When stale reads are harmless: feeds, like counts, view counters, profiles, analytics. Most systems default to availability.

id: a47e2d41-b5b2-40ce-8c7a-1efb27dfd9df
Q: How does CAP consistency differ from ACID consistency?
A: CAP consistency = linearizable reads across nodes. ACID consistency = database invariants and constraints hold after a transaction. Different concepts sharing a letter.
