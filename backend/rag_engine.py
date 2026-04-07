import os
from datetime import datetime
from typing import List, Tuple

from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.document_loaders import Docx2txtLoader, PyPDFLoader, TextLoader
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_community.vectorstores import Chroma
from langchain_core.documents import Document

from config import (
    CHROMA_PERSIST_PATH,
    CHUNK_OVERLAP,
    CHUNK_SIZE,
    EMBEDDING_MODEL,
    FETCH_K,
    LAMBDA_MULT,
    TOP_K_RETRIEVAL,
    TOPIC_MAP,
)
from models import SourceDoc


def get_topic_from_filename(filename: str) -> str:
    fname = filename.lower()
    for keyword, topic in TOPIC_MAP.items():
        if keyword in fname:
            return topic
    return "general"


def load_and_chunk_documents(docs_path: str) -> List[Document]:
    chunks: List[Document] = []
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=CHUNK_SIZE,
        chunk_overlap=CHUNK_OVERLAP,
        separators=["\n\n", "\n", ".", "!", "?", ",", " ", ""],
    )

    for root, _, files in os.walk(docs_path):
        for filename in files:
            filepath = os.path.join(root, filename)
            docs: List[Document] = []

            try:
                if filename.endswith(".pdf"):
                    loader = PyPDFLoader(filepath)
                    docs = loader.load()
                elif filename.endswith(".txt"):
                    loader = TextLoader(filepath, encoding="utf-8")
                    docs = loader.load()
                elif filename.endswith(".docx"):
                    loader = Docx2txtLoader(filepath)
                    docs = loader.load()
                else:
                    continue

                topic = get_topic_from_filename(filename)

                for doc in docs:
                    doc.metadata.update(
                        {
                            "source": filename,
                            "topic": topic,
                            "filepath": filepath,
                            "indexed_at": datetime.now().isoformat(),
                        }
                    )

                file_chunks = splitter.split_documents(docs)
                chunks.extend(file_chunks)
                print(f"  Loaded: {filename} ({len(file_chunks)} chunks, topic={topic})")

            except Exception as e:
                print(f"  Failed: {filename} - {e}")

    return chunks


def build_vector_store(chunks: List[Document]):
    embeddings = HuggingFaceEmbeddings(
        model_name=EMBEDDING_MODEL,
        model_kwargs={"device": "cpu"},
        encode_kwargs={"normalize_embeddings": True},
    )
    vectorstore = Chroma.from_documents(
        documents=chunks,
        embedding=embeddings,
        persist_directory=CHROMA_PERSIST_PATH,
    )
    vectorstore.persist()
    print(f"Vectorstore built: {len(chunks)} chunks indexed")
    return vectorstore


def load_vector_store():
    if not os.path.exists(CHROMA_PERSIST_PATH):
        raise RuntimeError("Vectorstore not found. Run: python ingest.py")

    embeddings = HuggingFaceEmbeddings(
        model_name=EMBEDDING_MODEL,
        model_kwargs={"device": "cpu"},
        encode_kwargs={"normalize_embeddings": True},
    )
    vectorstore = Chroma(
        persist_directory=CHROMA_PERSIST_PATH,
        embedding_function=embeddings,
    )
    return vectorstore


def get_retriever(vectorstore, module: str = None):
    search_kwargs = {
        "k": TOP_K_RETRIEVAL,
        "fetch_k": FETCH_K,
        "lambda_mult": LAMBDA_MULT,
    }
    if module and module != "all":
        search_kwargs["filter"] = {"topic": module}

    return vectorstore.as_retriever(search_type="mmr", search_kwargs=search_kwargs)


def extract_keywords(question: str) -> str:
    stop_words = {
        "what",
        "is",
        "are",
        "the",
        "how",
        "much",
        "do",
        "i",
        "can",
        "tell",
        "me",
        "about",
        "for",
        "a",
        "an",
        "to",
        "does",
        "will",
        "should",
        "please",
        "give",
        "of",
        "my",
        "in",
        "on",
        "at",
        "when",
        "where",
        "who",
        "which",
        "that",
        "this",
        "with",
        "from",
        "have",
        "has",
        "had",
        "been",
        "was",
    }
    words = question.lower().split()
    keywords = [w for w in words if w not in stop_words and len(w) > 3]
    return " ".join(keywords) if keywords else question


async def retrieve_with_fallback(
    query: str,
    vectorstore,
    module: str = None,
) -> Tuple[List[Document], float]:
    retriever = get_retriever(vectorstore, module)

    docs = retriever.invoke(query)

    if len(docs) < 3:
        simplified = extract_keywords(query)
        if simplified != query and len(simplified) > 3:
            fallback_retriever = get_retriever(vectorstore, None)
            fallback_docs = fallback_retriever.invoke(simplified)
            seen = {d.page_content for d in docs}
            for d in fallback_docs:
                if d.page_content not in seen:
                    docs.append(d)
                    seen.add(d.page_content)

    if len(docs) < 2 and module:
        global_retriever = get_retriever(vectorstore, None)
        global_docs = global_retriever.invoke(query)
        seen = {d.page_content for d in docs}
        for d in global_docs:
            if d.page_content not in seen:
                docs.append(d)
                seen.add(d.page_content)

    confidence = min(len(docs) / TOP_K_RETRIEVAL, 1.0)
    return docs[:TOP_K_RETRIEVAL], confidence


def format_sources(docs: List[Document]) -> List[SourceDoc]:
    sources: List[SourceDoc] = []
    for i, doc in enumerate(docs[:4]):
        sources.append(
            SourceDoc(
                filename=doc.metadata.get("source", "vignan_docs"),
                page=doc.metadata.get("page", 0),
                snippet=doc.page_content[:200].strip(),
                topic=doc.metadata.get("topic", "general"),
                confidence=round(1.0 - (i * 0.1), 2),
            )
        )
    return sources
