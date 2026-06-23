# PolymarketSentimentRequest


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**topic_text** | **str** | Market topic or question to score | 
**user_id** | **str** | Optional owning user ID when resolving a saved connector | [optional] 
**connector_id** | **str** | Optional saved Polymarket connector ID | [optional] 
**event_url** | **str** | Canonical Polymarket event URL | [optional] 
**event_slug** | **str** | Canonical Polymarket event slug | [optional] 
**max_headlines** | **int** | Maximum headlines to include | [optional] [default to 20]
**refresh_if_empty** | **bool** | Fetch headlines if cache is empty | [optional] [default to True]
**credentials** | [**ConnectorCredentialRequest**](ConnectorCredentialRequest.md) | Optional one-off BYO credential without saving | [optional] 

## Example

```python
from integra_markets.models.polymarket_sentiment_request import PolymarketSentimentRequest

# TODO update the JSON string below
json = "{}"
# create an instance of PolymarketSentimentRequest from a JSON string
polymarket_sentiment_request_instance = PolymarketSentimentRequest.from_json(json)
# print the JSON string representation of the object
print(PolymarketSentimentRequest.to_json())

# convert the object into a dict
polymarket_sentiment_request_dict = polymarket_sentiment_request_instance.to_dict()
# create an instance of PolymarketSentimentRequest from a dict
polymarket_sentiment_request_from_dict = PolymarketSentimentRequest.from_dict(polymarket_sentiment_request_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


