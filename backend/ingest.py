import asyncio
import os
import time

from config import DOCS_PATH
from feedback_db import clear_documents, init_db, save_document_info
from rag_engine import build_vector_store, load_and_chunk_documents


async def ingest() -> int:
    start_time = time.time()
    print("Starting CampusAI ingestion...")
    await init_db()
    await clear_documents()

    chunks = load_and_chunk_documents(DOCS_PATH)
    if not chunks:
        print("No documents found to index.")
        print("Total time: {:.2f}s".format(time.time() - start_time))
        return 0

    build_vector_store(chunks)

    doc_stats = {}
    for chunk in chunks:
        filename = chunk.metadata.get("source", "unknown")
        topic = chunk.metadata.get("topic", "general")
        filepath = chunk.metadata.get("filepath", "")

        if filename not in doc_stats:
            size_kb = 0.0
            if filepath and os.path.exists(filepath):
                size_kb = round(os.path.getsize(filepath) / 1024, 2)
            doc_stats[filename] = {
                "topic": topic,
                "chunk_count": 0,
                "file_size_kb": size_kb,
            }

        doc_stats[filename]["chunk_count"] += 1

    for filename, info in doc_stats.items():
        await save_document_info(
            filename=filename,
            topic=info["topic"],
            chunk_count=info["chunk_count"],
            file_size_kb=info["file_size_kb"],
        )
        print(
            f"  Indexed: {filename} | topic={info['topic']} | chunks={info['chunk_count']}"
        )

    duration = time.time() - start_time
    print(f"Ingestion complete: {len(chunks)} chunks in {duration:.2f}s")
    return len(chunks)


if __name__ == "__main__":
    asyncio.run(ingest())
