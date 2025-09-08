# Source Attribution System Documentation

## Overview
The source attribution system in Integra Markets provides transparent citation of news sources and data providers used in AI-generated analysis. This ensures users can verify information and understand where insights are derived from.

## Architecture

### Backend Components

#### 1. NewsDataSources (`app/services/data_sources.py`)
- **Purpose**: Fetches real-time news from multiple RSS feeds
- **Sources**: 
  - Reuters Business News
  - Yahoo Finance
  - U.S. Energy Information Administration (EIA)
  - International Energy Agency (IEA)
  - Bloomberg Markets
  - S&P Global Platts
  - Additional commodity-specific sources

```python
# Example usage
async with NewsDataSources() as sources:
    articles = await sources.fetch_all_sources()
```

#### 2. Groq AI Service (`backend/groq_ai_service.py`)
- **Enhanced with source tracking**: 
  - Integrates NewsDataSources for real news data
  - Tracks all sources used in analysis
  - Returns source attribution with responses

```python
# Example with source attribution
result = await service.analyze_with_reasoning(
    query="What are oil market trends?",
    commodity="oil",
    include_sources=True  # Enable source attribution
)

# Response includes:
{
    "analysis": {...},
    "sources": [
        {"name": "Reuters", "type": "news"},
        {"name": "EIA", "type": "news"},
        {"name": "Yahoo Finance", "type": "news"}
    ]
}
```

### Frontend Components

#### 1. SourceTag Component (`app/components/ui/SourceTag.tsx`)
- Displays individual source citations
- Visual differentiation by source type (news, data, analysis)

#### 2. StructuredAnalysis Component  
- Renders complete analysis with embedded source citations
- Integrates SourceTag components automatically

## Data Flow

1. **User Query** → Frontend sends analysis request
2. **Backend Processing**:
   - Groq AI Service receives request
   - Fetches relevant news from NewsDataSources
   - Performs analysis with source tracking
   - Returns analysis + source citations
3. **Frontend Display**:
   - StructuredAnalysis component renders analysis
   - SourceTag components display citations
   - Users see attributed information

## Source Types

| Source | Type | Description |
|--------|------|-------------|
| Reuters | News | Business and commodity news |
| Yahoo Finance | News | Financial market updates |
| EIA | Data | Energy statistics and reports |
| IEA | Policy | Energy policy and analysis |
| Bloomberg | News | Market news and analysis |
| S&P Global | Data | Commodity pricing data |
| Web Search | Web | Supplementary web results |

## API Response Format

### Analysis with Sources
```json
{
  "query": "oil market analysis",
  "analysis": {
    "commodity": "oil",
    "sentiment": "bullish",
    "confidence": 0.75,
    "key_factors": ["supply cuts", "demand growth"],
    "data_sources": ["Reuters", "EIA", "IEA"]
  },
  "sources": [
    {
      "name": "Reuters",
      "type": "news",
      "timestamp": "2024-01-09T10:00:00Z"
    },
    {
      "name": "U.S. EIA",
      "type": "data",
      "timestamp": "2024-01-09T10:00:00Z"
    }
  ],
  "tool_results": [
    {
      "articles": [
        {
          "title": "Oil prices rise on supply concerns",
          "source": "Reuters",
          "url": "https://reuters.com/...",
          "published": "2024-01-09T09:30:00Z"
        }
      ]
    }
  ]
}
```

## Implementation Details

### Backend Integration Points

1. **groq_ai_service.py modifications**:
   - Added `include_sources` parameter to analysis methods
   - Integrated NewsDataSources for real news fetching
   - Track sources throughout analysis pipeline
   - Format sources for frontend consumption

2. **Key Methods**:
   ```python
   async def analyze_with_reasoning(
       self,
       query: str,
       commodity: Optional[str] = None,
       include_sources: bool = True  # New parameter
   ) -> Dict[str, Any]
   
   async def _search_commodity_news(
       self, 
       commodity: str, 
       timeframe: str = "week"
   ) -> Dict[str, Any]
   ```

### Frontend Integration Points

1. **Display Components**:
   - SourceTag: Individual source citation
   - StructuredAnalysis: Complete analysis with sources
   
2. **Data Handling**:
   ```typescript
   interface AnalysisResponse {
     analysis: CommodityAnalysis;
     sources: Source[];
     timestamp: string;
   }
   
   interface Source {
     name: string;
     type: 'news' | 'data' | 'web';
     timestamp?: string;
   }
   ```

## Testing

Run the integration test:
```bash
cd /Users/lm/Desktop/integra/integra-markets
python backend/test_source_integration.py
```

This will verify:
1. NewsDataSources fetching
2. Source attribution in analysis
3. Proper source formatting
4. Frontend-ready data structure

## Environment Requirements

```bash
# Required packages
pip install groq
pip install aiohttp
pip install feedparser
pip install beautifulsoup4
pip install duckduckgo-search  # Optional for web search

# Environment variable
export GROQ_API_KEY="your-api-key"
```

## Benefits

1. **Transparency**: Users see where information comes from
2. **Credibility**: Analysis backed by reputable sources
3. **Verification**: Users can check original sources
4. **Compliance**: Proper attribution for content usage
5. **Trust**: Builds user confidence in AI analysis

## Future Enhancements

1. **Source Ranking**: Prioritize most reliable sources
2. **Source Filtering**: Allow users to select preferred sources
3. **Citation Styles**: Support different citation formats
4. **Source Validation**: Verify source availability and freshness
5. **Custom Sources**: Allow users to add their own RSS feeds

## Troubleshooting

### Common Issues

1. **No sources appearing**:
   - Check NewsDataSources is properly imported
   - Verify RSS feeds are accessible
   - Ensure `include_sources=True` in API calls

2. **Import errors**:
   - Verify path configuration in groq_ai_service.py
   - Check all required packages are installed

3. **Empty news results**:
   - RSS feeds may be temporarily unavailable
   - Check network connectivity
   - Verify commodity keywords match feed content

## Contact

For questions or issues with the source attribution system, please refer to the main project documentation or contact the development team.
