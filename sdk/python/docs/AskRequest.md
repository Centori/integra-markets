# AskRequest


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**question** | **str** | Free-form NL question. | [optional] 
**template** | **str** | Named template; one of interpret_today/trend_30d/divergence_check. | [optional] 
**variables** | **object** | Template variables (overrides defaults). | [optional] 
**commodity** | **str** | Convenience: same as variables.commodity. | [optional] 
**max_tool_calls** | **int** |  | [optional] [default to 6]

## Example

```python
from integra_markets.models.ask_request import AskRequest

# TODO update the JSON string below
json = "{}"
# create an instance of AskRequest from a JSON string
ask_request_instance = AskRequest.from_json(json)
# print the JSON string representation of the object
print(AskRequest.to_json())

# convert the object into a dict
ask_request_dict = ask_request_instance.to_dict()
# create an instance of AskRequest from a dict
ask_request_from_dict = AskRequest.from_dict(ask_request_dict)
```
[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)


