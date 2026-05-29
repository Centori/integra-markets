# NewsAnalysisRequest


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**text** | **str** |  | 
**source** | **str** |  | [optional] 

## Example

```python
from integra_markets.models.news_analysis_request import NewsAnalysisRequest

# TODO update the JSON string below
json = "{}"
# create an instance of NewsAnalysisRequest from a JSON string
news_analysis_request_instance = NewsAnalysisRequest.from_json(json)
# print the JSON string representation of the object
print(NewsAnalysisRequest.to_json())

# convert the object into a dict
news_analysis_request_dict = news_analysis_request_instance.to_dict()
# create an instance of NewsAnalysisRequest from a dict
news_analysis_request_from_dict = NewsAnalysisRequest.from_dict(news_analysis_request_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


