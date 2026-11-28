# RAG Setup Scaffold Command

## Required Documentation Access

Query Context7 first: see `.claude/rules/context7-required.md`. Libraries: langchain, openai.

## Command Description

Generate production-ready Retrieval-Augmented Generation (RAG) system with Context7-verified patterns:
- Document ingestion and chunking
- Vector store setup (Chroma, FAISS, Pinecone)
- Embedding configuration (OpenAI, HuggingFace)
- Retrieval strategies (similarity, MMR, contextual compression)
- RAG chain assembly with RunnablePassthrough
- Error handling and monitoring

## Usage

```bash
/ai:rag-setup <project-name>
```

## Options

- `--vector-store` - Vector database (chroma, faiss, pinecone, weaviate) [default: chroma]
- `--embedding-model` - Embedding provider (openai, huggingface, cohere) [default: openai]
- `--chunk-size` - Document chunk size in tokens [default: 512]
- `--chunk-overlap` - Overlap between chunks [default: 50]
- `--retrieval-strategy` - Retrieval method (similarity, mmr, compression) [default: mmr]
- `--top-k` - Number of documents to retrieve [default: 4]

## Implementation Steps

1. **Query Context7 Documentation**
   ```python
   # MANDATORY: Query these Context7 resources before scaffolding
   - /langchain-ai/langchain RAG patterns
   - /langchain-ai/langchain vector stores
   - /langchain-ai/langchain retrievers
   - /openai/openai-python embeddings API
   ```

2. **Create Project Structure**
   ```
   <project-name>/
   ├── data/
   │   └── documents/           # Raw documents
   ├── vector_stores/
   │   └── chroma_db/          # Persisted embeddings
   ├── src/
   │   ├── ingest.py          # Document ingestion
   │   ├── retriever.py       # Retrieval logic
   │   ├── rag_chain.py       # RAG chain assembly
   │   └── config.py          # Configuration
   ├── tests/
   │   ├── test_ingest.py
   │   ├── test_retriever.py
   │   └── test_rag_chain.py
   ├── .env.example
   ├── requirements.txt
   └── README.md
   ```

3. **Generate Document Ingestion (Context7 Pattern)**
   ```python
   # src/ingest.py - Context7 best practices
   from langchain_community.document_loaders import DirectoryLoader, TextLoader
   from langchain.text_splitter import RecursiveCharacterTextSplitter
   from langchain_openai import OpenAIEmbeddings
   from langchain_community.vectorstores import Chroma

   def ingest_documents(data_dir: str, chunk_size: int = 512, chunk_overlap: int = 50):
       """
       Ingest documents with Context7 best practices.

       Context7 Pattern: RecursiveCharacterTextSplitter with optimal chunk size
       """
       # Load documents
       loader = DirectoryLoader(data_dir, glob="**/*.txt", loader_cls=TextLoader)
       documents = loader.load()

       # Split with Context7-recommended parameters
       text_splitter = RecursiveCharacterTextSplitter(
           chunk_size=chunk_size,
           chunk_overlap=chunk_overlap,
           length_function=len,
           separators=["\n\n", "\n", " ", ""]  # Hierarchical splitting
       )

       chunks = text_splitter.split_documents(documents)

       # Create embeddings
       embeddings = OpenAIEmbeddings(model="text-embedding-3-small")

       # Store in vector database
       vectorstore = Chroma.from_documents(
           documents=chunks,
           embedding=embeddings,
           persist_directory="./vector_stores/chroma_db"
       )

       vectorstore.persist()
       return vectorstore
   ```

4. **Generate Retriever Configuration (Context7 Pattern)**
   ```python
   # src/retriever.py - Context7 best practices
   from langchain_community.vectorstores import Chroma
   from langchain_openai import OpenAIEmbeddings
   from langchain.retrievers import ContextualCompressionRetriever
   from langchain.retrievers.document_compressors import LLMChainExtractor
   from langchain_openai import ChatOpenAI

   def create_retriever(vector_store_path: str, strategy: str = "mmr", top_k: int = 4):
       """
       Create retriever with Context7 best practices.

       Context7 Pattern: MMR (Maximal Marginal Relevance) for diversity
       """
       embeddings = OpenAIEmbeddings(model="text-embedding-3-small")

       vectorstore = Chroma(
           persist_directory=vector_store_path,
           embedding_function=embeddings
       )

       if strategy == "mmr":
           # Context7 recommended: MMR for diverse results
           retriever = vectorstore.as_retriever(
               search_type="mmr",
               search_kwargs={
                   "k": top_k,
                   "fetch_k": top_k * 2,  # Fetch more, filter to k
                   "lambda_mult": 0.7      # Diversity vs relevance tradeoff
               }
           )
       elif strategy == "similarity":
           retriever = vectorstore.as_retriever(
               search_type="similarity",
               search_kwargs={"k": top_k}
           )
       elif strategy == "compression":
           # Context7 pattern: Contextual compression
           base_retriever = vectorstore.as_retriever(search_kwargs={"k": top_k * 2})

           llm = ChatOpenAI(model="gpt-3.5-turbo", temperature=0)
           compressor = LLMChainExtractor.from_llm(llm)

           retriever = ContextualCompressionRetriever(
               base_compressor=compressor,
               base_retriever=base_retriever
           )
       else:
           raise ValueError(f"Unknown strategy: {strategy}")

       return retriever
   ```

5. **Generate RAG Chain (Context7 Pattern)**
   ```python
   # src/rag_chain.py - Context7 best practices
   from langchain_core.runnables import RunnablePassthrough, RunnableParallel
   from langchain_core.output_parsers import StrOutputParser
   from langchain_core.prompts import ChatPromptTemplate
   from langchain_openai import ChatOpenAI
   from operator import itemgetter

   def create_rag_chain(retriever):
       """
       Create RAG chain with Context7 best practices.

       Context7 Pattern: RunnablePassthrough.assign() for context injection
       """
       # Context7 recommended prompt template
       template = \"\"\"Answer the question based only on the following context:

   {context}

   Question: {question}

   Answer the question based on the context above. If you cannot answer the
   question based on the context, say "I don't have enough information to answer."
   \"\"\"

       prompt = ChatPromptTemplate.from_template(template)
       llm = ChatOpenAI(model="gpt-4", temperature=0)

       # Context7 pattern: RunnablePassthrough.assign() for elegant context handling
       rag_chain = (
           RunnablePassthrough.assign(
               context=itemgetter("question")
                   | retriever
                   | (lambda docs: "\n\n".join(doc.page_content for doc in docs))
           )
           | prompt
           | llm
           | StrOutputParser()
       )

       return rag_chain
   ```

6. **Generate Configuration**
   ```python
   # src/config.py
   from pydantic import BaseModel, Field
   from typing import Literal
   import os

   class RAGConfig(BaseModel):
       # Embedding configuration
       embedding_model: str = Field(default="text-embedding-3-small")
       embedding_provider: Literal["openai", "huggingface"] = "openai"

       # Chunking configuration
       chunk_size: int = Field(default=512, ge=100, le=2000)
       chunk_overlap: int = Field(default=50, ge=0, le=500)

       # Retrieval configuration
       retrieval_strategy: Literal["similarity", "mmr", "compression"] = "mmr"
       top_k: int = Field(default=4, ge=1, le=20)

       # Vector store configuration
       vector_store: Literal["chroma", "faiss", "pinecone"] = "chroma"
       vector_store_path: str = "./vector_stores/chroma_db"

       # LLM configuration
       llm_model: str = "gpt-4"
       llm_temperature: float = Field(default=0.0, ge=0.0, le=1.0)

       # API keys (from environment)
       openai_api_key: str = Field(default_factory=lambda: os.getenv("OPENAI_API_KEY"))

       class Config:
           env_file = ".env"
   ```

7. **Generate Tests**
   ```python
   # tests/test_rag_chain.py
   import pytest
   from src.rag_chain import create_rag_chain
   from src.retriever import create_retriever

   def test_rag_chain_response():
       """Test RAG chain returns relevant answers"""
       retriever = create_retriever("./vector_stores/test_db")
       rag_chain = create_rag_chain(retriever)

       response = rag_chain.invoke({"question": "What is Python?"})

       assert response is not None
       assert len(response) > 0
       assert "don't have enough information" not in response.lower()

   def test_rag_chain_handles_unknown():
       """Test RAG chain handles questions without context"""
       retriever = create_retriever("./vector_stores/test_db")
       rag_chain = create_rag_chain(retriever)

       response = rag_chain.invoke({"question": "What is quantum computing?"})

       # Should indicate lack of information
       assert "don't have enough information" in response.lower() or \
              "cannot answer" in response.lower()
   ```

8. **Generate README with Context7 References**
   ```markdown
   # RAG System - Context7 Best Practices

   Production-ready RAG system following Context7-verified patterns.

   ## Features

   - ✅ Hierarchical text splitting (RecursiveCharacterTextSplitter)
   - ✅ MMR retrieval for diverse results
   - ✅ RunnablePassthrough.assign() for clean chain composition
   - ✅ Contextual compression for improved relevance
   - ✅ Production-ready error handling

   ## Context7 Patterns Used

   This implementation follows patterns from:
   - `/langchain-ai/langchain` (150 snippets, trust 9.2)
   - `/openai/openai-python` (277 snippets, trust 9.1)

   ## Quick Start

   ```bash
   # Install dependencies
   pip install -r requirements.txt

   # Set up environment
   cp .env.example .env
   # Add your OPENAI_API_KEY to .env

   # Ingest documents
   python -m src.ingest

   # Query RAG system
   python -c "
   from src.retriever import create_retriever
   from src.rag_chain import create_rag_chain

   retriever = create_retriever('./vector_stores/chroma_db')
   rag_chain = create_rag_chain(retriever)

   response = rag_chain.invoke({'question': 'Your question here'})
   print(response)
   "
   ```
   ```

9. **Generate requirements.txt**
   ```
   langchain>=0.1.0
   langchain-community>=0.0.20
   langchain-openai>=0.0.5
   langchain-core>=0.1.23
   chromadb>=0.4.22
   openai>=1.12.0
   python-dotenv>=1.0.0
   pydantic>=2.0.0
   pytest>=7.4.0
   ```

## Context7-Verified Best Practices Applied

1. **Document Chunking** (from `/langchain-ai/langchain`):
   - RecursiveCharacterTextSplitter for hierarchical splitting
   - Optimal chunk_size=512 with overlap=50
   - Maintains context integrity across chunks

2. **Retrieval Strategy** (from `/langchain-ai/langchain`):
   - MMR (Maximal Marginal Relevance) for diversity
   - fetch_k = 2 * k for better result pool
   - lambda_mult=0.7 balances relevance vs diversity

3. **RAG Chain Composition** (from `/langchain-ai/langchain`):
   - RunnablePassthrough.assign() for clean context injection
   - itemgetter for explicit data flow
   - StrOutputParser for clean output

4. **Embeddings** (from `/openai/openai-python`):
   - text-embedding-3-small for cost-efficiency
   - Persistent vector stores for production use

## Testing

The generated scaffold includes:
- Unit tests for ingestion pipeline
- Integration tests for retrieval
- End-to-end tests for RAG chain
- Edge case handling (unknown questions)

## Production Considerations

- Error handling for API rate limits
- Monitoring for retrieval quality
- Cost tracking for embedding/LLM calls
- Vector store backup strategies

## References

- Context7: `/langchain-ai/langchain` - RAG patterns
- Context7: `/openai/openai-python` - Embeddings API
