# AskResponse


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**answer** | **str** |  | 
**sources** | **List[object]** |  | 
**tool_calls** | **List[object]** |  | 
**model** | **str** |  | 
**template_used** | **str** |  | [optional] 

## Example

```python
from integra_markets.models.ask_response import AskResponse

# TODO update the JSON string below
json = "{}"
# create an instance of AskResponse from a JSON string
ask_response_instance = AskResponse.from_json(json)
# print the JSON string representation of the object
print(AskResponse.to_json())

# convert the object into a dict
ask_response_dict = ask_response_instance.to_dict()
# create an instance of AskResponse from a dict
ask_response_from_dict = AskResponse.from_dict(ask_response_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


