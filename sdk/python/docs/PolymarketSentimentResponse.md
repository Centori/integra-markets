# PolymarketSentimentResponse


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**topic_text** | **str** | Echo of the original request topic | 
**primary_target** | **str** | Canonical asset key (internal) | [optional] 
**commodity** | **str** | Commodity key, alias of primary_target | [optional] 
**display_name** | **str** | Title-cased commodity name for UI | [optional] 
**target_assets** | **List[str]** | All inferred asset symbols (uppercase) | [optional] 
**overall_sentiment** | **str** | One of BULLISH, BEARISH, NEUTRAL | 
**confidence** | **float** | Confidence in the overall classification | 
**headline_count** | **int** | Number of relevant headlines used | [optional] [default to 0]
**summary** | **str** | Human-readable aggregate summary | 
**sentiment_breakdown** | [**SentimentBreakdown**](SentimentBreakdown.md) |  | [optional] 
**sample_headlines** | **List[str]** | Up to 5 representative headlines | [optional] 
**matched_signals** | **List[str]** | Up to 5 keyword features driving the score | [optional] 
**method** | **str** | Identifier of the analyzer used | [optional] [default to 'recent_headlines_cache']
**event_url** | **str** | Canonical Polymarket event URL | [optional] 
**event_slug** | **str** | Canonical Polymarket event slug | [optional] 
**source_url** | **str** | Canonical source URL (mirrors event_url) | [optional] 
**cache_timestamp** | **str** | ISO timestamp of the headline cache snapshot | [optional] 
**connector_context** | [**PolymarketConnectorContext**](PolymarketConnectorContext.md) | Connector / auth provenance for this response | [optional] 

## Example

```python
from integra_markets.models.polymarket_sentiment_response import PolymarketSentimentResponse

# TODO update the JSON string below
json = "{}"
# create an instance of PolymarketSentimentResponse from a JSON string
polymarket_sentiment_response_instance = PolymarketSentimentResponse.from_json(json)
# print the JSON string representation of the object
print(PolymarketSentimentResponse.to_json())

# convert the object into a dict
polymarket_sentiment_response_dict = polymarket_sentiment_response_instance.to_dict()
# create an instance of PolymarketSentimentResponse from a dict
polymarket_sentiment_response_from_dict = PolymarketSentimentResponse.from_dict(polymarket_sentiment_response_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


