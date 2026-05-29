# ComprehensiveAnalysisRequest


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**text** | **str** | Text to analyze | 
**commodity** | **str** | Specific commodity context | [optional] 
**include_preprocessing** | **bool** | Include preprocessing with trigger keywords | [optional] [default to True]
**include_finbert** | **bool** | Include FinBERT sentiment analysis | [optional] [default to True]

## Example

```python
from integra_markets.models.comprehensive_analysis_request import ComprehensiveAnalysisRequest

# TODO update the JSON string below
json = "{}"
# create an instance of ComprehensiveAnalysisRequest from a JSON string
comprehensive_analysis_request_instance = ComprehensiveAnalysisRequest.from_json(json)
# print the JSON string representation of the object
print(ComprehensiveAnalysisRequest.to_json())

# convert the object into a dict
comprehensive_analysis_request_dict = comprehensive_analysis_request_instance.to_dict()
# create an instance of ComprehensiveAnalysisRequest from a dict
comprehensive_analysis_request_from_dict = ComprehensiveAnalysisRequest.from_dict(comprehensive_analysis_request_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


