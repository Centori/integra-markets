# AIAnalysisRequest


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**query** | **str** | Query for AI analysis | 
**commodity** | **str** | Specific commodity context | [optional] 
**use_tools** | **bool** | Enable tool use | [optional] [default to True]
**search_web** | **bool** | Enable web search | [optional] [default to True]

## Example

```python
from integra_markets.models.ai_analysis_request import AIAnalysisRequest

# TODO update the JSON string below
json = "{}"
# create an instance of AIAnalysisRequest from a JSON string
ai_analysis_request_instance = AIAnalysisRequest.from_json(json)
# print the JSON string representation of the object
print(AIAnalysisRequest.to_json())

# convert the object into a dict
ai_analysis_request_dict = ai_analysis_request_instance.to_dict()
# create an instance of AIAnalysisRequest from a dict
ai_analysis_request_from_dict = AIAnalysisRequest.from_dict(ai_analysis_request_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


