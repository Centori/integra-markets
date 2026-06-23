# SentimentRequest


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**text** | **str** | Text to analyze | 
**commodity** | **str** | Specific commodity context | [optional] 
**enhanced** | **bool** | Use enhanced analysis | [optional] [default to True]

## Example

```python
from integra_markets.models.sentiment_request import SentimentRequest

# TODO update the JSON string below
json = "{}"
# create an instance of SentimentRequest from a JSON string
sentiment_request_instance = SentimentRequest.from_json(json)
# print the JSON string representation of the object
print(SentimentRequest.to_json())

# convert the object into a dict
sentiment_request_dict = sentiment_request_instance.to_dict()
# create an instance of SentimentRequest from a dict
sentiment_request_from_dict = SentimentRequest.from_dict(sentiment_request_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


