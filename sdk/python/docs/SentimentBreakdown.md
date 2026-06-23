# SentimentBreakdown


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**bullish** | **int** | Headlines classified bullish | [optional] [default to 0]
**bearish** | **int** | Headlines classified bearish | [optional] [default to 0]
**neutral** | **int** | Headlines classified neutral | [optional] [default to 0]

## Example

```python
from integra_markets.models.sentiment_breakdown import SentimentBreakdown

# TODO update the JSON string below
json = "{}"
# create an instance of SentimentBreakdown from a JSON string
sentiment_breakdown_instance = SentimentBreakdown.from_json(json)
# print the JSON string representation of the object
print(SentimentBreakdown.to_json())

# convert the object into a dict
sentiment_breakdown_dict = sentiment_breakdown_instance.to_dict()
# create an instance of SentimentBreakdown from a dict
sentiment_breakdown_from_dict = SentimentBreakdown.from_dict(sentiment_breakdown_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


