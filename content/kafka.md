# Kafka
tint: #F0CAF2
blurb: Partitions, consumer groups, and what to say in the interview

id: cb1abdcb-4aee-4c95-99ef-cede9bd2e6e5
Q: What is Kafka, in one line?
A: A distributed event streaming platform - a durable, partitioned, append-only commit log usable as either a message queue or a stream.

id: ef4fcf93-ad99-41d0-96eb-07d5f7343518
Q: Define broker, topic and partition.
A: A broker is a server in the cluster. A topic is a logical stream, split into partitions: ordered, append-only logs spread across brokers. The partition, not the topic, is the unit of parallelism and of ordering.

id: a4a48271-4068-4b53-ba64-e6dfd7d6b633
Q: How does the message key pick a partition?
A: hash(key) % partitions, murmur2 by default, so equal keys stay on one partition and in order. Adding partitions remaps keys. With no key, clients use a sticky partitioner and related messages lose their ordering.

id: a86b124b-728c-4edf-b163-1cc642c93b78
Q: What is an offset?
A: A sequential ID marking a message's position within a partition. Consumers commit offsets so they can resume where they left off after a restart.

id: 8a2d7768-62e9-429f-9ba3-2d76ff4e9fe2
Q: What is a consumer group and what does it guarantee?
A: Consumers sharing a topic's partitions - each partition goes to exactly one consumer in the group. Separate groups read the same topic independently.

id: 680c6804-2035-48ec-b8d3-6172257b73dd
Q: What are share groups (Queues for Kafka)?
A: A second consumer model, GA in Kafka 4.2 (February 2026): consumers in a share group read the same partitions concurrently and acknowledge records one by one. Queue semantics, without one consumer per partition, and without per-key ordering.

id: 84f9936f-ec3d-4568-b570-1094042de155
Q: How is a partition replicated, and what does acks=all buy you?
A: One leader takes writes and followers on other brokers copy it; the in-sync replicas (ISR) are those caught up, and a new leader comes from the ISR. acks=all waits for every ISR member: the strongest durability, at some latency.

id: bc17a2c4-9c7a-4bd0-af19-a0318f321fe4
Q: Watch-outs when using Kafka from a Node/Next.js app?
A: Clients hold long-lived connections and group membership, which fits badly with serverless handlers. Run producers and consumers in a persistent process or behind a REST proxy.

id: eaa802a0-ecf2-48c3-878f-536ef669f2d0
Q: Do consumers push or pull? Why?
A: Pull - consumers poll at their own rate. Slow consumers self-limit, failure handling is simpler, and batching becomes efficient.

id: 25751c6d-d9c6-4617-8089-56c82fb883b8
Q: What ordering guarantee does Kafka actually give?
A: Ordering within a partition only, by offset - not by timestamp, not across a topic. Global ordering means one partition, which means no parallelism.

id: d1d67056-53a0-446c-b8c4-d7cae26371bb
Q: Default delivery semantics, and how do you get exactly-once?
A: At-least-once by default. Exactly-once needs idempotent producers plus the transactional API - usually better to assume duplicates and make consumers idempotent.

id: 1d36be4b-d5d6-4716-9f4d-9fd635bae586
Q: What happens when a consumer crashes?
A: It resumes from its last committed offset on restart, and the group rebalances so remaining consumers pick up the orphaned partitions. Nothing is missed; some work is redone.

id: 7434e18b-9e0a-44c9-a68f-a707c11fcd85
Q: When should you commit the offset?
A: Only after the work is durably done, or you silently drop messages. The more a consumer does per message, the more is redone on failure - so keep consumers small.

id: 25a97ecf-42e8-4aa8-ba63-c8a7312b33f2
Q: How do producer retries work, and what is the gotcha?
A: Producers retry transient failures automatically. Enable idempotent mode alongside retries, or a retried send that actually succeeded becomes a duplicate.

id: 974896ab-58b4-4b7e-868f-3a94f0640776
Q: What does Kafka give you for consumer-side retries?
A: A classic consumer group gives you nothing built in: the pattern is a retry topic, then a dead letter topic after N failures. Share groups (Kafka 4.2) redeliver unacknowledged records and count deliveries, much like SQS.

id: 4c7af18c-4472-466b-aad2-92d49311db66
Q: Two ways to scale Kafka.
A: Add brokers, and partition properly. Brokers alone do nothing if topics are under-partitioned - scale the topic, not just the cluster.

id: b05959f5-ad81-46ec-b997-c665ee61b229
Q: Four ways to fix a hot partition.
A: Drop the key and spread load (losing ordering); salt the key with a random suffix; use a compound key such as ad ID + region; or apply back pressure and slow the producer.

id: f79a2b13-9898-48bb-aef9-9f5bcb2398d3
Q: Why are large payloads an anti-pattern, and what instead?
A: Kafka is not a blob store - big messages hurt memory and network throughput. Write the object to S3 and put a pointer in the message: the claim-check pattern.

id: acac941e-5132-4c0d-a306-4a1484d3376a
Q: How does retention work, and what is log compaction?
A: Messages expire by retention.ms (7 days default) or retention.bytes. Compaction instead keeps the latest value per key forever, making the topic a replayable snapshot.

id: 33a07f7c-24c1-4f16-b95f-a99ed03fad62
Q: What is KRaft?
A: Kafka's own Raft-based metadata quorum, replacing ZooKeeper. Production-ready since 3.3 and ZooKeeper was removed entirely in Kafka 4.0.

id: ea87c892-b2df-4b07-a241-6afd1ffa6504
Q: What is tiered storage (KIP-405)?
A: Brokers keep recent segments on local disk and offload older ones to object storage, so retention is no longer bounded by broker disk. GA in Kafka 3.9.

id: db5ee616-49de-45f0-af4d-07993250f9f4
Q: Two producer-side performance levers?
A: Batching (group records per send to amortize network overhead) and compression (GZIP, Snappy, LZ4). Both trade a little latency for a lot of throughput.

id: 67758d0f-5870-4df6-b488-0094605ddd6a
Q: When do you reach for Kafka as a queue in an interview?
A: Asynchronous work such as transcoding after upload, work that must stay ordered such as a waiting queue, or when producer and consumer must scale independently.

id: b532cdc5-dd3d-4fe5-869d-4b4360ea00c4
Q: When do you reach for it as a stream?
A: Continuous real-time processing, such as aggregating ad clicks as they arrive, or fan-out where many independent consumers need the same messages.
