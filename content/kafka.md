# Kafka
tint: #F0CAF2
blurb: Partitions, consumer groups, and what to say in the interview

id: cb1abdcb-4aee-4c95-99ef-cede9bd2e6e5
Q: What is Kafka, in one line?
A: A distributed event streaming platform - a durable, partitioned, append-only commit log usable as either a message queue or a stream.
id: ef4fcf93-ad99-41d0-96eb-07d5f7343518
Q: Define broker, partition and topic.
A: A broker is a server in the cluster. A partition is an ordered, immutable, append-only log on a broker. A topic is a logical grouping of partitions.
id: 8271ae2f-f90f-435e-a468-2fc34531cb64
Q: Topic vs partition - the actual difference?
A: A topic is a logical grouping; a partition is the physical one. Partitions are the unit of parallelism and the only place ordering is guaranteed.
id: afe12183-dcaf-40d6-800c-74654f19c720
Q: What are the fields of a Kafka message?
A: Value (payload), key, timestamp and headers - all technically optional. Headers are key-value metadata, like HTTP headers.
id: a4a48271-4068-4b53-ba64-e6dfd7d6b633
Q: What does the message key do, and what if you omit it?
A: It is hashed to pick the partition, so equal keys stay together and stay ordered. With no key, modern clients use a sticky partitioner and you lose related-message ordering.
id: a86b124b-728c-4edf-b163-1cc642c93b78
Q: What is an offset?
A: A sequential ID marking a message's position within a partition. Consumers commit offsets so they can resume where they left off after a restart.
id: 8a2d7768-62e9-429f-9ba3-2d76ff4e9fe2
Q: What is a consumer group and what does it guarantee?
A: Consumers sharing a topic's partitions - each partition goes to exactly one consumer in the group. Separate groups read the same topic independently.
id: 61dcc3d1-2774-4860-86ff-b8e0367f1445
Q: Kafka as a message queue vs as a stream?
A: Same mechanics, different consumption pattern: a queue has one consumer per message; a stream retains the log for replay and multiple independent groups.
id: 7fa0f7f4-9e5d-45dd-b961-a3a02d99ffc3
Q: What two steps happen when a producer publishes?
A: Partition determination (hash the key, or default partitioner), then broker assignment - the client uses cluster metadata to reach that partition's leader.
id: 40a7e1f8-7363-4df3-837d-6b2591ca6669
Q: Why is an append-only log the right structure?
A: Immutability simplifies replication and recovery, appending avoids disk seeks, and the simplicity makes scaling by adding partitions straightforward.
id: f23f1aaa-a870-4d52-b50b-cf4a809bc7ee
Q: How does Kafka replicate a partition?
A: Leader-follower: one replica takes writes, followers on other brokers sync passively. The controller promotes an in-sync follower when a leader dies.
id: 84f9936f-ec3d-4568-b570-1094042de155
Q: What is the ISR, and what does acks=all buy you?
A: In-sync replicas are the followers fully caught up. acks=all acknowledges only once every ISR has the message - strongest durability, at the cost of latency.
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
A: Nothing built in, unlike SQS. The pattern is a retry topic consumed separately, then a dead letter queue after N failures - a fair reason to pick SQS for simple worker queues.
id: 6e26d304-6252-4cb5-b713-e5e8f6e1ea39
Q: Rough single-broker capacity for back-of-envelope maths?
A: Very hand-wavy, but ~1TB storage and up to ~1M messages/sec on good hardware, with messages under ~1MB. Below that, scaling is not the conversation.
id: 4c7af18c-4472-466b-aad2-92d49311db66
Q: Two ways to scale Kafka.
A: Add brokers, and partition properly. Brokers alone do nothing if topics are under-partitioned - scale the topic, not just the cluster.
id: 4305bd52-29cc-4a84-8e67-d74b43e45950
Q: How is a partition chosen from a key?
A: partition = hash(key) % num_partitions, murmur2 by default. Changing the partition count therefore reshuffles which partition a key maps to.
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
A: Batching (group records per send to amortise network overhead) and compression (GZIP, Snappy, LZ4). Both trade a little latency for a lot of throughput.
id: 67758d0f-5870-4df6-b488-0094605ddd6a
Q: When do you reach for Kafka as a queue in an interview?
A: Asynchronous work such as transcoding after upload, work that must stay ordered such as a waiting queue, or when producer and consumer must scale independently.
id: b532cdc5-dd3d-4fe5-869d-4b4360ea00c4
Q: When do you reach for it as a stream?
A: Continuous real-time processing, such as aggregating ad clicks as they arrive, or fan-out where many independent consumers need the same messages.
id: 161ffec7-8ec2-4585-8199-5d9bb3b70f79
Q: "Always available, sometimes consistent" - so what?
A: Replication and leader failover make cluster-wide outage an unrealistic premise; redirect the question. The interesting failure is a consumer dying.
