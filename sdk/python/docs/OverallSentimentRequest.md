# OverallSentimentRequest


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**topic_text** | **str** | Market topic or question to score against recent headlines | 
**commodity** | **str** | Optional commodity override | [optional] 
**max_headlines** | **int** | Maximum recent headlines to include | [optional] [default to 20]
**refresh_if_empty** | **bool** | Fetch the latest feed if the recent-headlines cache is empty | [optional] [default to True]
**event_url** | **str** | Canonical Polymarket event URL for event-driven analysis | [optional] 
**event_slug** | **str** | Canonical Polymarket event slug | [optional] 

## Example

```python
from integra_markets.models.overall_sentiment_request import OverallSentimentRequest

# TODO update the JSON string below
json = "{}"
# create an instance of OverallSentimentRequest from a JSON string
overall_sentiment_request_instance = OverallSentimentRequest.from_json(json)
# print the JSON string representation of the object
print(OverallSentimentRequest.to_json())

# convert the object into a dict
overall_sentiment_request_dict = overall_sentiment_request_instance.to_dict()
# create an instance of OverallSentimentRequest from a dict
overall_sentiment_request_from_dict = OverallSentimentRequest.from_dict(overall_sentiment_request_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


