# DashboardSentimentEngineRequest


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**commodities** | **List[str]** | Tracked commodities to include in the dashboard snapshot | [optional] 
**max_headlines** | **int** | Maximum headlines per commodity snapshot | [optional] [default to 15]
**refresh_if_empty** | **bool** | Fetch headlines if the dashboard cache is empty | [optional] [default to True]

## Example

```python
from integra_markets.models.dashboard_sentiment_engine_request import DashboardSentimentEngineRequest

# TODO update the JSON string below
json = "{}"
# create an instance of DashboardSentimentEngineRequest from a JSON string
dashboard_sentiment_engine_request_instance = DashboardSentimentEngineRequest.from_json(json)
# print the JSON string representation of the object
print(DashboardSentimentEngineRequest.to_json())

# convert the object into a dict
dashboard_sentiment_engine_request_dict = dashboard_sentiment_engine_request_instance.to_dict()
# create an instance of DashboardSentimentEngineRequest from a dict
dashboard_sentiment_engine_request_from_dict = DashboardSentimentEngineRequest.from_dict(dashboard_sentiment_engine_request_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


