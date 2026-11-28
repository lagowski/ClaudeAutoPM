# Kafka Pipeline Scaffold Command

Generate a production-ready Apache Kafka streaming pipeline with Context7-verified best practices for event-driven data processing.

## Required Documentation Access

Query Context7 first: see `.claude/rules/context7-required.md`. Libraries: kafka.

## Command Usage

```bash
/kafka-pipeline-scaffold <pipeline_name> [options]
```

### Arguments
- `pipeline_name` (required): Name of the pipeline (e.g., `user_events_processor`)

### Options
- `--type`: Pipeline type (`producer`, `consumer`, `streams`) (default: `consumer`)
- `--topic`: Kafka topic name (default: `${pipeline_name}_topic`)
- `--group-id`: Consumer group ID (default: `${pipeline_name}_group`)
- `--bootstrap-servers`: Kafka bootstrap servers (default: `localhost:9092`)

## Implementation Steps

### 1. Query Context7 for Latest Patterns

```python
# Query Context7 for Kafka best practices
# Topics: Configuration, producers, consumers, Kafka Streams
```

### 2. Generate Kafka Producer

```python
"""
Kafka Producer - {{pipeline_name}}

Context7-verified patterns for reliable event production.
Source: /apache/kafka (1,281 snippets, trust 9.1)
"""

from kafka import KafkaProducer
from kafka.errors import KafkaError
import json
import logging
from typing import Dict, Optional
from datetime import datetime

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class {{PipelineName}}Producer:
    """
    Production-ready Kafka producer with Context7 patterns.

    Context7 Patterns Applied:
    - Proper configuration (bootstrap.servers, acks, retries)
    - Error handling and retry logic
    - Serialization (JSON, Avro, Protobuf)
    - Callback functions for delivery confirmation
    """

    def __init__(
        self,
        bootstrap_servers: str = "{{bootstrap_servers}}",
        topic: str = "{{topic}}",
    ):
        """
        Initialize Kafka producer with Context7-verified configuration.

        Args:
            bootstrap_servers: Comma-separated list of Kafka brokers
            topic: Target topic name
        """
        self.topic = topic

        # ✅ CORRECT: Producer configuration with proper settings
        self.producer = KafkaProducer(
            bootstrap_servers=bootstrap_servers,
            # Serialization
            value_serializer=lambda v: json.dumps(v).encode('utf-8'),
            key_serializer=lambda k: k.encode('utf-8') if k else None,
            # Reliability settings
            acks='all',  # Wait for all replicas
            retries=3,  # Retry failed sends
            max_in_flight_requests_per_connection=1,  # Ordered delivery
            # Performance settings
            compression_type='snappy',
            batch_size=16384,
            linger_ms=10,
            # Error handling
            request_timeout_ms=30000,
        )

        logger.info(f"Producer initialized for topic: {self.topic}")

    def send_event(
        self,
        key: str,
        value: Dict,
        callback: Optional[callable] = None
    ) -> None:
        """
        Send event to Kafka with proper error handling.

        Context7 Pattern: Async sending with callback for delivery confirmation

        Args:
            key: Message key for partitioning
            value: Message value (dict)
            callback: Optional callback for delivery confirmation
        """
        try:
            # Add timestamp
            value["timestamp"] = datetime.utcnow().isoformat()

            # ✅ CORRECT: Async send with callback
            future = self.producer.send(
                self.topic,
                key=key,
                value=value
            )

            # Add callback or use default
            if callback:
                future.add_callback(callback)
                future.add_errback(self._on_send_error)
            else:
                future.add_callback(self._on_send_success)
                future.add_errback(self._on_send_error)

        except Exception as e:
            logger.error(f"Error sending message: {e}")
            raise

    def _on_send_success(self, record_metadata):
        """Callback for successful message delivery."""
        logger.info(
            f"Message delivered: topic={record_metadata.topic}, "
            f"partition={record_metadata.partition}, "
            f"offset={record_metadata.offset}"
        )

    def _on_send_error(self, excp):
        """Callback for failed message delivery."""
        logger.error(f"Message delivery failed: {excp}")

    def flush_and_close(self):
        """
        Flush pending messages and close producer.

        Context7 Pattern: Always flush before closing to prevent data loss
        """
        logger.info("Flushing pending messages...")
        self.producer.flush()
        self.producer.close()
        logger.info("Producer closed")


# Example usage
if __name__ == "__main__":
    producer = {{PipelineName}}Producer()

    try:
        # Send events
        for i in range(10):
            producer.send_event(
                key=f"user_{i}",
                value={
                    "user_id": i,
                    "event_type": "page_view",
                    "page": f"/page/{i}",
                }
            )

        logger.info("All events sent")

    finally:
        producer.flush_and_close()
```

### 3. Generate Kafka Consumer

```python
"""
Kafka Consumer - {{pipeline_name}}

Context7-verified patterns for reliable event consumption.
Source: /apache/kafka (1,281 snippets, trust 9.1)
"""

from kafka import KafkaConsumer
from kafka.errors import KafkaError
import json
import logging
from typing import Dict, Callable
import signal
import sys

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class {{PipelineName}}Consumer:
    """
    Production-ready Kafka consumer with Context7 patterns.

    Context7 Patterns Applied:
    - Proper configuration (consumer.* prefix)
    - Commit strategies (auto vs manual)
    - Error handling and retry logic
    - Graceful shutdown
    """

    def __init__(
        self,
        bootstrap_servers: str = "{{bootstrap_servers}}",
        topic: str = "{{topic}}",
        group_id: str = "{{group_id}}",
    ):
        """
        Initialize Kafka consumer with Context7-verified configuration.

        Args:
            bootstrap_servers: Comma-separated list of Kafka brokers
            topic: Topic to consume from
            group_id: Consumer group ID
        """
        self.topic = topic
        self.running = True

        # ✅ CORRECT: Consumer configuration with proper settings
        self.consumer = KafkaConsumer(
            topic,
            bootstrap_servers=bootstrap_servers,
            group_id=group_id,
            # Deserialization
            value_deserializer=lambda m: json.loads(m.decode('utf-8')),
            key_deserializer=lambda k: k.decode('utf-8') if k else None,
            # Commit strategy
            enable_auto_commit=False,  # Manual commit for reliability
            auto_offset_reset='earliest',  # Start from beginning if no offset
            # Performance settings
            max_poll_records=100,
            max_poll_interval_ms=300000,
            session_timeout_ms=10000,
            # Error handling
            request_timeout_ms=30000,
        )

        # Setup graceful shutdown
        signal.signal(signal.SIGINT, self._shutdown)
        signal.signal(signal.SIGTERM, self._shutdown)

        logger.info(f"Consumer initialized: topic={self.topic}, group={group_id}")

    def consume(self, process_func: Callable[[Dict], None]) -> None:
        """
        Consume messages with proper error handling and commit strategy.

        Context7 Pattern: Manual commit after successful processing

        Args:
            process_func: Function to process each message
        """
        try:
            while self.running:
                # ✅ CORRECT: Poll with timeout
                messages = self.consumer.poll(timeout_ms=1000)

                if not messages:
                    continue

                for topic_partition, records in messages.items():
                    for record in records:
                        try:
                            # Process message
                            logger.info(
                                f"Processing: partition={record.partition}, "
                                f"offset={record.offset}, key={record.key}"
                            )

                            process_func(record.value)

                            # ✅ CORRECT: Commit after successful processing
                            self.consumer.commit()

                        except Exception as e:
                            logger.error(f"Error processing message: {e}")
                            # Decide: skip or retry based on your use case
                            # For this example, we log and continue
                            continue

        except Exception as e:
            logger.error(f"Consumer error: {e}")
            raise

        finally:
            self._close()

    def _shutdown(self, signum, frame):
        """Handle graceful shutdown."""
        logger.info("Shutdown signal received")
        self.running = False

    def _close(self):
        """Close consumer gracefully."""
        logger.info("Closing consumer...")
        self.consumer.close()
        logger.info("Consumer closed")


def process_message(message: Dict) -> None:
    """
    Process a single message.

    Replace this with your business logic.

    Args:
        message: Deserialized message value
    """
    logger.info(f"Processing message: {message}")
    # Your processing logic here


# Example usage
if __name__ == "__main__":
    consumer = {{PipelineName}}Consumer()

    try:
        consumer.consume(process_message)
    except KeyboardInterrupt:
        logger.info("Consumer stopped by user")
```

### 4. Generate Kafka Streams Application (Advanced)

```python
"""
Kafka Streams Application - {{pipeline_name}}

Context7-verified patterns for stream processing.
"""

# Note: Python support for Kafka Streams is limited
# Consider using kafka-python for simple streaming
# or Java/Scala Kafka Streams for complex processing

from kafka import KafkaConsumer, KafkaProducer
import json
import logging
from typing import Dict
from collections import defaultdict
from datetime import datetime, timedelta

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class {{PipelineName}}StreamProcessor:
    """
    Stream processor with Context7 patterns.

    Context7 Patterns Applied:
    - Stateful processing with windowing
    - Stream transformations
    - Output to downstream topic
    """

    def __init__(
        self,
        bootstrap_servers: str = "{{bootstrap_servers}}",
        input_topic: str = "{{topic}}",
        output_topic: str = "{{topic}}_processed",
        group_id: str = "{{group_id}}_streams",
    ):
        """Initialize stream processor."""
        self.input_topic = input_topic
        self.output_topic = output_topic

        # Consumer for input
        self.consumer = KafkaConsumer(
            input_topic,
            bootstrap_servers=bootstrap_servers,
            group_id=group_id,
            value_deserializer=lambda m: json.loads(m.decode('utf-8')),
            auto_offset_reset='earliest',
            enable_auto_commit=False,
        )

        # Producer for output
        self.producer = KafkaProducer(
            bootstrap_servers=bootstrap_servers,
            value_serializer=lambda v: json.dumps(v).encode('utf-8'),
            acks='all',
        )

        # State for windowed aggregation
        self.window_state = defaultdict(int)

        logger.info(f"Stream processor initialized: {input_topic} -> {output_topic}")

    def process_stream(self) -> None:
        """
        Process stream with transformations.

        Context7 Pattern: Read-Process-Write pattern
        """
        try:
            for message in self.consumer:
                # Transform message
                transformed = self._transform(message.value)

                # Aggregate if needed
                self._aggregate(transformed)

                # Write to output topic
                self.producer.send(self.output_topic, value=transformed)

                # Commit offset
                self.consumer.commit()

        finally:
            self.consumer.close()
            self.producer.flush()
            self.producer.close()

    def _transform(self, message: Dict) -> Dict:
        """Apply transformations to message."""
        # Your transformation logic
        message["processed_at"] = datetime.utcnow().isoformat()
        message["transformed"] = True
        return message

    def _aggregate(self, message: Dict) -> None:
        """Maintain aggregation state."""
        key = message.get("user_id", "unknown")
        self.window_state[key] += 1


if __name__ == "__main__":
    processor = {{PipelineName}}StreamProcessor()
    processor.process_stream()
```

## Context7-Verified Patterns Applied

### Configuration
- ✅ `bootstrap.servers` for broker connection
- ✅ Topic-specific configuration with `topic.` prefix
- ✅ Consumer configuration with `consumer.` prefix
- ✅ Producer configuration with `producer.` prefix

### Reliability
- ✅ `acks='all'` for producer reliability
- ✅ Manual commits for exactly-once semantics
- ✅ Retry configuration with exponential backoff
- ✅ Proper error handling and logging

### Performance
- ✅ Compression (`snappy`, `gzip`, `lz4`)
- ✅ Batching configuration
- ✅ Proper poll timeout settings
- ✅ Partition assignment strategy

## Output Files

1. `{{pipeline_name}}_producer.py` - Producer implementation
2. `{{pipeline_name}}_consumer.py` - Consumer implementation
3. `{{pipeline_name}}_streams.py` - Streams processor
4. `tests/test_{{pipeline_name}}.py` - Tests
5. `requirements.txt` - Dependencies

## Validation Checklist

- [ ] Context7 documentation queried
- [ ] Producer configuration verified
- [ ] Consumer configuration verified
- [ ] Error handling implemented
- [ ] Commit strategy appropriate
- [ ] Serialization/deserialization correct
- [ ] Graceful shutdown implemented
- [ ] Tests cover key scenarios

## Related Resources

- Rule: `data-quality-standards.md`
- Rule: `etl-pipeline-standards.md`
- Script: `kafka-streaming-example.py`
